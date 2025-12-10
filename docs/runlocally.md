# Run locally (scaffold)

1) Repo analyzer  
```
python orchestrator/repo_analyzer/scan.py
```

2) Telemetry summary (mocked)  
```
python orchestrator/kestra_pipelines/collect-and-summarize.yaml
```
Use with Kestra or run the script section manually.

3) Oumi stub  
```
python orchestrator/oumi_integration.py
```

4) Generate IaC stub  
```
python -c "from orchestrator.cline_integration import propose_change; propose_change('auth')"
```

5) Simulation  
```
python scripts/simulate_load.py
python scripts/compute_reward.py
```

These steps are placeholders; replace with real orchestrator endpoints and CI/CD when ready.

