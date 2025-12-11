# Kestra Orchestration Architecture

## Overview

Kestra is the **single source of truth** for all InFoundry Architect operations. Each user action (Analyze, Propose, Apply, Deploy, Evaluate) maps to a Kestra pipeline with full artifact storage, retry logic, and observability.

```
UI -> Kestra API (start pipeline)                      
              ↓
        Kestra pipeline(s) -----> calls services:
              - repo-analyzer service
              - telemetry fetchers
              - Oumi model
              - graph builder
              - Cline IaC generator
              - GitHub API
              - CodeRabbit
              - deploy runner
              - metrics collector
              ↓
Kestra saves artifacts & status -> UI polls for updates
```

---

## Pipelines

| Pipeline | Description | Inputs | Outputs |
|----------|-------------|--------|---------|
| `01-ingest-repo` | Analyzes repo, detects services | `repo_url`, `repo_path` | `service_profile.json` |
| `02-ingest-telemetry` | Fetches metrics | `prometheus_url`, `services` | `telemetry_summary.json` |
| `03-propose-architecture` | Calls Oumi for pattern | `service_profile`, `telemetry_summary` | `architecture_plan.json` |
| `04-render-graph` | Builds React Flow graph | `architecture_plan` | `graph.json` |
| `05-generate-iac` | Generates Terraform via Cline | `graph` | `iac.zip`, `iac_manifest.json` |
| `06-create-pr` | Creates GitHub PR | `iac_bundle`, `repository` | `pr_result.json` |
| `07-validate-pr` | Polls GitHub/CodeRabbit | `pr_result`, `repository` | `validation_result.json` |
| `08-test-deploy` | Deploys to localstack/kind | `iac_bundle` | `deploy_result.json` |
| `09-evaluate` | Computes reward score | `deploy_result` | `evaluation_result.json` |
| `00-end-to-end` | Master pipeline | All above | All artifacts |

---

## Best Practices

### Retries & Backoff

```yaml
retry:
  type: exponential
  maxAttempt: 3
  interval: PT10S
  maxInterval: PT2M
```

### Secrets

Secrets are referenced via `{{ secret('NAME') }}`:

```yaml
env:
  GITHUB_TOKEN: "{{ secret('GITHUB_TOKEN') }}"
  OUMI_API_KEY: "{{ secret('OUMI_API_KEY') }}"
```

**Required secrets:**
- `GITHUB_TOKEN` - GitHub PAT for PR operations
- `OUMI_API_KEY` - Oumi model API key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For deployments

### Artifacts

All outputs use `outputFiles` for automatic artifact storage:

```yaml
outputFiles:
  - service_profile.json
  - graph.json

outputs:
  - id: graph
    type: FILE
    value: "{{ outputs.task.outputFiles['graph.json'] }}"
```

### Idempotency

- Each execution has unique `{{ execution.id }}`
- Artifacts include execution ID for deduplication
- Branch names include timestamps for PR creation

### Error Handling

```yaml
errors:
  - id: notify_failure
    type: io.kestra.plugin.core.log.Log
    level: ERROR
    message: "Pipeline failed: {{ error.message }}"
```

### Observability

- Labels for filtering: `labels: {stage: ingest, component: repo-analyzer}`
- Structured logging in scripts
- Metric emissions for monitoring

---

## UI Integration

### Starting a Pipeline

```typescript
// POST /api/kestra/run
const startPipeline = async (flowId: string, inputs: object) => {
  const res = await fetch('http://kestra:8080/api/v1/executions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KESTRA_API_KEY}`
    },
    body: JSON.stringify({
      namespace: 'infoundry',
      flowId,
      inputs
    })
  });
  return res.json(); // { id: "execution-id" }
};
```

### Polling Execution Status

```typescript
// GET /api/kestra/executions/:id
const pollExecution = async (executionId: string) => {
  const res = await fetch(
    `http://kestra:8080/api/v1/executions/${executionId}`
  );
  const data = await res.json();
  return {
    state: data.state.current, // CREATED, RUNNING, SUCCESS, FAILED
    outputs: data.outputs,
    startDate: data.state.startDate,
    endDate: data.state.endDate
  };
};
```

### Fetching Artifacts

```typescript
// GET artifact file
const getArtifact = async (executionId: string, path: string) => {
  const res = await fetch(
    `http://kestra:8080/api/v1/executions/${executionId}/file?path=${path}`
  );
  return res.json();
};
```

---

## Day-by-Day Migration

| Day | Tasks |
|-----|-------|
| **1** | Set up Kestra (Docker), create namespace, upload 01-02 pipelines |
| **2** | Implement 03-04 pipelines, test Oumi integration |
| **3** | Implement 05-06 pipelines, test Cline + GitHub |
| **4** | Implement 07-08 pipelines, set up localstack |
| **5** | Implement 09 + 00-end-to-end, add error handlers |
| **6** | Build UI API routes, wire up frontend |
| **7** | Observability setup, documentation |

---

## Quick Start

1. **Start Kestra**:
   ```bash
   docker run -d --name kestra -p 8080:8080 kestra/kestra:latest standalone
   ```

2. **Upload pipelines**:
   ```bash
   cd orchestrator/kestra_pipelines
   for f in *.yaml; do
     curl -X POST http://localhost:8080/api/v1/flows \
       -H "Content-Type: application/x-yaml" \
       --data-binary @"$f"
   done
   ```

3. **Configure secrets** in Kestra UI → Secrets

4. **Test end-to-end**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/executions \
     -H "Content-Type: application/json" \
     -d '{
       "namespace": "infoundry",
       "flowId": "end-to-end",
       "inputs": {
         "repository": "your-org/your-repo",
         "skip_pr": true,
         "skip_deploy": true
       }
     }'
   ```
