# github_service.py
import asyncio
import os
import shutil
import logging
from typing import List

logger = logging.getLogger("app.services.github_service")

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
