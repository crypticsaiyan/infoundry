# InFoundry MCP Server

Model Context Protocol server exposing InFoundry's cloud architecture tools to [Cline CLI](https://cline.bot).

## Tools

| Tool | Description |
|------|-------------|
| `analyze_repo` | Scan codebase for services, databases, and queues |
| `propose_architecture` | Propose optimal architecture using Oumi model |
| `generate_iac` | Generate Terraform from architecture |
| `validate_iac` | Validate Terraform with fmt, validate, and tflint |

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

## Usage

```bash
cline "Analyze this repo and generate cloud architecture with Terraform"
```

## Workflow

1. **analyze_repo** → Detects services, DBs, queues
2. **propose_architecture** → Oumi recommends pattern
3. **generate_iac** → Creates Terraform files
4. **validate_iac** → Validates with terraform + tflint
