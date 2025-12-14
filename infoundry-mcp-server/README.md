# InFoundry MCP Server

Model Context Protocol server exposing InFoundry's cloud architecture workflow to [Cline CLI](https://cline.bot).

## Tools (9 Steps - Mirrors Kestra Pipeline)

| Step | Tool | Description |
|------|------|-------------|
| 1 | `ingest_repo` | Analyze repository (local or GitHub URL) for services, DBs, queues |
| 2 | `ingest_telemetry` | Collect service telemetry (latency, errors, CPU, memory) |
| 3 | `propose_architecture` | AI architecture proposal using Oumi model |
| 4 | `render_graph` | Convert architecture to React Flow graph for UI |
| 5 | `generate_iac` | Generate Terraform from architecture graph |
| 6 | `validate_iac` | Validate Terraform (fmt, init, validate, tflint) |
| 7 | `create_pr` | Create GitHub PR with IaC files |
| 8 | `validate_pr` | Check PR status, CI checks, and reviews |
| 9 | `evaluate` | AI evaluation with recommendations |

## Setup

```bash
npm install
npm run build
```

## Configure with Cline

Add to `~/.config/cline/mcp.json`:

```json
{
  "mcpServers": {
    "infoundry-architect": {
      "command": "node",
      "args": ["/path/to/infoundry/infoundry-mcp-server/dist/index.js"]
    }
  }
}
```

## Example Workflow

```bash
# Full pipeline with Cline
cline "Analyze https://github.com/my-org/my-app, propose architecture, generate Terraform, and create a PR"

# Or step by step:
cline "Ingest repository at /path/to/repo"
cline "Propose architecture for the service profile"
cline "Generate Terraform and validate it"
cline "Create a PR with the IaC files"
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Required for create_pr, validate_pr |
| `KESTRA_URL` | Kestra API URL (default: localhost:8080) |

## Test

```bash
# From project root:
node tests/test_mcp_server.mjs
```
