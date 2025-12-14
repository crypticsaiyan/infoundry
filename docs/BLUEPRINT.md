# InFoundry Blueprint

This document provides the complete system design blueprint for InFoundry, including project structure, component specifications, and implementation details.

## Project Structure

```
infoundry/
├── docs/                           # Documentation
│   ├── architecture.md             # System architecture overview
│   ├── blueprint.md                # This file - system design
│   └── runlocally.md               # Local development guide
│
├── examples/                       # Sample data files
│   ├── sample_architecture_plan.json
│   ├── sample_deploy_result.json
│   ├── sample_graph.json
│   ├── sample_pr_result.json
│   ├── sample_service_profile.json
│   ├── sample_telemetry_summary.json
│   └── sft_examples.jsonl          # Training examples
│
├── infoundry-mcp-server/           # Cline MCP integration
│   ├── src/
│   │   └── index.ts                # MCP server implementation
│   ├── package.json
│   └── tsconfig.json
│
├── orchestrator/                   # Kestra pipeline definitions
│   └── kestra_pipelines/
│       ├── 00-end-to-end.yaml      # Master pipeline
│       ├── 01-ingest-repo.yaml
│       ├── 02-ingest-telemetry.yaml
│       ├── 03-propose-architecture.yaml
│       ├── 04-render-graph.yaml
│       ├── 05-generate-iac.yaml
│       ├── 06-validate-iac.yaml
│       ├── 07-create-pr.yaml
│       ├── 08-validate-pr.yaml
│       ├── 09-evaluate.yaml
│       └── namespace.yaml
│
├── oumi/                           # AI model training & serving
│   ├── serve.py                    # FastAPI model server
│   ├── train_sft.py                # SFT training script
│   ├── run_inference.py            # Model testing
│   ├── generate_training_data.py   # Training data generator
│   ├── generate_with_oumi.py       # Model-based data generator
│   ├── InFoundry_Cloud_Training.ipynb  # Colab notebook
│   ├── generated_training_data.jsonl
│   └── trained_model/              # LoRA adapter weights
│
├── scripts/                        # Utility scripts
│   └── generate-pr.sh
│
├── tests/                          # Unit tests
│   ├── test_generate_training_data.py
│   ├── test_kestra.js
│   ├── test_mcp_server.mjs
│   └── test_oumi_serve.py
│
├── ui/                             # Next.js React dashboard
│   ├── app/                        # App Router pages
│   │   ├── page.jsx                # Landing page
│   │   ├── layout.jsx
│   │   ├── globals.css
│   │   ├── api/                    # API routes
│   │   ├── configure/
│   │   ├── dashboard/
│   │   └── pipeline/
│   ├── components/                 # React components
│   │   ├── PipelineForm.jsx
│   │   ├── StepProgressBar.jsx
│   │   ├── StepOutputCard.jsx
│   │   └── viewers/
│   └── lib/
│       └── kestra.js               # Kestra API client
│
├── requirements.txt                # Python dependencies
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── ROADMAP.md
└── SECURITY.md
```

## Component Specifications

### 1. Oumi AI Model

**Purpose:** Intelligent cloud architecture recommendations

**Specification:**
- **Base Model:** Qwen/Qwen2.5-1.5B-Instruct
- **Fine-tuning Method:** LoRA (Low-Rank Adaptation)
- **Training Examples:** 500
- **Output Format:** JSON with architecture pattern, components, and rationale

**API Contract (`/v1/chat/completions`):**

```typescript
// Request
interface CompletionRequest {
  model: string;            // Default: "codellama"
  messages?: Message[];     // Chat messages
  prompt?: string;          // Direct prompt
  max_tokens?: number;      // Default: 2000
  temperature?: number;     // Default: 0.7
}

// Response
interface CompletionResponse {
  id: string;
  choices: [{
    message: {
      role: "assistant";
      content: string;      // JSON architecture recommendation
    };
    finish_reason: "stop";
  }];
}
```

**Architecture Output Schema:**
```json
{
  "pattern": "serverless|microservices_ecs|kubernetes|event_driven|lift_and_shift",
  "components": ["api_gateway", "lambda", "rds", "..."],
  "topology": "N services with PATTERN on CLOUD",
  "scaling_strategy": "horizontal_autoscaling|serverless_autoscaling|kubernetes_hpa|vertical_scaling",
  "estimated_cost_tier": "low|medium|high",
  "rationale": "Explanation of architecture choice"
}
```

### 2. Kestra Pipelines

**Purpose:** Orchestrate the complete IaC generation workflow

