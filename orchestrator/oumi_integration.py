"""
Stub for Oumi integration.
Replace the placeholders with real Oumi SDK/CLI calls when available.
"""
from typing import List, Dict


def rank_actions(summary: Dict, top_k: int = 3) -> List[str]:
    """
    Given a telemetry summary, return ranked action strings.
    In production, call the tuned Oumi model here.
    """
    # Placeholder heuristic
    actions = []
    for svc, vals in summary.items():
        if vals.get("p95", 0) > 400:
            actions.append(f"add_hpa(service={svc},min=2,max=6)")
        if vals.get("cost", 0) > 50:
            actions.append(f"downsize_instance(service={svc},to=t3.small)")
    return actions[:top_k]


if __name__ == "__main__":
    demo_summary = {"auth": {"p95": 420, "cost": 60}, "payments": {"p95": 210, "cost": 35}}
    print(rank_actions(demo_summary))

