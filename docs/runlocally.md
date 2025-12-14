# Running InFoundry Locally

This guide walks you through setting up and running InFoundry on your local machine for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| Python | 3.11+ | Oumi AI server, tests |
| Node.js | 18+ | UI, MCP server |
| npm | 9+ | Package management |
| Git | 2.x | Repository cloning |
| Docker | 20+ | Kestra, optional services |
| Docker Compose | 2.x | Multi-container setup |

### Optional Dependencies

| Tool | Purpose |
|------|---------|
| Ollama | Local LLM fallback |
| kind | Local Kubernetes cluster |
| LocalStack | AWS emulation |
| Terraform | IaC validation |

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/crypticsaiyan/infoundry.git
cd infoundry
```

### 2. Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# UI dependencies
cd ui && npm install && cd ..

# MCP server dependencies
cd infoundry-mcp-server && npm install && npm run build && cd ..
```

### 3. Start All Services

Open three terminal windows/tabs:

**Terminal 1 - Oumi AI Server:**
```bash
cd oumi
python serve.py
# Server starts at http://localhost:8000
```

**Terminal 2 - Kestra (Docker):**
```bash
docker run --pull=always --rm -it -p 8080:8080 \
  --user=root \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  kestra/kestra:latest server local
# Kestra UI at http://localhost:8080
```

**Terminal 3 - Next.js UI:**
```bash
cd ui
cp .env.example .env.local
# Edit .env.local if needed
npm run dev
# UI starts at http://localhost:3000
```

## Detailed Setup

### Python Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Fish shell)
source venv/bin/activate.fish

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Oumi Model Setup

The Oumi model provides AI-powered architecture recommendations.

#### Option A: Use Pre-trained Model (Recommended)

```bash
cd oumi

# Install Git LFS if not already installed
git lfs install

# Clone the trained model from Hugging Face
git clone https://huggingface.co/crypticsayan/infoundry-architect trained_model
```

#### Option B: Train Your Own Model

```bash
cd oumi

# Generate training data
python generate_training_data.py --count 500

# Train the model (requires GPU)
python train_sft.py
```

#### Option C: Use with Google Colab

1. Open `oumi/InFoundry_Cloud_Training.ipynb` in Google Colab
2. Select a T4 GPU runtime
3. Run all cells to train the model
4. Download the trained model

### Starting the Oumi Server

```bash
cd oumi
python serve.py
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_OUMI` | `true` | Use trained Oumi model |
| `USE_OLLAMA` | `false` | Fallback to Ollama |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |

**Test the server:**
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "oumi",
    "messages": [{"role": "user", "content": "Recommend architecture for 3 nodejs services"}]
  }'
```

### Kestra Setup

#### Option A: Docker (Recommended for Development)

```bash
# Single container with local storage
docker run --pull=always --rm -it -p 8080:8080 \
  --user=root \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  kestra/kestra:latest server local
```

#### Option B: Docker Compose (Production-like)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  kestra:
    image: kestra/kestra:latest
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /tmp:/tmp
      - kestra-data:/app/storage
    environment:
      - KESTRA_CONFIGURATION_STRING=|
        datasources:
          postgres:
            url: jdbc:postgresql://postgres:5432/kestra
            driverClassName: org.postgresql.Driver
            username: kestra
            password: kestra
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: kestra
      POSTGRES_PASSWORD: kestra
      POSTGRES_DB: kestra
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  kestra-data:
  postgres-data:
```

Run:
```bash
docker-compose up -d
```

#### Deploy Pipelines to Kestra

```bash
cd orchestrator/kestra_pipelines

# Upload all pipeline files
for f in *.yaml; do
  curl -X POST http://localhost:8080/api/v1/flows \
    -H "Content-Type: application/x-yaml" \
    --data-binary @"$f"
done
```

**Fish shell version:**
```fish
cd orchestrator/kestra_pipelines

for f in *.yaml
  curl -X POST http://localhost:8080/api/v1/flows \
    -H "Content-Type: application/x-yaml" \
    --data-binary @$f
end
```

#### Configure Kestra Secrets

