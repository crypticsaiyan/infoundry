# Run Locally

## Prerequisites
- Python 3.11+
- Node.js 18+
- Optional: Docker, kind, localstack

## Quick Start

### 1. UI Dashboard
```bash
cd ui
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Oumi Model Server
```bash
cd oumi

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # or: source venv/bin/activate.fish

# Install dependencies
pip install fastapi uvicorn

# Run server
python serve.py
# API at http://localhost:8000
```

### 3. MCP Server (for Cline integration)
```bash
cd infoundry-mcp-server
npm install
npm run build
npm start
```

### 4. Run Tests
```bash
# Python tests
pip install pytest fastapi httpx
pytest tests/ -v

# MCP server integration test
node tests/test-all-tools.mjs
```

### 5. Utility Scripts
```bash
# Generate PR description
./scripts/generate-pr.sh dev
```

## Kestra Pipelines

The Kestra pipelines are in `orchestrator/kestra_pipelines/`. To run them:

1. Install Kestra: https://kestra.io/docs/installation
2. Import the pipelines from `orchestrator/kestra_pipelines/`
3. Configure environment variables (GITHUB_TOKEN, etc.)
4. Trigger the `00-end-to-end.yaml` pipeline
