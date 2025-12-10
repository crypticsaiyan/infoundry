# Architecture Notes (MVP)

- Orchestrator (FastAPI) exposes endpoints for summaries, recommendations, and PR triggers.
- Kestra pipelines ingest telemetry and produce `summary.json`.
- Oumi integration ranks actions from summaries.
- Cline integration renders IaC templates and opens PRs.
- CodeRabbit/GitHub Actions gate merges via terraform plan + tests.
- Simulation runner (localstack/kind) validates changes before merge; metrics feed back into rewards.

