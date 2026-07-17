# projects.py
import os
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, Analysis
from app.models.schemas import ProjectCreate, ProjectResponse, MonitoringUpdate

logger = logging.getLogger("app.api.projects")
router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
def create_project(req: ProjectCreate, db: Session = Depends(get_db)):
    """Creates a new codebase project registry. Local path is set up dynamically on scan."""
    db_project = Project(
        name=req.name,
        repo_url=req.repo_url,
        language="Python/JavaScript",  # Default languages scanned
        status="active"
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lists all registered projects."""
    return db.query(Project).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Gets details for a specific project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project

def _latest_completed_analysis(db: Session, project_id: int):
    return (
        db.query(Analysis)
        .filter(Analysis.project_id == project_id, Analysis.status == "complete")
        .order_by(Analysis.id.desc())
        .first()
    )

@router.get("/{project_id}/badge.svg")
def get_compliance_badge(project_id: int, db: Session = Depends(get_db)):
    """Returns an SVG compliance-score badge for embedding in READMEs."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    latest = _latest_completed_analysis(db, project_id)
    if latest is None:
        score_text, color = "unscanned", "#9f9f9f"
    else:
        score = round(latest.overall_score)
        score_text = f"{score}%"
        color = "#3fb950" if score >= 60 else ("#d29922" if score >= 40 else "#f85149")

    label = "compliance"
    label_width, value_width = 84, max(50, 12 + 9 * len(score_text))
    total = label_width + value_width
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="20" role="img" aria-label="{label}: {score_text}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <rect rx="3" width="{total}" height="20" fill="#555"/>
  <rect rx="3" x="{label_width}" width="{value_width}" height="20" fill="{color}"/>
  <rect rx="3" width="{total}" height="20" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="{label_width / 2}" y="14">{label}</text>
    <text x="{label_width + value_width / 2}" y="14">{score_text}</text>
  </g>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "no-cache"})

@router.get("/{project_id}/ci-status", response_model=dict)
def get_ci_status(project_id: int, threshold: float = 60.0, db: Session = Depends(get_db)):
    """CI gate endpoint: reports whether the latest completed scan meets the score threshold."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    latest = _latest_completed_analysis(db, project_id)
    if latest is None:
        return {
            "project_id": project_id,
            "project_name": project.name,
            "score": None,
            "threshold": threshold,
            "passing": False,
            "message": "No completed compliance scan found for this project.",
        }

    passing = latest.overall_score >= threshold
    return {
        "project_id": project_id,
        "project_name": project.name,
        "analysis_id": latest.id,
        "score": latest.overall_score,
        "threshold": threshold,
        "passing": passing,
        "critical_gaps": latest.criticalGaps,
        "completed_at": latest.completed_at.isoformat() if latest.completed_at else None,
        "message": "Compliance gate passed." if passing else "Compliance score below threshold.",
    }

@router.post("/{project_id}/monitoring", response_model=ProjectResponse)
def set_monitoring(project_id: int, req: MonitoringUpdate, db: Session = Depends(get_db)):
    """Enables or disables continuous compliance monitoring for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    project.monitor_enabled = 1 if req.enabled else 0
    project.monitor_interval_minutes = req.interval_minutes
    db.commit()
    db.refresh(project)
    logger.info(f"Monitoring {'enabled' if req.enabled else 'disabled'} for project {project_id} (every {req.interval_minutes}m).")
    return project

@router.delete("/{project_id}", response_model=dict)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Deletes a project record and cleans up cloned codebase folders on host."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    # Clean up cloned directories
    if project.repo_path and os.path.exists(project.repo_path):
        try:
            logger.info(f"Removing cloned project directory: {project.repo_path}")
            shutil.rmtree(project.repo_path, ignore_errors=True)
        except Exception as e:
            logger.warning(f"Failed to remove repository directory {project.repo_path}: {e}")
            
    db.delete(project)
    db.commit()
    return {"status": "success", "message": f"Project {project_id} deleted successfully."}
