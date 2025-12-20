#!/bin/bash
# Performance Benchmarking Script for Local AI Stack
# Measures LLM inference speeds and image generation times

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_result() {
    echo -e "${GREEN}✓${NC} $1: ${YELLOW}$2${NC}"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Ollama is running
check_ollama() {
    curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1
}

# Check if ComfyUI is running
check_comfyui() {
    curl -s http://127.0.0.1:8188/system_stats > /dev/null 2>&1
}

# Benchmark Ollama model
benchmark_llm() {
    local model="$1"
    local prompt="Explain quantum computing in exactly 100 words."

    echo -e "Testing ${YELLOW}$model${NC}..."

    # Run generation and capture timing
    local start=$(date +%s.%N)

    local response=$(curl -s http://127.0.0.1:11434/api/generate -d "{
        \"model\": \"$model\",
        \"prompt\": \"$prompt\",
        \"stream\": false
    }" 2>/dev/null)

    local end=$(date +%s.%N)

    if [ -z "$response" ]; then
        print_error "Failed to get response from $model"
        return
    fi

    # Extract metrics
    local total_duration=$(echo "$response" | jq -r '.total_duration // 0')
    local eval_count=$(echo "$response" | jq -r '.eval_count // 0')
    local eval_duration=$(echo "$response" | jq -r '.eval_duration // 0')
    local prompt_eval_count=$(echo "$response" | jq -r '.prompt_eval_count // 0')
    local load_duration=$(echo "$response" | jq -r '.load_duration // 0')

    # Calculate tokens per second (eval_duration is in nanoseconds)
    if [ "$eval_duration" -gt 0 ]; then
        local tokens_per_sec=$(echo "scale=2; $eval_count / ($eval_duration / 1000000000)" | bc)
    else
        local tokens_per_sec="N/A"
    fi

    # Convert durations to seconds
    local total_sec=$(echo "scale=2; $total_duration / 1000000000" | bc)
    local load_sec=$(echo "scale=2; $load_duration / 1000000000" | bc)

    print_result "Tokens generated" "$eval_count"
    print_result "Tokens/second" "$tokens_per_sec"
    print_result "Total time" "${total_sec}s"
    print_result "Model load time" "${load_sec}s"
    echo ""
}

# Benchmark ComfyUI image generation
benchmark_image() {
    local steps="${1:-20}"
    local width="${2:-1024}"
    local height="${3:-1024}"

    echo -e "Testing image generation: ${YELLOW}${width}x${height}, ${steps} steps${NC}..."

    # Build workflow
    local workflow=$(cat <<EOF
{
    "1": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}
    },
    "2": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["1", 1], "text": "a beautiful mountain landscape at sunset, photorealistic"}
    },
    "3": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["1", 1], "text": "blurry, low quality"}
    },
    "4": {
        "class_type": "EmptyLatentImage",
        "inputs": {"width": $width, "height": $height, "batch_size": 1}
    },
    "5": {
        "class_type": "KSampler",
        "inputs": {
            "model": ["1", 0],
            "positive": ["2", 0],
            "negative": ["3", 0],
            "latent_image": ["4", 0],
            "seed": 42,
            "steps": $steps,
            "cfg": 7.5,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1
        }
    },
    "6": {
        "class_type": "VAEDecode",
        "inputs": {"samples": ["5", 0], "vae": ["1", 2]}
    },
    "7": {
        "class_type": "SaveImage",
        "inputs": {"images": ["6", 0], "filename_prefix": "benchmark"}
    }
}
EOF
)

    local start=$(date +%s.%N)

    # Queue the prompt
    local queue_response=$(curl -s -X POST http://127.0.0.1:8188/prompt \
        -H "Content-Type: application/json" \
        -d "{\"prompt\": $workflow}" 2>/dev/null)

    local prompt_id=$(echo "$queue_response" | jq -r '.prompt_id')

    if [ -z "$prompt_id" ] || [ "$prompt_id" = "null" ]; then
        print_error "Failed to queue prompt"
        return
    fi

    # Poll for completion
    local max_attempts=120
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        sleep 1
        local history=$(curl -s "http://127.0.0.1:8188/history/$prompt_id" 2>/dev/null)

        if echo "$history" | jq -e ".[\"$prompt_id\"].outputs" > /dev/null 2>&1; then
            local end=$(date +%s.%N)
            local duration=$(echo "scale=2; $end - $start" | bc)
            local time_per_step=$(echo "scale=2; $duration / $steps" | bc)

            print_result "Total time" "${duration}s"
            print_result "Time per step" "${time_per_step}s"
            return
        fi

        attempt=$((attempt + 1))
    done

    print_error "Generation timed out"
}

# Get system info
system_info() {
    print_header "System Information"

    echo -e "Platform: $(uname -s) $(uname -m)"
    echo -e "CPU Cores: $(sysctl -n hw.ncpu)"

    # Memory (macOS)
    local total_mem=$(sysctl -n hw.memsize)
    local total_gb=$(echo "scale=1; $total_mem / 1024 / 1024 / 1024" | bc)
    echo -e "Total Memory: ${total_gb} GB"

    # Get memory usage
    local vm_stat=$(vm_stat)
    local page_size=$(sysctl -n hw.pagesize)
    local pages_free=$(echo "$vm_stat" | grep "Pages free" | awk '{print $3}' | tr -d '.')
    local pages_active=$(echo "$vm_stat" | grep "Pages active" | awk '{print $3}' | tr -d '.')
    local pages_wired=$(echo "$vm_stat" | grep "Pages wired" | awk '{print $4}' | tr -d '.')

    local used_mem=$(echo "scale=1; ($pages_active + $pages_wired) * $page_size / 1024 / 1024 / 1024" | bc)
    echo -e "Used Memory: ${used_mem} GB"
}

# Main benchmark routine
main() {
    print_header "Local AI Stack Benchmark"

    system_info

    # Check services
    print_header "Service Status"

    if check_ollama; then
        echo -e "${GREEN}✓${NC} Ollama is running"
    else
        echo -e "${RED}✗${NC} Ollama is not running"
        echo "Start it with: brew services start ollama"
    fi

    if check_comfyui; then
        echo -e "${GREEN}✓${NC} ComfyUI is running"
    else
        echo -e "${RED}✗${NC} ComfyUI is not running"
        echo "Start it with: ./scripts/ai-stack start comfyui"
    fi

    # Benchmark LLM models
    if check_ollama; then
        print_header "LLM Benchmarks"

        # Get list of installed models
        local models=$(curl -s http://127.0.0.1:11434/api/tags | jq -r '.models[].name')

        for model in $models; do
            benchmark_llm "$model"
        done
    fi

    # Benchmark image generation
    if check_comfyui; then
        print_header "Image Generation Benchmarks"

        # Test different configurations
        benchmark_image 20 1024 1024
        benchmark_image 20 768 768
    fi

    print_header "Benchmark Complete"
}

# Run specific benchmark if argument provided
case "${1:-all}" in
    llm)
        if check_ollama; then
            print_header "LLM Benchmarks"
            if [ -n "$2" ]; then
                benchmark_llm "$2"
            else
                models=$(curl -s http://127.0.0.1:11434/api/tags | jq -r '.models[].name')
                for model in $models; do
                    benchmark_llm "$model"
                done
            fi
        else
            print_error "Ollama is not running"
        fi
        ;;
    image)
        if check_comfyui; then
            print_header "Image Generation Benchmarks"
            benchmark_image "${2:-20}" "${3:-1024}" "${4:-1024}"
        else
            print_error "ComfyUI is not running"
        fi
        ;;
    *)
        main
        ;;
esac
