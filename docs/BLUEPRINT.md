# CloudGenesis Blueprint (copy-paste friendly)

This blueprint is a complete plan for building CloudGenesis as an open-source, human-in-the-loop cloud architect + SRE agent. It includes architecture, repo layout, 7-day plan, CI/CD, Oumi training notes, Kestra pipelines, Cline + CodeRabbit integration, security, metrics, demo script, and stretch goals.

## Table of contents
1. What CloudGenesis does (short)
2. High-level architecture (text diagram)
3. Component responsibilities
4. Repo structure (copyable)
5. Development stack & prerequisites
6. Step-by-step 7-day build plan
7. Example configs & code snippets
8. CI/CD, testing, and quality gates
9. Best open-source practices & contributor workflow
10. Security, privacy & safety checklist
11. Metrics, evaluation & judging criteria
12. Demo script (3–5 minutes)
13. Hardest technical challenges + mitigations
14. Stretch goals & future roadmap
15. Quick start checklist

## 1) What CloudGenesis does (short)
- Reads a repo and runtime telemetry.
- Proposes infra changes (IaC, autoscaling, DB indexes, instance types).
- Generates PRs via Cline and submits to CodeRabbit for review.
- Runs simulated/test deployments, collects metrics via Kestra.
- Uses Oumi (SFT + simple RL) to rank/choose actions and improve over time.
- Shows actions, estimated impact, and before/after results in a Vercel UI.

## 2) High-level architecture (text diagram)
```
[Repo + Codebase] --> Repo Analyzer
                             |
                             v
                       Kestra Ingest & Summaries
    (metrics/traces/logs/billing/slow-queries -> structured summary)
                             |
                             v
                      Decision Model (Oumi)
                             |
    +------------+-----------+------------+--------------+
    |            |                        |              |
    v            v                        v              v
Cline (Generate) -> PR -> CodeRabbit (Review) -> Merge/Deploy
                             |
                             v
                   Simulation Runner / Test Env
                             |
                             v
                        Observability (Prom/OTel)
                             |
                             v
                      Kestra collects results (loop)
```

## 3) Component responsibilities
- **Repo Analyzer (Python/Node):** Static detection of services, Dockerfiles, frameworks, DB usage, heavy endpoints. Outputs JSON service profiles.
- **Kestra:** Aggregates telemetry (Prometheus, traces, logs, billing mock) and summarizes into compact inputs for Oumi (`summary.json`).
- **Oumi:** SFT + optional GRPO RL for multi-objective reward; returns ranked actions.
- **Cline CLI:** Renders IaC/Helm/Terraform, smoke-test harnesses, creates PRs programmatically.
- **CodeRabbit:** PR gate for Terraform plan, terratest, secret scanning, migration safety, style, tests.
- **Simulation Runner (localstack/kind):** Applies IaC in a safe environment; runs smoke and synthetic load tests (k6/vegeta).
- **Vercel UI (Next.js):** Project overview, recommendations, PR monitor, before/after charts, manual approvals.

## 4) Repo structure (copyable)
```
cloudgenesis/
├─ infra/                       # IaC templates (Terraform / Helm)
│  ├─ templates/
│  └─ modules/
├─ services/                    # Example microservices (auth, payments)
│  ├─ auth/
│  └─ payments/
├─ orchestrator/                # main controller (FastAPI / Express)
│  ├─ repo_analyzer/
│  ├─ kestra_pipelines/
│  ├─ cline_integration/
│  └─ oumi_integration/
├─ tests/                       # smoke tests, integration tests, load scripts
├─ examples/                    # mock telemetry + SFT examples
│  ├─ telemetry/
│  └─ sft_examples.jsonl
├─ ui/                          # Next.js (Vercel) app
│  ├─ pages/
│  └─ components/
├─ scripts/
│  ├─ simulate_load.py
│  └─ compute_reward.py
├─ .github/
│  └─ workflows/                # CI workflows
├─ docs/
│  └─ CONTRIBUTING.md
└─ README.md
```