**Pipeline Inputs (`00-end-to-end.yaml`):**

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `repo_url` | STRING | Yes | - | Git repository URL |
| `branch` | STRING | Yes | "main" | Git branch to clone |
| `repository` | STRING | Yes | "crypticsaiyan/infotest" | GitHub repo for PR (owner/repo) |
| `cloud_provider` | STRING | Yes | "aws" | Target cloud (aws, gcp, azure) |
| `project_name` | STRING | Yes | "infoundry" | Project name for resources |
| `target_folder` | STRING | Yes | "infra" | Target folder for Terraform |
| `skip_pr` | BOOLEAN | Yes | false | Skip PR creation |
| `skip_validation` | BOOLEAN | Yes | false | Skip validation step |

**Pipeline Outputs:**

| Output | Type | Description |
|--------|------|-------------|
| `service_profile` | FILE | Repository analysis results |
| `architecture_plan` | FILE | AI-proposed architecture |
| `graph` | FILE | React Flow graph JSON |
| `iac_bundle` | FILE | Generated Terraform ZIP |
| `iac_manifest` | FILE | IaC generation manifest |

**Kestra Namespace:** `infoundry`

### 3. MCP Server

**Purpose:** Expose InFoundry tools to Cline CLI

**Tools Specification:**

#### Tool: `ingest_repo`
```typescript
{
  repoPath: string;  // Local path OR GitHub URL
}
// Returns: ServiceProfile JSON
```

#### Tool: `ingest_telemetry`
```typescript
{
  services: string;      // Comma-separated service names
  metricsJson?: string;  // Optional real metrics JSON
}
// Returns: TelemetrySummary JSON
```

#### Tool: `propose_architecture`
```typescript
{
  serviceProfile: string;      // JSON from ingest_repo
  telemetrySummary?: string;   // JSON from ingest_telemetry
  cloudProvider?: string;      // aws, gcp, azure (default: aws)
}
// Returns: ArchitecturePlan JSON
```

#### Tool: `render_graph`
```typescript
{
  architecturePlan: string;  // JSON from propose_architecture
}
// Returns: ReactFlow Graph JSON
```

#### Tool: `generate_iac`
```typescript
{
  graph: string;           // JSON from render_graph
  cloudProvider?: string;  // aws, gcp, azure
  projectName?: string;    // Resource naming prefix
}
// Returns: TerraformBundle with manifest
```

#### Tool: `validate_iac`
```typescript
{
  iacBundle: string;  // Path to Terraform files
}
// Returns: ValidationResult JSON
```

#### Tool: `create_pr`
```typescript
{
  iacBundle: string;     // Path to Terraform files
  repository: string;    // owner/repo
  targetFolder?: string; // Target folder in repo
  labels?: string;       // Comma-separated labels
}
// Returns: PRResult JSON
```

#### Tool: `validate_pr`
```typescript
{
  prResult: string;    // JSON from create_pr
  repository: string;  // owner/repo
}
// Returns: ValidationStatus JSON
```

#### Tool: `evaluate`
```typescript
{
  deployResult: string;  // JSON from validate_iac
}
// Returns: EvaluationResult JSON
```

### 4. Next.js UI

**Purpose:** Visual dashboard for architecture management

**Pages:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `page.jsx` | Landing page with features |
| `/dashboard` | `dashboard/page.jsx` | React Flow architecture editor |
| `/pipeline` | `pipeline/page.jsx` | Pipeline execution & monitoring |
| `/configure` | `configure/page.jsx` | Service configuration |

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/kestra/execute` | POST | Trigger Kestra pipeline |
| `/api/kestra/status/[id]` | GET | Get execution status |
| `/api/kestra/file` | GET | Fetch Kestra storage file |

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `KESTRA_API_URL` | `http://localhost:8080` | Kestra server URL |
| `KESTRA_TENANT` | `main` | Kestra tenant ID |
| `KESTRA_API_TOKEN` | - | Optional API token |
| `KESTRA_USERNAME` | - | Optional basic auth username |
| `KESTRA_PASSWORD` | - | Optional basic auth password |

## Data Schemas

### ServiceProfile

```json
{
  "source": "https://github.com/owner/repo",
  "services": {
    "backend": { "type": "nodejs", "path": "/backend" },
    "frontend": { "type": "nodejs", "path": "/frontend" }
  },
  "databases": ["postgres"],
  "queues": ["redis"],
  "service_count": 2,
  "primary_language": "nodejs",
  "has_infrastructure": false,
  "analyzed_at": "2024-01-01T00:00:00Z"
}
```

### TelemetrySummary

```json
{
  "summary": {
    "backend": {
      "p50": 120,
      "p95": 350,
      "avg_latency": 180,
      "error_rate": 0.02,
      "cost": 45,
      "cpu_usage": 0.65,
      "memory_mb": 384
    }
  },
  "collected_at": "2024-01-01T00:00:00Z",
  "source": "mock|provided"
}
```

### ArchitecturePlan

