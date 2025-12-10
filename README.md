# CloudGenesis

CloudGenesis is a self-adaptive Cloud Architect + SRE agent that inspects a codebase and telemetry, proposes deployable IaC/CI changes, runs safe test deployments, and iteratively optimizes cost, latency, and reliability with human-in-the-loop approvals.

## Quick start
- Install Python 3.11+ and Node 18+. Optional: Docker, kind, localstack.
- Clone the repo, then: `pip install -r requirements.txt` (placeholder) and `npm install` inside `ui/` when it exists.
- Review `docs/BLUEPRINT.md` for the full architecture, plan, and implementation notes.
- Inspect sample telemetry under `examples/telemetry` and run the repo analyzer stub: `python orchestrator/repo_analyzer/scan.py`.
- Explore Kestra pipeline example at `orchestrator/kestra_pipelines/collect-and-summarize.yaml`.

## Structure
See `docs/BLUEPRINT.md` for the detailed structure and day-by-day plan. The scaffolded folders align with the requested layout (infra, services, orchestrator, ui, tests, examples, scripts, docs, .github/workflows).

## Licensing
Released under Apache-2.0 (see `LICENSE`).

