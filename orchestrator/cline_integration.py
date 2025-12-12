"""
Cline CLI integration for InFoundry Architect.
Uses Cline CLI to generate IaC and create PRs with human-in-the-loop approval.
"""
import subprocess
import json
import os
import shutil
import time
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
            ["cline", "task", task],
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


def _run_git_command(args: list, cwd: str) -> subprocess.CompletedProcess:
    """Run a git command and return the result."""
    return subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=60
    )


def clone_repo(repo: str, target_dir: Path, branch: str = "dev") -> Dict:
    """
    Clone a GitHub repository to a target directory.
    
    Args:
        repo: GitHub repo (owner/repo)
        target_dir: Directory to clone into
        branch: Branch to checkout (default: dev)
    """
    try:
        result = subprocess.run(
            ["git", "clone", "--depth", "1", "--branch", branch, 
             f"https://github.com/{repo}.git", str(target_dir)],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode != 0:
            return {"success": False, "error": result.stderr}
        return {"success": True, "path": str(target_dir)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def cline_pr_create(
    repo: str,
    title: str,
    body: str,
    iac_source_dir: Path,
    repo_checkout_dir: Path,
    iac_dest_path: str = "infra/generated",
    pattern: str = "architecture",
    issue_number: Optional[int] = None,
    target_branch: str = "dev"
) -> Dict:
    """
    Create a PR by copying IaC files to a git repo checkout and pushing.
    
    Args:
        repo: GitHub repo (owner/repo)
        title: PR title
        body: PR description
        iac_source_dir: Directory containing generated IaC files
        repo_checkout_dir: Git repository checkout directory
        iac_dest_path: Relative path in repo for IaC files
        pattern: Architecture pattern for branch naming
        issue_number: Optional issue number for branch naming
        target_branch: Target branch for PR (default: dev)
    
    Returns:
        Dict with success status and details
    """
    # Generate unique branch name with timestamp to avoid collisions
    timestamp = int(time.time())
    if issue_number:
        branch = f"infoundry/architecture-{pattern}-issue{issue_number}-{timestamp}"
    else:
        branch = f"infoundry/architecture-{pattern}-{timestamp}"
    
    try:
        repo_path = str(repo_checkout_dir)
        
        # Verify this is a git repository
        git_dir = repo_checkout_dir / ".git"
        if not git_dir.exists():
            return {"success": False, "error": f"Not a git repository: {repo_path}"}
        
        # Create new branch
        result = _run_git_command(["checkout", "-b", branch], repo_path)
        if result.returncode != 0:
            return {"success": False, "error": f"Failed to create branch: {result.stderr}"}
        
        # Create destination directory and copy IaC files
        dest_dir = repo_checkout_dir / iac_dest_path
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        for tf_file in iac_source_dir.glob("*.tf"):
            shutil.copy2(tf_file, dest_dir / tf_file.name)
        
        # Also copy any JSON spec files
        for json_file in iac_source_dir.glob("*.json"):
            shutil.copy2(json_file, dest_dir / json_file.name)
        
        # Stage files
        result = _run_git_command(["add", iac_dest_path], repo_path)
        if result.returncode != 0:
            return {"success": False, "error": f"Failed to stage files: {result.stderr}"}
        
        # Commit
        result = _run_git_command(["commit", "-m", title], repo_path)
        if result.returncode != 0:
            return {"success": False, "error": f"Failed to commit: {result.stderr}"}
        
        # Push branch
        result = _run_git_command(["push", "-u", "origin", branch], repo_path)
        if result.returncode != 0:
            return {"success": False, "error": f"Failed to push: {result.stderr}"}
        
        # Create PR using gh CLI
        try:
            pr_result = subprocess.run(
                ["gh", "pr", "create",
                 "--repo", repo,
                 "--base", target_branch,
                 "--head", branch,
                 "--title", title,
                 "--body", body],
                capture_output=True,
                text=True,
                cwd=repo_path,
                timeout=60
            )
            if pr_result.returncode == 0:
                return {
                    "success": True,
                    "branch": branch,
                    "pr_url": pr_result.stdout.strip()
                }
            else:
                return {
                    "success": False,
                    "error": f"PR creation failed: {pr_result.stderr}",
                    "branch": branch
                }
        except FileNotFoundError:
            # gh CLI not installed, return branch info for manual PR
            return {
                "success": True,
                "branch": branch,
                "pr_url": None,
                "note": "gh CLI not installed. Create PR manually."
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}


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
    cloud_provider: str = "aws",
    local_checkout: Optional[Path] = None,
    issue_number: Optional[int] = None
) -> Dict:
    """
    Full pipeline: analyze → propose → generate → PR.
    
    Args:
        service_profile: Dict with services, databases, queues
        repo: GitHub repo (owner/repo)
        cloud_provider: Target cloud provider
        local_checkout: Optional local git checkout path (if None, will clone)
        issue_number: Optional issue number for branch naming
    """
    import tempfile
    
    iac_temp_dir = None
    repo_temp_dir = None
    
    try:
        # Create temp dir for IaC generation
        iac_temp_dir = Path(tempfile.mkdtemp(prefix="infoundry-iac-"))
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
        
        # Generate IaC to temp directory
        iac_result = generate_iac_with_cline(architecture, iac_temp_dir, cloud_provider)
        
        if not iac_result.get("success"):
            return {"success": False, "error": "IaC generation failed", "details": iac_result}
        
        # Get or create repo checkout
        if local_checkout and (local_checkout / ".git").exists():
            repo_checkout = local_checkout
        else:
            # Clone the repo to a temp directory
            repo_temp_dir = Path(tempfile.mkdtemp(prefix="infoundry-repo-"))
            clone_result = clone_repo(repo, repo_temp_dir, branch="dev")
            if not clone_result.get("success"):
                return {"success": False, "error": f"Failed to clone repo: {clone_result.get('error')}"}
            repo_checkout = repo_temp_dir
        
        # Create PR
        title = f"feat: Add {pattern} architecture for {service_count} services"
        body = f"**Pattern:** {pattern}\n**Components:** {', '.join(components)}\n\nAuto-generated by InFoundry + Cline"
        
        pr_result = cline_pr_create(
            repo=repo,
            title=title,
            body=body,
            iac_source_dir=iac_temp_dir,
            repo_checkout_dir=repo_checkout,
            pattern=pattern,
            issue_number=issue_number,
            target_branch="dev"
        )
        
        return {
            "success": pr_result.get("success", False),
            "architecture": architecture,
            "iac_files": iac_result.get("files", []),
            "pr_result": pr_result
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    
    finally:
        # Cleanup temp directories
        if iac_temp_dir and iac_temp_dir.exists():
            try:
                shutil.rmtree(iac_temp_dir)
            except Exception:
                pass
        if repo_temp_dir and repo_temp_dir.exists():
            try:
                shutil.rmtree(repo_temp_dir)
            except Exception:
                pass


if __name__ == "__main__":
    if check_cline_installed():
        print("✓ Cline CLI is installed")
    else:
        print("✗ Cline CLI not installed. Install: npm install -g cline")
