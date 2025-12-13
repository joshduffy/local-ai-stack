# Local AI Stack for Apple Silicon

> Complete local AI infrastructure running entirely on M2 MacBook Air - zero cloud dependencies, unlimited usage, complete privacy.

[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-M2-black?logo=apple)](https://www.apple.com/mac/)
[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.9.1-red?logo=pytorch)](https://pytorch.org/)

## Quick Start

### Using the Management Script

The fastest way to get started is with the `ai-stack` management script:

```bash
# Start all services
./scripts/ai-stack start

# Check status
./scripts/ai-stack status

# Run health checks
./scripts/ai-stack test
```

### First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/local-ai-stack.git
cd local-ai-stack

# 2. Install Ollama
brew install ollama

# 3. Pull recommended models
ollama pull llama3.2:3b      # Fast general use (2GB)
ollama pull llama3.1:8b      # Higher quality (4.7GB)

# 4. Start everything
./scripts/ai-stack start

# 5. Verify
./scripts/ai-stack test
```

**Services:**
- **Ollama:** http://127.0.0.1:11434
- **ComfyUI:** http://127.0.0.1:8188

---

## Management Script Commands

| Command | Description |
|---------|-------------|
| `ai-stack start [service]` | Start services (ollama, comfyui, or all) |
| `ai-stack stop [service]` | Stop services |
| `ai-stack status` | Show running services, ports, memory usage |
| `ai-stack models` | List Ollama models with sizes |
| `ai-stack test` | Health check both services |
| `ai-stack help` | Show help |

```bash
# Examples
./scripts/ai-stack start           # Start all services
./scripts/ai-stack start ollama    # Start only Ollama
./scripts/ai-stack stop comfyui    # Stop only ComfyUI
./scripts/ai-stack status          # Check what's running
```

---

## Installed Models

### ComfyUI Models

| Model | Type | Size | Location |
|-------|------|------|----------|
| SDXL 1.0 Base | Checkpoint | 6.5 GB | `models/checkpoints/sd_xl_base_1.0.safetensors` |
| RealESRGAN x4plus | Upscaler | 64 MB | `models/upscale_models/RealESRGAN_x4plus.pth` |

### Ollama Models (Recommended)

| Model | Size | Use Case | Install Command |
|-------|------|----------|-----------------|
| llama3.2:3b | 2 GB | Fast chat, quick tasks | `ollama pull llama3.2:3b` |
| llama3.1:8b | 4.7 GB | Better reasoning | `ollama pull llama3.1:8b` |
| codellama:7b | 3.8 GB | Code generation | `ollama pull codellama:7b` |
| mistral:7b | 4.1 GB | Great for chat | `ollama pull mistral:7b` |
| deepseek-r1:8b | 4.9 GB | Reasoning tasks | `ollama pull deepseek-r1:8b` |

**Check installed models:** `./scripts/ai-stack models`

---

## ComfyUI Workflows

Pre-built workflow templates are available in the `workflows/` directory. Load them by dragging the JSON file into the ComfyUI interface.

### Available Workflows

#### 1. Simple Generate (`workflows/simple-generate.json`)
Basic SDXL text-to-image generation with standard settings.

- **Input:** Text prompt
- **Output:** 1024x1024 image
- **Sampler:** Euler, 20 steps, CFG 7.5
- **Use case:** Quick image generation, testing prompts

**How to use:**
1. Load the workflow in ComfyUI
2. Edit the positive prompt text
3. Click "Queue Prompt"

#### 2. 4x Upscale (`workflows/upscale-4x.json`)
Upscale any image to 4x resolution using RealESRGAN.

- **Input:** Any image file
- **Output:** 4x upscaled image
- **Model:** RealESRGAN_x4plus
- **Use case:** Enhance AI-generated images, upscale photos

**How to use:**
1. Load the workflow in ComfyUI
2. Upload your image to the "Load Image" node
3. Click "Queue Prompt"

#### 3. Quality Generation (`workflows/txt2img-quality.json`)
High-quality SDXL generation with optimized settings.

- **Input:** Text prompt
- **Output:** 1024x1024 high-quality image
- **Sampler:** DPM++ 2M SDE, 30 steps, CFG 8, Karras schedule
- **Use case:** Final artwork, detailed images, best quality output

**How to use:**
1. Load the workflow in ComfyUI
2. Edit the positive prompt (detailed prompts work best)
3. Click "Queue Prompt"

### Loading Workflows

1. Open ComfyUI at http://127.0.0.1:8188
2. Drag and drop a `.json` workflow file onto the canvas
3. Or use Menu > Load to browse for the file

### Creating Custom Workflows

ComfyUI uses a node-based interface. Key nodes for SDXL:

- **CheckpointLoaderSimple** - Load the SDXL model
- **CLIPTextEncode** - Convert text prompts to embeddings
- **KSampler** - Generate the image (controls steps, CFG, sampler)
- **VAEDecode** - Convert latent to visible image
- **SaveImage** - Save output to disk

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  M2 MacBook Air (24GB Unified Memory)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │     Ollama       │          │     ComfyUI      │        │
│  │     :11434       │          │      :8188       │        │
│  ├──────────────────┤          ├──────────────────┤        │
│  │ LLaMA 3.2 3B     │          │  SDXL 1.0 Base   │        │
│  │ LLaMA 3.1 8B     │          │  RealESRGAN x4   │        │
│  │ CodeLlama 7B     │          │                  │        │
│  └──────────────────┘          └──────────────────┘        │
│           │                            │                    │
│           └──────────┬─────────────────┘                    │
│                      │                                      │
│             PyTorch 2.9.1 (MPS)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Benchmarks (M2 24GB)

### Ollama LLM Inference

| Model | Size | Tokens/sec | Use Case |
|-------|------|------------|----------|
| llama3.2:3b | 2GB | 50-80 | Fast chat, quick tasks |
| llama3.1:8b | 4.7GB | 25-40 | Better reasoning, analysis |
| codellama:7b | 3.8GB | 30-45 | Code generation |

### ComfyUI Image Generation

| Operation | Resolution | Time | Notes |
|-----------|-----------|------|-------|
| SDXL Generate | 1024x1024 | 15-25s | Standard 20 steps |
| SDXL Quality | 1024x1024 | 30-45s | 30 steps, DPM++ 2M SDE |
| 4x Upscale | Any | 5-10s | RealESRGAN |

*All benchmarks on M2 with 24GB unified memory*

---

## Directory Structure

```
local-ai-stack/
├── ComfyUI/                    # Stable Diffusion UI
│   ├── models/
│   │   ├── checkpoints/        # SDXL and other base models
│   │   ├── upscale_models/     # RealESRGAN and other upscalers
│   │   ├── loras/              # LoRA fine-tuned models
│   │   └── vae/                # VAE models
│   ├── custom_nodes/           # Extensions
│   └── output/                 # Generated images
├── scripts/
│   └── ai-stack                # Management script
├── workflows/                  # ComfyUI workflow templates
│   ├── simple-generate.json    # Basic SDXL generation
│   ├── upscale-4x.json         # RealESRGAN 4x upscale
│   └── txt2img-quality.json    # High-quality generation
├── docs/                       # Additional documentation
│   ├── ollama-setup.md
│   └── future-projects/
└── README.md
```

---

## Troubleshooting

### Services

**Ollama not responding:**
```bash
# Restart the service
./scripts/ai-stack stop ollama
./scripts/ai-stack start ollama

# Or via brew directly
brew services restart ollama

# Check logs
cat /opt/homebrew/var/log/ollama.log
```

**ComfyUI won't start:**
```bash
# Check if port is in use
lsof -i :8188

# Manual start for debugging
cd ComfyUI
source venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
```

**Service status unclear:**
```bash
# Full status check
./scripts/ai-stack status
./scripts/ai-stack test
```

### Memory Issues

**Out of memory errors:**
- Close other applications
- Use smaller models (llama3.2:3b instead of 8b)
- Reduce image resolution in ComfyUI
- Generate one image at a time (batch size 1)

**Check memory usage:**
```bash
./scripts/ai-stack status  # Shows memory usage

# Or use Activity Monitor
# Filter by "ollama" or "python"
```

### Model Issues

**Model not loading in ComfyUI:**
1. Verify model is in correct folder:
   - Checkpoints: `ComfyUI/models/checkpoints/`
   - Upscalers: `ComfyUI/models/upscale_models/`
2. Refresh ComfyUI (reload the page)
3. Check file extension (.safetensors, .ckpt, .pth)

**Ollama model not found:**
```bash
# List installed models
ollama list

# Re-pull model
ollama pull llama3.2:3b
```

### Network Issues

**Models won't download:**
```bash
# Check disk space
df -h ~

# Check internet
curl -I https://huggingface.co

# Manual download with resume
curl -L -C - -o model.safetensors "URL"
```

### Performance

**Slow generation:**
- Ensure no other GPU-intensive apps running
- Use Activity Monitor to check CPU/GPU usage
- Try reducing steps (20 instead of 30)
- Use smaller resolution (512x512 for testing)

**ComfyUI crashes during generation:**
- Reduce batch size to 1
- Lower resolution
- Check available memory with `./scripts/ai-stack status`

---

## Common Workflows

### Generate an Image

```bash
# 1. Start services
./scripts/ai-stack start

# 2. Open ComfyUI
open http://127.0.0.1:8188

# 3. Load workflow
# Drag workflows/simple-generate.json into the canvas

# 4. Edit prompt and generate
```

### Upscale an Image

```bash
# 1. Make sure ComfyUI is running
./scripts/ai-stack start comfyui

# 2. Load upscale workflow
# Drag workflows/upscale-4x.json into ComfyUI

# 3. Upload your image and run
```

### Chat with Ollama

```bash
# Quick chat
ollama run llama3.2:3b "Explain quantum computing in simple terms"

# Interactive mode
ollama run llama3.1:8b

# Code generation
ollama run codellama:7b "Write a Python function to sort a list"
```

### Using Ollama API

```bash
# Generate completion
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Why is the sky blue?"
}'

