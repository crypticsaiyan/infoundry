# 🏗️ InFoundry Oumi Architecture Brain

Fine-tuned LLM for cloud architecture recommendations using the [Oumi](https://oumi.ai) framework.

## 🤗 Trained Model

**Download from Hugging Face:** [crypticsayan/infoundry-architect](https://huggingface.co/crypticsayan/infoundry-architect/tree/main/)

The model is a LoRA adapter trained on `Qwen/Qwen2.5-1.5B-Instruct` with 500 architecture examples.

## Quick Start

### 1. Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # or venv/bin/activate.fish
pip install oumi[gpu]
```

### 2. Download Trained Model
```bash
# Option A: Clone from Hugging Face
git lfs install
git clone https://huggingface.co/crypticsayan/infoundry-architect trained_model

# Option B: Or train your own (see below)
```

### 3. Run Inference
```bash
python run_inference.py
```

### 4. Start API Server
```bash
python serve.py
# API available at http://localhost:8000
```

## Training Your Own Model

### Generate Training Data
```bash
python generate_training_data.py --count 500
```

### Train with Oumi
```bash
python train_sft.py
```

### Train on Cloud (Google Colab)
Upload `InFoundry_Cloud_Training.ipynb` to Colab with a T4 GPU.

## Files

| File | Description |
|------|-------------|
| `generate_training_data.py` | Rule-based training data generator |
| `generate_with_oumi.py` | Model-based data generator using Oumi inference |
| `train_sft.py` | SFT training script with LoRA |
| `run_inference.py` | Test the trained model |
| `serve.py` | FastAPI server for model inference |
| `InFoundry_Cloud_Training.ipynb` | Colab notebook for cloud training |
| `generated_training_data.jsonl` | 500 training examples |

## Model Output Format

The model outputs JSON matching this schema:

```json
{
  "architecture": {
    "pattern": "serverless|microservices_ecs|kubernetes|event_driven|lift_and_shift",
    "components": ["api_gateway", "lambda", "rds", ...],
    "topology": "N services with PATTERN on CLOUD",
    "scaling_strategy": "horizontal_autoscaling|serverless_autoscaling|kubernetes_hpa",
    "estimated_cost_tier": "low|medium|high",
    "rationale": "Explanation of architecture choice"
  },
  "inputs": {
    "service_count": 3,
    "cloud_provider": "aws"
  },
  "source": "ai_recommendation"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_OUMI` | `true` | Use trained Oumi model |
| `USE_OLLAMA` | `false` | Fallback to Ollama |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
