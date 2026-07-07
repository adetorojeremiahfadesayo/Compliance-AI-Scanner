# projects.py
import os
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, Analysis
from app.models.schemas import ProjectCreate, ProjectResponse

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
