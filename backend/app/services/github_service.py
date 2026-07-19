# github_service.py
import asyncio
import os
import re
import shutil
import logging
from typing import List, Optional, Tuple

import httpx

logger = logging.getLogger("app.services.github_service")

GITHUB_REPO_RE = re.compile(r"github\.com[/:]([\w.-]+)/([\w.-]+?)(?:\.git)?/?$", re.IGNORECASE)


def parse_github_repo(repo_url: str) -> Optional[Tuple[str, str]]:
    """Extracts (owner, repo) from a GitHub URL, or None if it isn't one."""
    match = GITHUB_REPO_RE.search(repo_url or "")
    if not match:
        return None
    return match.group(1), match.group(2)

class GitHubService:
    """Clones public repositories and walks directory trees to extract files."""

    async def clone_repo(self, repo_url: str, target_dir: str) -> str:
        """Clones a public Git repository. Returns the path to the cloned directory."""
        logger.info(f"Cloning repository: {repo_url} into {target_dir}")
        
        # Ensure target dir is empty or remove it if it exists
        if os.path.exists(target_dir):
            logger.info(f"Target directory {target_dir} exists, recreating it.")
            shutil.rmtree(target_dir, ignore_errors=True)
            
        os.makedirs(target_dir, exist_ok=True)
        
        # Construct git command: git clone --depth 1 <url> <dir>
        cmd = ["git", "clone", "--depth", "1", repo_url, target_dir]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode().strip()
                logger.error(f"Git clone failed: {error_msg}")
                raise RuntimeError(f"Failed to clone repository: {error_msg}")
                
            logger.info(f"Successfully cloned repo to {target_dir}")
            return target_dir
            
        except Exception as e:
            logger.error(f"Exception during git clone: {e}")
            raise

    async def sync_repo(self, repo_url: str, target_dir: str) -> str:
        """Ensures target_dir holds a fresh checkout of repo_url.

        Fast-forward pulls an existing clone; on any failure (or if the directory
        is not a git clone) it falls back to a clean shallow clone.
        """
        git_dir = os.path.join(target_dir, ".git")
        if os.path.isdir(git_dir):
            logger.info(f"Existing clone found at {target_dir}, pulling latest.")
            try:
                await self._run_git(["-C", target_dir, "pull", "--ff-only"])
                return target_dir
            except Exception as pull_err:
                logger.warning(f"git pull failed ({pull_err}); re-cloning {repo_url}.")

        return await self.clone_repo(repo_url, target_dir)

    async def _run_git(self, args: List[str]) -> str:
        """Runs a git subcommand, raising RuntimeError on non-zero exit."""
        process = await asyncio.create_subprocess_exec(
            "git", *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(stderr.decode().strip() or "git command failed")
        return stdout.decode().strip()

    async def list_code_files(self, repo_path: str, extensions: List[str] = None) -> List[str]:
        """Walks directory tree, returns list of relative paths for code files."""
        if extensions is None:
            extensions = [".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go"]
            
        code_files = []
        
        # Directory names to ignore
        ignore_dirs = {
            "node_modules", ".git", "__pycache__", "venv", ".venv", "env",
            "dist", "build", ".next", ".nuxt", "target", "out", "venv-run"
        }
        
        for root, dirs, files in os.walk(repo_path):
            # Prune directories in place to avoid walking ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in extensions:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, repo_path)
                    code_files.append(rel_path)
                    
        logger.info(f"Found {len(code_files)} code files in {repo_path}")
        return code_files

    async def push_fix_branch(
        self,
        repo_path: str,
        repo_url: str,
        branch: str,
        file_name: str,
        content: str,
        commit_message: str,
        token: str,
        extra_files: Optional[dict] = None,
    ):
        """Commits a remediation file (and optionally real corrected source files)
        to a new branch of the cloned repo and pushes it.

        extra_files maps repo-relative path -> new full file content. These are
        real code changes (not documentation), so the resulting PR reflects
        actual fixes, not just a written-up plan.
        """
        owner_repo = parse_github_repo(repo_url)
        if not owner_repo:
            raise ValueError(f"Not a GitHub repository URL: {repo_url}")
        owner, repo = owner_repo

        original_ref = await self._run_git(["-C", repo_path, "rev-parse", "--abbrev-ref", "HEAD"])
        await self._run_git(["-C", repo_path, "checkout", "-B", branch])
        try:
            with open(os.path.join(repo_path, file_name), "w", encoding="utf-8") as f:
                f.write(content)
            await self._run_git(["-C", repo_path, "add", file_name])

            for rel_path, new_content in (extra_files or {}).items():
                target_path = os.path.join(repo_path, rel_path)
                if os.path.commonpath([os.path.abspath(repo_path), os.path.abspath(target_path)]) != os.path.abspath(repo_path):
                    logger.warning(f"Skipping out-of-repo fix path: {rel_path}")
                    continue
                with open(target_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                await self._run_git(["-C", repo_path, "add", rel_path])

            await self._run_git([
                "-C", repo_path,
                "-c", "user.name=Compliance Autopilot",
                "-c", "user.email=autopilot@compliance.local",
                "commit", "-m", commit_message,
            ])
            push_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"
            await self._run_git(["-C", repo_path, "push", "--force", push_url, f"{branch}:{branch}"])
        finally:
            # Leave the working copy back on its original branch for future scans
            try:
                await self._run_git(["-C", repo_path, "checkout", original_ref])
            except Exception as checkout_err:
                logger.warning(f"Could not restore branch {original_ref} in {repo_path}: {checkout_err}")

    async def create_pull_request(
        self,
        repo_url: str,
        branch: str,
        title: str,
        body: str,
        token: str,
    ) -> str:
        """Opens a pull request for the pushed branch; returns the PR URL."""
        owner_repo = parse_github_repo(repo_url)
        if not owner_repo:
            raise ValueError(f"Not a GitHub repository URL: {repo_url}")
        owner, repo = owner_repo

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            repo_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
            repo_resp.raise_for_status()
            base_branch = repo_resp.json().get("default_branch", "main")

            pr_resp = await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/pulls",
                headers=headers,
                json={
                    "title": title,
                    "body": body,
                    "head": branch,
                    "base": base_branch,
                },
            )
            if pr_resp.status_code == 422:
                # A PR for this branch likely exists already — find and return it
                existing = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/pulls",
                    headers=headers,
                    params={"head": f"{owner}:{branch}", "state": "open"},
                )
                existing.raise_for_status()
                pulls = existing.json()
                if pulls:
                    return pulls[0]["html_url"]
            pr_resp.raise_for_status()
            return pr_resp.json()["html_url"]

    async def read_file(self, file_path: str) -> str:
        """Reads file content with UTF-8 encoding (and falls back to latin-1 if needed)."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        try:
            # First try utf-8
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback to latin-1
            logger.warning(f"UTF-8 decode failed for {file_path}, falling back to latin-1")
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read()

# Singleton service instance
github_service = GitHubService()