# Chat format
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2:3b",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

---

## Use Cases

**Text & Code:**
- Code generation and debugging
- Document analysis and summarization
- Creative writing
- Technical Q&A
- Learning and research

**Images:**
- Art and illustration generation
- Photo upscaling and enhancement
- Style transfer
- Batch image processing
- Concept visualization

---

## Technical Details

**Apple Silicon Optimizations:**
- PyTorch MPS backend for GPU acceleration
- Unified memory architecture leveraged
- Metal Performance Shaders integration
- Native ARM64 binaries

**Privacy & Security:**
- All processing on-device
- No telemetry or phone-home
- No API keys required
- Network requests only for model downloads

---

## Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Ollama installation and model management
- [x] ComfyUI with Apple Silicon optimization
- [x] Basic documentation

### Phase 2: Tooling ✅
- [x] Unified management scripts (`ai-stack`)
- [x] ComfyUI workflow templates
- [x] Model downloads (SDXL, RealESRGAN)
- [ ] Performance benchmarking suite
- [ ] Automated backup/restore

### Phase 3: Advanced UI (Planned)
- [ ] Custom web dashboard
- [ ] Unified chat + image generation interface
- [ ] Job queue management
- [ ] Output gallery with metadata

---

## Contributing

This is a personal infrastructure project, but suggestions welcome via Issues.

## License

MIT - Use freely, no warranty provided.

## Acknowledgments

- [Ollama](https://ollama.ai) - Local LLM runtime
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Stable Diffusion UI
- [PyTorch](https://pytorch.org) - ML framework with MPS support
- [Stability AI](https://stability.ai) - SDXL model
- [xinntao](https://github.com/xinntao/Real-ESRGAN) - RealESRGAN upscaler

---

**Built by Josh Duffy** | [Change Managed Consulting](https://changemanaged.com)
