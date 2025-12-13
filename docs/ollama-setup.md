# Ollama Setup Guide

## Installation

Ollama was installed via Homebrew and configured as a system service.
```bash
brew install ollama
brew services start ollama
```

## Installed Models

### llama3.2:3b (2GB)
- **Use:** Fast general chat, quick tasks
- **Speed:** 50-80 tokens/sec on M2 24GB
- **Best for:** Rapid iteration, simple queries
- **Memory:** ~2.5GB RAM when loaded

### llama3.1:8b (4.7GB)
- **Use:** Higher quality reasoning and analysis
- **Speed:** 25-40 tokens/sec on M2 24GB  
- **Best for:** Complex analysis, better writing, nuanced responses
- **Memory:** ~5.5GB RAM when loaded

### codellama:7b (3.8GB)
- **Use:** Code generation and debugging
- **Speed:** 30-45 tokens/sec on M2 24GB
- **Best for:** Programming tasks, technical documentation
- **Memory:** ~4.5GB RAM when loaded

## CLI Usage

### Interactive Chat
```bash
# Start interactive session
ollama run llama3.2:3b

# Use a specific model
ollama run llama3.1:8b

# Exit with /bye or Ctrl+D
```

### Single Prompts
```bash
# One-off completion
ollama run llama3.2:3b "Explain quantum computing in one sentence"

# Code generation
ollama run codellama:7b "Write a Python function to reverse a string"
```

### Pipe Input
```bash
# Summarize a document
cat document.txt | ollama run llama3.1:8b "Summarize this in 3 bullet points"

# Analyze code
cat script.py | ollama run codellama:7b "Review this code for bugs"
```

## API Usage

### Generate Endpoint (Streaming)
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Why is the sky blue?",
  "stream": true
}'
```

### Chat Endpoint (Conversation)
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1:8b",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false
}'
```

### List Models
```bash
curl http://localhost:11434/api/tags
```

## Model Management

### List Installed Models
```bash
ollama list
```

### Pull New Models
```bash
# Recommended models
ollama pull mistral          # 7B general purpose
ollama pull llama3.2         # Latest 3B (alias for 3b)
ollama pull phi3             # Microsoft's 3.8B model

# Specialized models
ollama pull deepseek-coder   # Code-focused
ollama pull llama2-uncensored # Fewer restrictions
```

### Remove Models
```bash
# Free up disk space
ollama rm llama3.2:1b        # Remove test model
ollama rm mistral:latest     # Remove by tag
```

### Show Model Info
```bash
ollama show llama3.2:3b
```

## Service Management

### Control via Homebrew
```bash
# Start service
brew services start ollama

# Stop service  
brew services stop ollama

# Restart service
brew services restart ollama

# Check status
brew services list | grep ollama
```

### Manual Launch (for debugging)
```bash
ollama serve
```

## Performance Monitoring

### Check Memory Usage
```bash
# Activity Monitor
open -a "Activity Monitor"

# Command line
top -l 1 | grep ollama
ps aux | grep ollama
```

### Memory Behavior

- Models load into RAM on first use
- Stay resident until service restart
- Multiple models can be loaded simultaneously (24GB allows this)
- Unloaded automatically under memory pressure

## Configuration

### Model Storage Location
```bash
~/.ollama/models/
```

### Change Model Storage (Optional)
```bash
# Set environment variable
export OLLAMA_MODELS="/path/to/models"

# Or in ~/.zshrc for persistence
echo 'export OLLAMA_MODELS="/Volumes/External/ollama-models"' >> ~/.zshrc
```

## Troubleshooting

### Service Won't Start
```bash
# Check if already running
pgrep ollama

# Kill existing process
pkill ollama

# Restart service
brew services restart ollama
```

### Model Download Fails
```bash
# Check disk space
df -h ~

# Check network
curl -I https://ollama.ai

# Try manual download with verbose output
ollama pull llama3.2:3b --verbose
```

### Slow Performance

- Close other applications to free RAM
- Use smaller models (3B instead of 8B)
- Check Activity Monitor for memory pressure
- Restart Ollama service to unload old models

### API Not Responding
```bash
# Test connection
curl http://localhost:11434/api/tags

# Check service status
brew services list | grep ollama

# View logs
brew services log ollama
```

## Best Practices

### Model Selection

- **Quick tasks:** Use 3B models (llama3.2:3b)
- **Quality matters:** Use 8B models (llama3.1:8b)
- **Code work:** Use codellama:7b
- **Experimentation:** Try different models for same task

### Memory Management

- Don't run multiple 8B+ models simultaneously
- Restart service periodically to free memory
- Monitor with Activity Monitor
- 24GB allows comfortable 8B usage

### Prompt Engineering

- Be specific and clear
- Provide context when needed
- Use system prompts for consistency
- Iterate on prompts for better results

## Integration Examples

### Use with Scripts
```python
import requests
import json

def ask_ollama(prompt, model="llama3.2:3b"):
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": model, "prompt": prompt, "stream": False}
    )
    return response.json()["response"]

result = ask_ollama("Explain Docker in one sentence")
print(result)
```

### Batch Processing
```bash
#!/bin/bash
# Process multiple files

for file in *.txt; do
    echo "Processing $file..."
    cat "$file" | ollama run llama3.2:3b "Summarize:" > "summary_$file"
done
```

## Resources

- [Ollama Official Docs](https://github.com/ollama/ollama)
- [Model Library](https://ollama.ai/library)
- [API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model File Format](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)

## Next Steps

- Test each model with your common tasks
- Create custom Modelfiles for specialized behavior
- Build integration scripts for your workflow
- Consider [Bones Brigade UI](../future-projects/bones-brigade-ui.md) for graphical interface
