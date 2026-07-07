# regulations.py
import json
import os
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.database import get_db, Regulation, Requirement
from app.models.schemas import RegulationCreate, RegulationResponse, RegulationSummary, RequirementResponse
from app.agents.regulation_parser import regulation_parser_agent

logger = logging.getLogger("app.api.regulations")
router = APIRouter(prefix="/regulations", tags=["regulations"])

@router.get("/templates", response_model=List[dict])
def get_templates():
    """Returns the list of pre-loaded GDPR templates from the knowledge base."""
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "gdpr_articles.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Regulation templates template not found.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Exclude massive raw text block for summaries
        templates = []
        for index, item in enumerate(data):
            templates.append({
                "template_id": index,
                "article_number": item["article_number"],
                "title": item["title"],
                "text_summary": item["text"][:150] + "..." if len(item["text"]) > 150 else item["text"],
                "requirements_count": len(item.get("key_requirements", []))
            })
        return templates
    except Exception as e:
        logger.error(f"Error reading template file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read templates: {e}")

@router.post("/", response_model=RegulationSummary)
def create_regulation(req: RegulationCreate, db: Session = Depends(get_db)):
    """Creates a new custom regulation inside database."""
    db_reg = Regulation(
        name=req.name,
        source=req.source,
        version=req.version,
        full_text=req.full_text
    )
    db.add(db_reg)
    db.commit()
    db.refresh(db_reg)
    return db_reg

@router.get("/", response_model=List[RegulationSummary])
def list_regulations(db: Session = Depends(get_db)):
    """Lists all stored regulations."""
    return db.query(Regulation).all()

@router.get("/{regulation_id}", response_model=RegulationResponse)
def get_regulation(regulation_id: int, db: Session = Depends(get_db)):
    """Retrieves regulation details including parsed requirements."""
    db_reg = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if not db_reg:
        raise HTTPException(status_code=404, detail="Regulation not found.")
    return db_reg

async def run_regulation_parsing(regulation_id: int, db: Session):
    """Background helper to parse raw text and populate requirement model."""
    logger.info(f"Background parsing task running for regulation ID {regulation_id}")
    reg = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if not reg:
        return
        
    try:
        # Check if templates match
        parsed_requirements = await regulation_parser_agent.parse(reg.full_text, reg.source)
        for req_data in parsed_requirements:
            requirement = Requirement(
                regulation_id=regulation_id,
                article_reference=req_data["article_reference"],
                title=req_data["title"],
                description=req_data["description"],
                technical_requirement=req_data["technical_requirement"],
                severity=req_data.get("severity", "high"),
                category=req_data.get("category", "security"),
                verification_criteria=req_data["verification_criteria"]
            )
            db.add(requirement)
        db.commit()
        logger.info(f"Background parsing succeeded for regulation {regulation_id}.")
    except Exception as e:
        logger.error(f"Background parsing failed for regulation {regulation_id}: {e}")

@router.post("/{regulation_id}/parse", response_model=dict)
def trigger_parsing(regulation_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Triggers Qwen-Max to parse raw regulation text into requirements."""
    db_reg = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if not db_reg:
        raise HTTPException(status_code=404, detail="Regulation not found.")
        
    # Check if we already have requirements
    existing = db.query(Requirement).filter(Requirement.regulation_id == regulation_id).count()
    if existing > 0:
        return {"status": "skipped", "message": f"Regulation already has {existing} requirements parsed."}
        
    background_tasks.add_task(run_regulation_parsing, regulation_id, db)
    return {"status": "parsing", "message": "Parsing task submitted to background threads."}

@router.post("/load-gdpr-template", response_model=RegulationSummary)
def load_gdpr_template(article_index: int = 0, db: Session = Depends(get_db)):
    """Utility route to load a predefined GDPR article template directly to DB (useful for scans)."""
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "gdpr_articles.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="GDPR knowledge base not found.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if article_index < 0 or article_index >= len(data):
            raise HTTPException(status_code=400, detail="Invalid template index.")
            
        tmpl = data[article_index]
        
        # Check if already loaded to avoid duplicates
        existing = db.query(Regulation).filter(Regulation.name == tmpl["title"]).first()
        if existing:
            return existing
            
        db_reg = Regulation(
            name=tmpl["title"],
            source=tmpl["article_number"],
            version="2016/679",
            full_text=tmpl["text"]
        )
        db.add(db_reg)
        db.commit()
        db.refresh(db_reg)
        
        # Add pre-extracted key requirements to save Qwen calls during testing
        for kr in tmpl.get("key_requirements", []):
            req = Requirement(
                regulation_id=db_reg.id,
                article_reference=kr["article_reference"],
                title=kr["title"],
                description=kr["description"],
                technical_requirement=kr["technical_requirement"],
                severity=kr.get("severity", "high"),
                category=kr.get("category", "security"),
                verification_criteria=kr["verification_criteria"]
            )
            db.add(req)
        db.commit()
        db.refresh(db_reg)
        return db_reg
        
    except Exception as e:
        logger.error(f"Error loading GDPR template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
