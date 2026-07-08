# monitor_service.py
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.database import SessionLocal, Project, Analysis

logger = logging.getLogger("app.services.monitor_service")

MONITOR_POLL_SECONDS = 60


def create_rescan(project_id: int, trigger: str, db: Optional[Session] = None) -> Optional[int]:
    """Creates a new pending Analysis reusing the project's most recent regulation.

    Returns the new analysis id, or None when the project has never been scanned
    (there is no regulation to scan against yet).

    Accepts an optional request-scoped session so callers with one (e.g. the
    webhook handler) read/write the same database as the rest of the request
    instead of a second connection to the default engine. The background
    monitoring loop has no request context, so it omits `db` and this function
    opens (and closes) its own session.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        previous = (
            db.query(Analysis)
            .filter(Analysis.project_id == project_id)
            .order_by(Analysis.id.desc())
            .first()
        )
        if not previous:
            logger.info(f"Skipping rescan of project {project_id}: no prior analysis to derive a regulation from.")
            return None

        analysis = Analysis(
            project_id=project_id,
            regulation_id=previous.regulation_id,
            status="pending",
            overall_score=0.0,
            model_provider="Qwen Cloud",
            remediation_approval_status="pending_review",
        )
        db.add(analysis)
        project.last_monitor_run = datetime.utcnow()
        db.commit()
        db.refresh(analysis)
        logger.info(f"Rescan analysis {analysis.id} created for project {project_id} (trigger: {trigger}).")
        return analysis.id
    finally:
        if owns_session:
            db.close()


def _due_project_ids() -> list:
    """Returns ids of monitored projects whose interval has elapsed."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due = []
        monitored = db.query(Project).filter(Project.monitor_enabled == 1).all()
        for project in monitored:
            interval = timedelta(minutes=project.monitor_interval_minutes or 60)
            if project.last_monitor_run is None or now - project.last_monitor_run >= interval:
                due.append(project.id)
        return due
    finally:
        db.close()


async def monitoring_loop():
    """Background loop: re-scans monitored projects when their interval elapses."""
    # Imported here to avoid a circular import at module load time
    from app.agents.orchestrator import orchestrator
    from app.api.analysis import progress_broadcaster

    logger.info("Continuous monitoring loop started.")
    while True:
        try:
            for project_id in _due_project_ids():
                analysis_id = create_rescan(project_id, trigger="scheduled_monitor")
                if analysis_id is not None:
                    await orchestrator.run(analysis_id, progress_broadcaster)
        except asyncio.CancelledError:
            logger.info("Continuous monitoring loop stopped.")
            raise
        except Exception:
            logger.exception("Monitoring loop iteration failed; continuing.")
        await asyncio.sleep(MONITOR_POLL_SECONDS)
