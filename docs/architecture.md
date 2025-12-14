# InFoundry Architecture

## System Overview

InFoundry is a self-adaptive Cloud Architect + SRE agent with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│   Next.js React Dashboard with React Flow Architecture Editor  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Kestra Orchestrator                          │
│   9-step pipeline: Ingest → Propose → Generate → Deploy → Eval │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Oumi Model   │   │  MCP Server   │   │   Terraform   │
│  Architecture │   │  Cline CLI    │   │   Generator   │
│  Recommender  │   │  Integration  │   │   & Validator │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Components

### 1. UI Dashboard (`ui/`)
- Next.js 15 React application
- React Flow architecture diagram editor
- Real-time Kestra pipeline monitoring
- Service configuration generator

### 2. Kestra Pipelines (`orchestrator/kestra_pipelines/`)
- `00-end-to-end.yaml` - Master orchestration pipeline
- Steps 01-09 for complete workflow

### 3. Oumi Model (`oumi/`)
- Fine-tuned Qwen2.5-1.5B for architecture decisions
- FastAPI server with OpenAI-compatible API
- Training data generator

### 4. MCP Server (`infoundry-mcp-server/`)
- Model Context Protocol server for Cline CLI
- Exposes all 9 workflow steps as tools
- TypeScript with Zod validation

### 5. Scripts (`scripts/`)
- `generate-pr.sh` - Auto-generate PR descriptions

## Data Flow

1. **Ingest**: Analyze repository → Extract services, DBs, queues
2. **Telemetry**: Collect metrics → Summarize latency, errors, CPU
3. **Propose**: AI recommends → Pattern, components, scaling
4. **Render**: Generate graph → React Flow compatible JSON
5. **Generate**: Create Terraform → AWS infrastructure code
6. **Validate**: Run checks → fmt, validate, tflint, tfsec
7. **Create PR**: Open GitHub PR → With generated IaC
8. **Validate PR**: Check CI → Reviews, status checks
9. **Evaluate**: AI assessment → Recommendations for next iteration
