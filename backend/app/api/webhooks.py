# webhooks.py
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.models.database import get_db, Project
from app.services.monitor_service import create_rescan

logger = logging.getLogger("app.api.webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _normalize_repo_url(url: str) -> str:
    url = (url or "").strip().lower().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    return url


async def _run_webhook_rescan(analysis_id: int):
    from app.agents.orchestrator import orchestrator
    from app.api.analysis import progress_broadcaster
    await orchestrator.run(analysis_id, progress_broadcaster)


@router.post("/github", response_model=dict)
async def github_push_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """GitHub push webhook: re-scans the matching project when new commits land."""
    payload = await request.json()
    repository = payload.get("repository") or {}
    candidates = {
        _normalize_repo_url(repository.get("clone_url", "")),
        _normalize_repo_url(repository.get("html_url", "")),
        _normalize_repo_url(repository.get("git_url", "")),
    }
    candidates.discard("")
    if not candidates:
        return {"status": "ignored", "message": "No repository URL found in webhook payload."}

    projects = db.query(Project).filter(Project.repo_url.isnot(None)).all()
    matched = [p for p in projects if _normalize_repo_url(p.repo_url) in candidates]
    if not matched:
        return {"status": "ignored", "message": "No registered project matches this repository."}

    triggered = []
    for project in matched:
        analysis_id = create_rescan(project.id, trigger="github_push", db=db)
        if analysis_id is not None:
            background_tasks.add_task(_run_webhook_rescan, analysis_id)
            triggered.append({"project_id": project.id, "analysis_id": analysis_id})

    if not triggered:
        return {"status": "ignored", "message": "Matched projects have no prior scan to re-run."}
    return {"status": "rescan_triggered", "analyses": triggered}
