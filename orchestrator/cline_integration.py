"""
Cline CLI integration for InFoundry Architect.
Uses Cline CLI to generate IaC and create PRs with human-in-the-loop approval.
"""
import subprocess
import json
import os
from pathlib import Path
from typing import Dict, Optional


def check_cline_installed() -> bool:
    """Check if Cline CLI is installed."""
    try:
        result = subprocess.run(
            ["cline", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def cline_auth() -> Dict:
    """Run Cline authentication flow."""
    if not check_cline_installed():
        return {"success": False, "error": "Cline CLI not installed"}
    
    try:
        result = subprocess.run(
            ["cline", "auth"],
            capture_output=True,
            text=True,
            timeout=60
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def run_cline_task(task: str, cwd: Optional[str] = None) -> Dict:
    """
    Run a Cline task for IaC generation.
    
    Args:
        task: Natural language task description
        cwd: Working directory for the task
    """
    if not check_cline_installed():
        return {"success": False, "error": "Cline CLI not installed. Install: npm install -g cline"}
    
    try:
        result = subprocess.run(
            ["cline", task],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=cwd
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Task timed out after 5 minutes"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def cline_pr_create(
    repo: str,
    title: str,
    body: str,
    files_dir: Path,
    pattern: str = "architecture",
    issue_number: int = None,
    target_branch: str = "dev"
) -> Dict:
    """
    Create a PR using Cline CLI.
    
    Args:
        repo: GitHub repo (owner/repo)
        title: PR title
        body: PR description
        files_dir: Directory with files to commit
        pattern: Architecture pattern for branch naming
        issue_number: Optional issue number for branch naming
        target_branch: Target branch for PR (default: dev)
    """
    import time
    
    # Generate unique branch name to avoid collisions
    timestamp = int(time.time())
    if issue_number:
        branch = f"infoundry/architecture-{pattern}-issue{issue_number}-{timestamp}"
    else:
        branch = f"infoundry/architecture-{pattern}-{timestamp}"
    
    task = f"""Create a GitHub Pull Request:
1. Create branch '{branch}' from current HEAD
2. Stage all files in {files_dir}
3. Commit with message: "{title}"
4. Push branch to origin
5. Create PR targeting {target_branch} with:
   - Title: {title}
   - Body: {body}

Use gh CLI if available."""

    return run_cline_task(task, cwd=str(files_dir.parent))


def generate_iac_with_cline(
    architecture: Dict,
    output_dir: Path,
    cloud_provider: str = "aws"
) -> Dict:
    """
    Use Cline to generate IaC from architecture.
    
    Args:
        architecture: Architecture dict with pattern, components
        output_dir: Directory to write Terraform files
        cloud_provider: Target cloud (aws, gcp, azure)
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    arch_file = output_dir / "architecture_spec.json"
    arch_file.write_text(json.dumps(architecture, indent=2))
    
    task = f"""Generate production Terraform for {cloud_provider} based on {arch_file}:
- Pattern: {architecture.get('pattern', 'unknown')}
- Components: {', '.join(architecture.get('components', []))}

Create: main.tf, variables.tf, outputs.tf in {output_dir}
Follow AWS/Terraform best practices."""

    result = run_cline_task(task, cwd=str(output_dir.parent))
    
    if result.get("success"):
        result["files"] = [str(f) for f in output_dir.glob("*.tf")]
    
    return result


def propose_and_generate(
    service_profile: Dict,
    repo: str = "your-org/infoundry",
    cloud_provider: str = "aws"
) -> Dict:
    """
    Full pipeline: analyze → propose → generate → PR.
    """
    import tempfile
    
    output_dir = Path(tempfile.mkdtemp(prefix="infoundry-iac-"))
    service_count = len(service_profile.get("services", {}))
    
    # Determine architecture pattern
    if service_count <= 2:
        pattern, components = "serverless", ["api_gateway", "lambda_functions", "dynamodb"]
    elif service_count > 4:
        pattern, components = "kubernetes", ["eks_cluster", "alb", "rds", "elasticache"]
    else:
        pattern, components = "microservices_ecs", ["ecs_cluster", "alb", "rds"]
    
    architecture = {
        "pattern": pattern,
        "components": components,
        "cloud_provider": cloud_provider,
        "topology": f"{service_count} services with {pattern} on {cloud_provider}"
    }
    
    # Generate IaC
    iac_result = generate_iac_with_cline(architecture, output_dir, cloud_provider)
    
    if not iac_result.get("success"):
        return {"success": False, "error": "IaC generation failed", "details": iac_result}
    
    # Create PR with unique branch name
    title = f"feat: Add {pattern} architecture for {service_count} services"
    body = f"**Pattern:** {pattern}\\n**Components:** {', '.join(components)}\\n\\nAuto-generated by InFoundry + Cline"
    
    pr_result = cline_pr_create(
        repo=repo,
        title=title,
        body=body,
        files_dir=output_dir,
        pattern=pattern,
        target_branch="dev"
    )
    
    return {
        "success": True,
        "architecture": architecture,
        "iac_files": iac_result.get("files", []),
        "pr_result": pr_result,
        "output_dir": str(output_dir)
    }


if __name__ == "__main__":
    if check_cline_installed():
        print("✓ Cline CLI is installed")
    else:
        print("✗ Cline CLI not installed. Install: npm install -g cline")
