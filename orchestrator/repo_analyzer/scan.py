"""
Lightweight repo analyzer stub.
- Detects service folders with Dockerfiles.
- Emits a simple service profile JSON for downstream steps.
"""
from pathlib import Path
import json


def detect_services(root: Path) -> dict:
    services = {}
    for svc_dir in (root / "services").glob("*"):
        dockerfile = svc_dir / "Dockerfile"
        if dockerfile.exists():
            services[svc_dir.name] = {
                "path": str(svc_dir),
                "dockerfile": str(dockerfile),
                "language": "python",
                "framework": "fastapi",
                "ports": [8000, 8001],
            }
    return services


def write_service_profile(root: Path) -> Path:
    profile = {"services": detect_services(root)}
    out_path = root / "service_profile.json"
    out_path.write_text(json.dumps(profile, indent=2))
    return out_path


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[2]
    output = write_service_profile(project_root)
    print(f"service profile written to {output}")