## 5) Development stack & prerequisites
- Python 3.11+ (or 3.10) and Node.js 18+.
- Orchestrator: FastAPI (Python) or Express (Node).
- Kestra: local or mocked pipeline YAML (Kestra server optional).
- Oumi: Oumi CLI/API; SFT + LoRA for MVP.
- Cline: CLI + API token (sponsor tool).
- CodeRabbit: GitHub app integration (sponsor tool).
- IaC: Terraform or Helm (k8s via kind).
- Simulation: localstack for AWS or kind for k8s.
- Monitoring: Prometheus + OpenTelemetry + Grafana (or simulated metrics JSON).
- Testing: Pytest / Jest, Terratest/terraform plan, k6 for load.

## 6) Step-by-step 7-day build plan (tasks per day)
- **Day 0 (prep):** Repo, GH Actions, README, LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, Vercel link, install Cline, set CodeRabbit creds.
- **Day 1:** Sample services (auth, payments); repo_analyzer `scan.py` → `service_profile.json`; example telemetry; simple Next.js page showing profile.
- **Day 2:** Kestra pipeline to ingest telemetry → `summary.json`; summary script computing p50/p95/error_rate/cost; `/summaries` endpoint.
- **Day 3:** Build `examples/sft_examples.jsonl` (50–200 pairs); `oumi_train.yaml`; quick SFT to produce LoRA adapter; `oumi_integration.py` to return top-N actions.
- **Day 4:** Cline templates for Terraform/Helm; `cline_integration.py` to render IaC and `cline pr create`; CodeRabbit webhook/Action for plan/tests.
- **Day 5:** Simulation runner applying PR to test env (localstack/kind); smoke + load tests; `compute_reward.py` to score before/after; persist results.
- **Day 6:** UI polish (Recommendations, PR Monitor, Before/After charts); manual approve/reject and what-if simulations.
- **Day 7:** Docs, demo script, final run-through, Vercel deploy.

## 7) Example configs & code snippets
### 7.1 Kestra pipeline (pseudo YAML)
```
id: collect-and-summarize
tasks:
  - id: fetch-metrics
    type: http
    url: file://./examples/telemetry/metrics.json
  - id: summarize
    type: script
    script: |
      #!/usr/bin/env python3
      import json
      metrics = json.load(open('examples/telemetry/metrics.json'))
      summary = {}
      for svc, vals in metrics.items():
          p95 = sorted(vals['latencies'])[int(0.95*len(vals['latencies']))]
          p50 = sorted(vals['latencies'])[int(0.5*len(vals['latencies']))]
          summary[svc] = {'p50': p50, 'p95': p95, 'error_rate': sum(vals['errors'])/len(vals['errors'])}
      print(json.dumps(summary))
  - id: emit
    type: http
    url: http://localhost:8000/api/summaries
```

### 7.2 Oumi training config (simplified)
```
model:
  base: "base-llm-checkpoint"
  adapter: "lora"
data:
  sft_examples: "examples/sft_examples.jsonl"
rl:
  method: "grpo"
  reward:
    cost_weight: 0.4
    latency_weight: 0.5
    reliability_weight: 0.1
eval:
  simulation_runner: "scripts/simulate_load.py"
training:
  epochs: 3
  batch_size: 8
```

### 7.3 SFT example (examples/sft_examples.jsonl)
```
{"input":"summary:{\"auth\":{\"p95\":420,\"p50\":120,\"error_rate\":0.01,\"cost\":40}}, repo_profile:{\"auth\":{\"cpu_est\":0.7}}","output":"action: add_hpa(service=auth,min=2,max=6); scale_instance(auth, from=t3.small,to=t3.medium)"}
```

### 7.4 Reward compute (scripts/compute_reward.py)
```python
def reward(before, after, weights=(0.4, 0.5, 0.1)):
    cost_delta = (before['cost'] - after['cost']) / max(1, before['cost'])
    latency_delta = (before['p95'] - after['p95']) / max(1, before['p95'])
    reliability_delta = after.get('uptime', 1.0) - before.get('uptime', 1.0)
    return weights[0]*cost_delta + weights[1]*latency_delta + weights[2]*reliability_delta
```

### 7.5 Cline example commands (pseudo)
```
cline generate infra --service auth --provider aws --pattern ecs --output infra/auth
cline pr create --repo your-org/cloudgenesis --branch cloudgenesis/autoscale-auth --title "Auto: Add HPA for auth" --files infra/auth
```

### 7.6 CodeRabbit policy sample (pseudo-checklist)
- Terraform plan completes without error.
- No hardcoded secrets or credentials.
- Migration does not drop data without backup.
- Unit tests exist for service code changes.
- At least one smoke test included for infra change.
- Implement as GitHub Action that runs `terraform init && terraform plan`.

