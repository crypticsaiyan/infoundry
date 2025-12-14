# InFoundry Architecture

This document provides a comprehensive overview of InFoundry's system architecture, including all components, their interactions, and data flows.

## System Overview

InFoundry is a self-adaptive Cloud Architect + SRE agent that:
1. Inspects codebases and telemetry
2. Proposes deployable IaC/CI changes
3. Runs safe test deployments
4. Iteratively optimizes cost, latency, and reliability with human-in-the-loop approvals

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           InFoundry Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────┐  │
│  │   Next.js    │────▶│  Kestra Pipeline │────▶│     Oumi AI Model       │  │
│  │   UI (3000)  │◀────│   Orchestrator   │◀────│  Server (8000)          │  │
│  └──────────────┘     └──────────────────┘     └─────────────────────────┘  │
│         │                      │                          │                  │
│         │                      │                          │                  │
│         ▼                      ▼                          ▼                  │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────┐  │
│  │   React Flow │     │    MCP Server    │     │   Trained LoRA Model    │  │
│  │   Diagrams   │     │  (Cline/Claude)  │     │  Qwen2.5-1.5B-Instruct  │  │
│  └──────────────┘     └──────────────────┘     └─────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Next.js UI (`/ui`)

The user-facing dashboard built with Next.js 15.

**Technology Stack:**
- Next.js 15 with App Router
- React 18
- React Flow (@xyflow/react) for architecture visualization
- Lucide React for icons
- CSS Modules for styling

**Key Pages:**
| Route | Purpose |
|-------|---------|
| `/` | Landing page with feature overview |
| `/dashboard` | Visual architecture editor with React Flow |
| `/pipeline` | Kestra pipeline runner and monitor |
| `/configure` | Service profile configuration |

**Key Components:**
- `PipelineForm` - Collects pipeline inputs (repo URL, cloud provider, etc.)
- `StepProgressBar` - Real-time pipeline step tracking
- `StepOutputCard` - Displays step outputs and artifacts
- `ServiceConfigGenerator` - Interactive service configuration

### 2. Kestra Pipeline Orchestrator (`/orchestrator`)

Kestra orchestrates the complete infrastructure lifecycle with 9 sequential steps.

**Pipeline Flow:**
```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  01. Ingest │──▶│  02. Ingest │──▶│ 03. Propose │──▶│  04. Render │
│    Repo     │   │  Telemetry  │   │Architecture │   │    Graph    │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              │
┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│09. Evaluate │◀──│ 08. Validate│◀──│ 07. Create  │◀──────────┘
│             │   │     PR      │   │     PR      │           │
└─────────────┘   └─────────────┘   └─────────────┘           │
                                                              │
                  ┌─────────────┐   ┌─────────────┐           │
                  │ 06. Validate│◀──│05. Generate │◀──────────┘
                  │     IaC     │   │     IaC     │
                  └─────────────┘   └─────────────┘
```

**Pipeline Steps:**

| Step | Pipeline File | Description | Outputs |
|------|---------------|-------------|---------|
| 1 | `01-ingest-repo.yaml` | Analyzes repository for services, DBs, queues | `service_profile.json` |
| 2 | `02-ingest-telemetry.yaml` | Collects service telemetry metrics | `telemetry_summary.json` |
| 3 | `03-propose-architecture.yaml` | AI-powered architecture proposal | `architecture_plan.json` |
| 4 | `04-render-graph.yaml` | Converts architecture to React Flow graph | `graph.json` |
| 5 | `05-generate-iac.yaml` | Generates Terraform using AI Agent | `iac_bundle.zip` |
| 6 | `06-validate-iac.yaml` | Validates Terraform (fmt, init, validate) | `deploy_result.json` |
| 7 | `07-create-pr.yaml` | Creates GitHub PR with IaC files | `pr_result.json` |
| 8 | `08-validate-pr.yaml` | Monitors PR status and CI checks | `validation_result.json` |
| 9 | `09-evaluate.yaml` | Computes reward score for optimization | `evaluation_result.json` |

**AI Agent Integration:**
The `05-generate-iac.yaml` pipeline uses Kestra's built-in AI Agent for:
- **Data Summarization**: Analyzes complex graph data and produces technical summaries
- **Autonomous Decision Making**: Makes IaC configuration decisions (encryption, instance tiers, auto-scaling)

### 3. Oumi AI Model (`/oumi`)

The "brain" of InFoundry - a fine-tuned LLM for cloud architecture recommendations.