Set secrets in the Kestra UI (http://localhost:8080) or via API:

```bash
# GitHub Token (for PR creation)
curl -X PUT http://localhost:8080/api/v1/namespaces/infoundry/secrets/GITHUB_TOKEN \
  -H "Content-Type: text/plain" \
  -d "ghp_your_github_token"

# AWS Credentials (optional, for deployment)
curl -X PUT http://localhost:8080/api/v1/namespaces/infoundry/secrets/AWS_ACCESS_KEY_ID \
  -H "Content-Type: text/plain" \
  -d "your_access_key"

curl -X PUT http://localhost:8080/api/v1/namespaces/infoundry/secrets/AWS_SECRET_ACCESS_KEY \
  -H "Content-Type: text/plain" \
  -d "your_secret_key"
```

### Next.js UI Setup

```bash
cd ui

# Copy environment template
cp .env.example .env.local
```

Edit `.env.local`:
```env
KESTRA_API_URL=http://localhost:8080
KESTRA_TENANT=main
# Optional authentication
# KESTRA_API_TOKEN=your_token
# KESTRA_USERNAME=admin
# KESTRA_PASSWORD=admin
```

Start development server:
```bash
npm run dev
```

Access the UI at http://localhost:3000

### MCP Server Setup (For Cline Integration)

```bash
cd infoundry-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build
```

Configure Cline to use the MCP server. Add to `~/.config/cline/mcp.json`:

```json
{
  "mcpServers": {
    "infoundry-architect": {
      "command": "node",
      "args": ["/path/to/infoundry/infoundry-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_github_token"
      }
    }
  }
}
```

## Optional: Ollama Setup

Ollama provides a local LLM fallback when the Oumi model is unavailable.

### Install Ollama

```bash
# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# macOS
brew install ollama

# Windows - Download from https://ollama.ai
```

### Start Ollama and Pull Model

```bash
# Start Ollama server
ollama serve

# In another terminal, pull a model
ollama pull codellama
# or
ollama pull qwen2.5:7b
```

### Configure Oumi to Use Ollama

Set environment variable before starting serve.py:

```bash
USE_OLLAMA=true python serve.py
```

## Running Tests

### Python Tests

```bash
# Install test dependencies
pip install pytest httpx

# Run all tests
pytest tests/ -v

# Run specific tests
pytest tests/test_oumi_serve.py -v
pytest tests/test_generate_training_data.py -v
```

### MCP Server Tests

```bash
# Ensure Oumi server is running first
cd oumi && python serve.py &

# Run tests
node tests/test_mcp_server.mjs
```

### Kestra Pipeline Tests

```bash
# Ensure Kestra is running
node tests/test_kestra.js
```

## Full Stack Development Workflow

### 1. Start All Services

```bash
# Terminal 1: Start Oumi server
cd oumi && python serve.py

# Terminal 2: Start Kestra
docker run --pull=always --rm -it -p 8080:8080 \
  --user=root \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  kestra/kestra:latest server local

# Terminal 3: Start UI
cd ui && npm run dev
```

### 2. Upload Kestra Pipelines

```bash
cd orchestrator/kestra_pipelines
for f in *.yaml; do
  curl -X POST http://localhost:8080/api/v1/flows \
    -H "Content-Type: application/x-yaml" \
    --data-binary @"$f"
done
```

### 3. Access the Application

- **UI Dashboard:** http://localhost:3000
- **Kestra UI:** http://localhost:8080
- **Oumi API:** http://localhost:8000

### 4. Test the Pipeline

1. Open http://localhost:3000/pipeline
2. Enter a GitHub repository URL (e.g., `https://github.com/crypticsaiyan/infotest`)
3. Configure options (cloud provider, project name, etc.)
4. Click "Run Pipeline"
5. Monitor progress in real-time

### 5. Test via API

```bash
# Trigger end-to-end pipeline
curl -X POST http://localhost:8080/api/v1/executions \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "infoundry",
    "flowId": "end-to-end",
    "inputs": {
      "repo_url": "https://github.com/crypticsaiyan/infotest",
      "branch": "main",
      "repository": "crypticsaiyan/infotest",
      "cloud_provider": "aws",
      "project_name": "infoundry-demo",
      "skip_pr": true
    }
  }'
```

## Troubleshooting

### Oumi Server Won't Start

**Problem:** `ModuleNotFoundError: No module named 'oumi'`

**Solution:**
```bash
pip install oumi[gpu]
# or without GPU
pip install oumi
```

### Kestra Pipeline Fails

**Problem:** AI tasks fail with connection refused

**Solution:** The Kestra container can't reach Ollama on localhost. Use Docker's host gateway:
```bash
# In pipeline YAML, use:
baseUrl: "http://172.17.0.1:11434/v1"  # Docker gateway to host
```

### UI Can't Connect to Kestra

**Problem:** CORS errors or connection refused

**Solution:** Check `.env.local` has correct `KESTRA_API_URL` and Kestra is running.

### MCP Server Not Found by Cline

**Problem:** Cline can't find the InFoundry MCP server

**Solution:**
1. Verify the path in `mcp.json` is absolute
2. Ensure `npm run build` was run
3. Check `dist/index.js` exists

### Model Inference is Slow

**Problem:** Architecture proposals take too long

**Solution:**
1. Use Ollama with a smaller model: `ollama pull qwen2.5:7b`
2. Enable GPU acceleration if available
3. The heuristic fallback is always fast

### Out of Memory During Training

**Problem:** Training fails with OOM error

**Solution:**
1. Use Google Colab with T4 GPU (free tier)
2. Reduce batch size in `train_sft.py`
3. Use gradient checkpointing

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Next.js UI | 3000 | http://localhost:3000 |
| Oumi Server | 8000 | http://localhost:8000 |
| Kestra | 8080 | http://localhost:8080 |
| Ollama | 11434 | http://localhost:11434 |

## Environment Variables Summary

### Oumi Server
| Variable | Default | Description |
|----------|---------|-------------|
| `USE_OUMI` | `true` | Use trained Oumi model |
| `USE_OLLAMA` | `false` | Use Ollama as fallback |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |

### Next.js UI
| Variable | Default | Description |
|----------|---------|-------------|
| `KESTRA_API_URL` | `http://localhost:8080` | Kestra server URL |
| `KESTRA_TENANT` | `main` | Kestra tenant ID |
| `KESTRA_API_TOKEN` | - | Optional API token |
| `KESTRA_USERNAME` | - | Optional basic auth |
| `KESTRA_PASSWORD` | - | Optional basic auth |

### MCP Server
| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | - | GitHub PAT for PR creation |
| `KESTRA_URL` | `http://localhost:8080` | Kestra server URL |

## Next Steps

After successfully running locally:

1. **Explore the UI:** Navigate to `/dashboard` to see the architecture editor
2. **Run a Pipeline:** Go to `/pipeline` and analyze a real repository
3. **Test MCP Tools:** Use Cline to interact with InFoundry tools
4. **Customize Pipelines:** Modify Kestra YAML files for your needs
5. **Train Custom Models:** Generate domain-specific training data