## 8) CI/CD, testing, and quality gates
- PR gating: All Cline PRs must pass CodeRabbit checks before merge.
- Workflows: `ci/test.yml` (unit, lint, type checks), `ci/iac-check.yml` (terraform fmt/validate/plan or terratest), `ci/security.yml` (secret scan, dep audit).
- Test env: localstack for AWS, kind for k8s.
- Smoke/load tests: k6/vegeta under `tests/`.
- Automated rollback: failing smoke tests block merge or trigger rollback playbook.

## 9) Best open-source practices & contributor workflow
- Apache-2.0 license; README with purpose and how-to-run.
- CONTRIBUTING with PR template, code style, testing requirements, labels.
- CODE_OF_CONDUCT (Contributor Covenant).
- Issue templates (bug/feature); branch strategy main/dev/feat-*; Conventional Commits.
- Changelog with semantic versioning or Unreleased section.
- Docs: `docs/architecture.md`, `docs/runlocally.md`, `docs/oumi.md`.
- Reproducible dev env (devcontainer or Docker compose).

## 10) Security, privacy & safety checklist
- Secrets in GitHub Secrets/Vault; no repo secrets.
- Least privilege IAM; block open security groups and oversized instances.
- Human-in-loop: never auto-merge to main; CodeRabbit gate required.
- Telemetry anonymized; use test accounts/localstack for validation.
- Audit log every agent action and PR; rate-limit PR generation.
- Validate Oumi outputs with rule-based guardrails.
- Run dependency and secret scans in CI.

## 11) Metrics, evaluation & judging criteria
- P95 latency reduction; cost reduction estimate.
- Time saved (analysis + implementation).
- Number of safe automated PRs and % passing CodeRabbit.
- False-positive/unsafe-change rate.
- Loop time (analysis → PR → test deploy).
- Include a one-slide metrics dashboard.

## 12) Demo script (3–5 minutes)
1. Intro (15s): “CloudGenesis: autonomous cloud architect for dev teams.”
2. UI Overview (20s): Project Overview page with services/p95/cost.
3. Trigger Analysis (30s): Click “Analyze” → Kestra summarizer → `summary.json`.
4. Recommendation (30s): Oumi suggests “Add HPA to auth; change instance type.” Show estimated impact.
5. Create PR (20s): Click “Apply” → Cline PR → show GitHub, CodeRabbit checks.
6. Test Deploy (45s): Merge to test branch → deploy to localstack/kind → smoke/load tests; show before/after charts.
7. Wrap (20s): Summarize improvements; emphasize human-in-loop safety.

## 13) Hardest technical challenges + mitigations
- Multi-objective optimization: start with weighted latency/cost; expose weights in UI.
- Safety of IaC: rule-based validators, CodeRabbit gating, terraform plan in test env.
- Noisy telemetry: synthetic load + sliding windows; SFT on synthetic examples.
- Runtime constraints: small SFT/LoRA adapters; defer RL unless time permits.

## 14) Stretch goals & future roadmap
- Multi-cloud planner (AWS/GCP/Azure), migration suggestions.
- Multi-agent specialization (DB/network/infra).
- Live RL with canaries and auto-rollback.
- Auto-generated runbooks and postmortems.
- Billing optimization (reserved instances, savings plans).
- Marketplace for reusable IaC patterns and cost rules.

## 15) Quick start checklist
- GitHub repo + Actions enabled.
- Add Apache-2.0 LICENSE, README, CONTRIBUTING, CODE_OF_CONDUCT.
- Sample services `auth` and `payments` with Dockerfiles.
- Implement `repo_analyzer/scan.py` → `service_profile.json`.
- Add telemetry in `examples/telemetry/metrics.json`.
- Add Kestra pipelines to POST summaries to orchestrator.
- Create `examples/sft_examples.jsonl` (50 SFT samples).
- Prepare `oumi_train.yaml` and run quick SFT.
- Implement `oumi_integration.py` to call model and return actions.
- Add Cline templates and `cline_integration.py` to create PRs.
- GitHub Action for terraform plan/tests (CodeRabbit simulated if needed).
- Deploy UI to Vercel; prepare demo script; run E2E once.

