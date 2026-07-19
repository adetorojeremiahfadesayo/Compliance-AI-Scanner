# code_location.py
import os
import re

CODE_LOCATION_RE = re.compile(r"^(?P<path>.+?)(?::L(?P<start>\d+)(?:-L?(?P<end>\d+))?)?$")


def parse_code_location(code_location: str):
    """Splits a "path/to/file.py:L10-L20" style location into parts, or None."""
    match = CODE_LOCATION_RE.match((code_location or "").strip())
    if not match:
        return None

    file_path = (match.group("path") or "").strip().replace("\\", os.sep).replace("/", os.sep)
    if not file_path:
        return None

    start = int(match.group("start")) if match.group("start") else None
    end = int(match.group("end")) if match.group("end") else start
    if start and end and end < start:
        start, end = end, start

    return {"file_path": file_path, "start_line": start, "end_line": end}


def resolve_repo_file(repo_path: str, file_path: str):
    """Resolves a code-location file path against a cloned repo, staying inside it."""
    repo_root = os.path.abspath(repo_path)
    relative_path = file_path
    repo_name = os.path.basename(repo_root.rstrip(os.sep))
    path_parts = [part for part in relative_path.split(os.sep) if part]
    if path_parts and path_parts[0] == repo_name:
        relative_path = os.sep.join(path_parts[1:])

    candidate = relative_path if os.path.isabs(relative_path) else os.path.join(repo_root, relative_path)
    candidate = os.path.abspath(candidate)
    try:
        if os.path.commonpath([repo_root, candidate]) != repo_root:
            return None
    except ValueError:
        return None
    if not os.path.isfile(candidate):
        return None
    return candidate


def display_repo_path(repo_path: str, file_path: str):
    repo_root = os.path.abspath(repo_path)
    try:
        return os.path.relpath(file_path, repo_root).replace("\\", "/")
    except ValueError:
        return os.path.basename(file_path)
