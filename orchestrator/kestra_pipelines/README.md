# Kestra Orchestration Pipelines

This directory contains the Kestra pipelines that power the InFoundry Architect agent. Each pipeline corresponds to a step in the architecture generation and deployment workflow.

## Overview

Kestra orchestrates the entire lifecycle:
1.  **Ingest**: Analyze repository and telemetry.
2.  **Propose**: Generate architecture plan using Oumi AI.
3.  **Render**: Visual graph generation.
4.  **Generate**: Create Terraform IaC.
5.  **Validate**: Verify IaC correctness.
6.  **PR**: Create GitHub Pull Request.
7.  **Evaluate**: Deploy and score the architecture.

## AI Agent Capabilities

InFoundry uses **Kestra's built-in AI Agent** to summarize data from other systems and make intelligent decisions:

1.  **Data Summarization**: The `ai_summarize` task in the `05-generate-iac` pipeline analyzes the complex graph data and produces a concise technical summary.
2.  **Autonomous Decision Making**: The `ai_decide` task consumes this summary to make critical architecture decisions (e.g., enabling encryption, selecting instance tiers, configuring auto-scaling) **without human intervention**.

This demonstrates the power of Kestra's AI capabilities to not just process data, but to strictly reasoning about it and driving the workflow logic.

## Pipelines

| Pipeline | Description | Inputs | Outputs |
|----------|-------------|--------|---------|
| `00-end-to-end` | Master pipeline chaining all steps | `repo_url`, `branch`, `repository`, `cloud_provider`, `project_name`, `target_folder`, `skip_pr`, `skip_validation` | All artifacts |
| `01-ingest-repo` | Analyzes repo to detect services | `repo_url`, `branch` | `service_profile.json` |
| `02-ingest-telemetry` | Fetches mock telemetry metrics | `services` | `telemetry_summary.json` |
| `03-propose-architecture` | Generates architecture plan via Oumi | `service_profile`, `telemetry_summary`, `use_oumi`, `cloud_provider`, `oumi_server_url` | `architecture_plan.json` |
| `04-render-graph` | Builds React Flow graph JSON | `architecture_plan` | `graph.json` |
| `05-generate-iac` | Generates Terraform bundle | `graph`, `cloud_provider`, `project_name` | `iac_bundle` (zip), `iac_manifest.json`, `ai_summary.json`, `ai_decisions.json` |
| `06-validate-iac` | Validates Terraform code | `iac_bundle` | `deploy_result.json` |
| `07-create-pr` | Creates GitHub PR with changes | `iac_bundle`, `repository`, `base_branch`, `target_folder`, `labels` | `pr_result.json` |
| `08-validate-pr` | Monitors PR status and checks | `pr_result`, `repository` | `validation_result.json` |
| `09-evaluate` | Computes reward score for RL | `deploy_result` | `evaluation_result.json` |

## Usage

### Prerequisites

- Kestra server running (Docker or standalone)
- Oumi server running (for AI proposals)
- GitHub Personal Access Token (PAT) configured
- AWS/Cloud credentials configured

### Deployment

Upload all pipelines to Kestra:

```bash
cd orchestrator/kestra_pipelines
for f in *.yaml; do
  curl -X POST http://localhost:8080/api/v1/flows \
    -H "Content-Type: application/x-yaml" \
    --data-binary @"$f"
done
```

### Configuration

Ensure the following secrets are set in Kestra:
- `GITHUB_TOKEN`: For PR creation and cloning private repos.
- `AWS_ACCESS_KEY_ID`: For deployment steps.
- `AWS_SECRET_ACCESS_KEY`: For deployment steps.

### Running a Pipeline

You can trigger the end-to-end flow via API:

```bash
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
      "skip_pr": false
    }
  }'
```
