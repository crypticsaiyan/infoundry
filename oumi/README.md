# Oumi Architecture Brain

This directory contains the training data and scripts for fine-tuning an LLM to act as InFoundry's "Architecture Brain".

## Quick Start with Ollama (Recommended for Development)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull codellama

# Ollama will run on http://localhost:11434
```

## Training Your Own Model

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Train the model
```bash
python train.py
```

### 3. Serve the model
```bash
python serve.py
# Runs on http://localhost:8000
```

## Files

- `generated_training_data.jsonl` - Example architecture decisions for training
- `train.py` - Training script
- `serve.py` - FastAPI server for the trained model
- `requirements.txt` - Python dependencies