**Model Details:**
- Base Model: `Qwen/Qwen2.5-1.5B-Instruct`
- Training: LoRA (Low-Rank Adaptation) fine-tuning
- Training Data: 500 architecture examples
- Published: [crypticsayan/infoundry-architect](https://huggingface.co/crypticsayan/infoundry-architect)

**Key Files:**
| File | Purpose |
|------|---------|
| `serve.py` | FastAPI server with OpenAI-compatible endpoint |
| `train_sft.py` | SFT training script with LoRA |
| `run_inference.py` | Test the trained model |
| `generate_training_data.py` | Rule-based training data generator |

**Model Output Schema:**
```json
{
  "architecture": {
    "pattern": "serverless|microservices_ecs|kubernetes|event_driven",
    "components": ["api_gateway", "lambda", "rds", "..."],
    "topology": "N services with PATTERN on CLOUD",
    "scaling_strategy": "horizontal_autoscaling|serverless_autoscaling",
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

**Inference Hierarchy:**
1. **Oumi Model** (trained model) - Primary
2. **Ollama** (local LLM) - Fallback
3. **Heuristics** - Final fallback

### 4. MCP Server (`/infoundry-mcp-server`)

Model Context Protocol server for Cline CLI integration.

**Technology:**
- TypeScript with ES modules
- `@modelcontextprotocol/sdk` for MCP protocol
- `zod` for input validation

**Exposed Tools (9 steps mirroring Kestra):**

| Tool | Description |
|------|-------------|
| `ingest_repo` | Analyze repository (local or GitHub URL) |
| `ingest_telemetry` | Collect service telemetry metrics |
| `propose_architecture` | AI architecture proposal using Oumi |
| `render_graph` | Convert architecture to React Flow graph |
| `generate_iac` | Generate Terraform from graph |
| `validate_iac` | Validate Terraform code |
| `create_pr` | Create GitHub PR with IaC files |
| `validate_pr` | Check PR status and reviews |
| `evaluate` | AI evaluation with recommendations |

## Data Flow

### End-to-End Pipeline Flow

```
User Input                Processing                        Output
─────────────────────────────────────────────────────────────────────

GitHub Repo URL    ──▶   Clone & Analyze      ──▶   service_profile.json
       │                      │
       ▼                      ▼
Service Names      ──▶   Collect Metrics      ──▶   telemetry_summary.json
       │                      │
       ▼                      ▼
Service Profile    ──▶   Oumi AI Model        ──▶   architecture_plan.json
+ Telemetry                   │
       │                      ▼
       │            Convert to React Flow     ──▶   graph.json
       │                      │
       │                      ▼
       │            AI Agent + Heuristics     ──▶   iac_bundle.zip
       │                      │
       │                      ▼
       │            Terraform Validation      ──▶   deploy_result.json
       │                      │
       │                      ▼
       │            Create GitHub PR          ──▶   pr_result.json
       │                      │
       │                      ▼
       │            Monitor CI Checks         ──▶   validation_result.json
       │                      │
       ▼                      ▼
                    Evaluate Results          ──▶   evaluation_result.json
```

### Architecture Component Categories

InFoundry classifies infrastructure components into categories:

| Category | AWS Components |
|----------|---------------|
| **Network** | CDN (CloudFront), API Gateway, ALB, VPC |
| **Compute** | ECS Cluster, EKS Cluster, Lambda Functions |
| **Database** | RDS, DynamoDB, ElastiCache |
| **Messaging** | SQS, SNS, MSK (Kafka), EventBridge |
| **Storage** | S3, EFS |

### Architecture Patterns

| Pattern | Use Case | Components |
|---------|----------|------------|
| `serverless` | 1-2 services, low traffic | API Gateway, Lambda, DynamoDB |
| `microservices_ecs` | 3-4 services, moderate traffic | ECS, ALB, RDS |
| `kubernetes` | 5+ services, high traffic | EKS, ALB, RDS, ElastiCache |
| `event_driven` | Event processing, async | MSK/SQS, Lambda, EventBridge |

## Integration Points

### External Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **GitHub** | Repository analysis, PR creation | `GITHUB_TOKEN` |
| **Kestra** | Pipeline orchestration | `KESTRA_API_URL`, `KESTRA_API_TOKEN` |
| **Ollama** | Local LLM fallback | `OLLAMA_URL` (default: localhost:11434) |
| **AWS** | Cloud deployment | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

### API Endpoints

**Oumi Server (port 8000):**
- `POST /v1/chat/completions` - OpenAI-compatible chat endpoint
- `GET /health` - Health check

**Kestra (port 8080):**
- `POST /api/v1/executions` - Trigger pipeline execution
- `GET /api/v1/executions/{id}` - Get execution status

**Next.js UI (port 3000):**
- `/api/kestra/execute` - Proxy to Kestra execution
- `/api/kestra/status/{id}` - Proxy to Kestra status
- `/api/kestra/file` - Fetch Kestra storage files

## Security Considerations

1. **Path Validation**: MCP server validates paths to prevent command injection
2. **Environment Secrets**: Sensitive values stored as environment variables
3. **Temporary Files**: Cloned repos are cleaned up after analysis
4. **API Authentication**: Kestra supports token and basic auth

## Scalability

- **Horizontal Scaling**: Kestra workers can be scaled independently
- **Model Serving**: Oumi server can run multiple replicas behind a load balancer
- **UI Scaling**: Next.js can be deployed on Vercel or Kubernetes with auto-scaling