```json
{
  "architecture": {
    "pattern": "microservices_ecs",
    "components": ["api_gateway", "ecs_cluster", "alb", "rds"],
    "topology": "2 services with microservices_ecs pattern on aws",
    "scaling_strategy": "horizontal_autoscaling",
    "estimated_cost_tier": "medium",
    "rationale": "Selected microservices_ecs based on 2 services"
  },
  "inputs": {
    "service_count": 2,
    "cloud_provider": "aws"
  },
  "source": "oumi|heuristic"
}
```

### ReactFlow Graph

```json
{
  "nodes": [
    {
      "id": "api_gateway",
      "type": "infrastructureNode",
      "data": {
        "label": "Api Gateway",
        "type": "api_gateway",
        "icon": "globe",
        "category": "network",
        "scaling": false
      },
      "position": { "x": 0, "y": 180 },
      "style": {
        "background": "#FF9800",
        "borderRadius": "8px"
      }
    }
  ],
  "edges": [
    {
      "id": "cdn-api_gateway",
      "source": "cdn",
      "target": "api_gateway",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

### IaC Manifest

```json
{
  "files": ["main.tf", "variables.tf", "outputs.tf"],
  "cloud_provider": "aws",
  "project_name": "infoundry",
  "components": ["api_gateway", "ecs_cluster", "rds"],
  "generated_at": "2024-01-01T00:00:00Z"
}
```

## Infrastructure Components Mapping

### AWS Components

| Component | Terraform Resource | Description |
|-----------|-------------------|-------------|
| `api_gateway` | `aws_apigatewayv2_api` | HTTP API Gateway |
| `ecs_cluster` | `aws_ecs_cluster` | ECS Fargate Cluster |
| `eks_cluster` | `aws_eks_cluster` | Kubernetes Cluster |
| `lambda_functions` | `aws_lambda_function` | Serverless Functions |
| `alb` | `aws_lb` | Application Load Balancer |
| `rds` | `aws_db_instance` | RDS PostgreSQL/MySQL |
| `dynamodb` | `aws_dynamodb_table` | NoSQL Database |
| `elasticache` | `aws_elasticache_cluster` | Redis Cache |
| `sqs` | `aws_sqs_queue` | Message Queue |
| `sns` | `aws_sns_topic` | Pub/Sub Topic |
| `msk` | `aws_msk_cluster` | Managed Kafka |
| `cdn` | `aws_cloudfront_distribution` | CDN |
| `s3` | `aws_s3_bucket` | Object Storage |

## Decision Matrix

### Architecture Pattern Selection

| Criteria | serverless | microservices_ecs | kubernetes | event_driven |
|----------|------------|-------------------|------------|--------------|
| Service Count | 1-2 | 3-4 | 5+ | Any |
| Traffic Pattern | Low/Burst | Moderate | High | Event-based |
| Cost Sensitivity | High | Medium | Low | Medium |
| Latency Needs | Variable | Low | Very Low | Async OK |
| Team Size | Small | Medium | Large | Medium |

### Scaling Strategy Selection

| Strategy | Use Case | Components |
|----------|----------|------------|
| `serverless_autoscaling` | Lambda functions | No configuration needed |
| `vertical_scaling` | Simple apps, DBs | Resize instances |
| `horizontal_autoscaling` | Stateless services | ASG, ECS Service scaling |
| `kubernetes_hpa` | K8s workloads | Horizontal Pod Autoscaler |

## Testing Strategy

### Unit Tests

```bash
# Python tests (pytest)
pytest tests/ -v

# MCP server tests (Node.js)
node tests/test_mcp_server.mjs

# Oumi server tests
pytest tests/test_oumi_serve.py -v
```

### Integration Tests

```bash
# Kestra pipeline tests
node tests/test_kestra.js
```

### Manual Testing

1. Start all services (see `runlocally.md`)
2. Open UI at http://localhost:3000
3. Navigate to `/pipeline`
4. Enter a GitHub repository URL
5. Run the pipeline and monitor progress

## Deployment Options

### Local Development
- Docker Compose for all services
- See `runlocally.md` for details

### Cloud Deployment

**Vercel (UI):**
```bash
cd ui
vercel deploy
```

**Docker (Services):**
```dockerfile
# Example Oumi Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY oumi/ .
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Kubernetes:**
- Deploy Kestra via Helm chart
- Deploy Oumi server as Deployment + Service
- Deploy UI as Deployment + Ingress

## Future Enhancements

See [ROADMAP.md](../ROADMAP.md) for planned features:

- Multi-cloud support (GCP, Azure)
- Enhanced authentication
- Automated compliance auditing
- CI/CD platform integrations
- Advanced cost estimation
- AI-driven architecture optimization
- Collaborative real-time editing
