# reports.py
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.models.database import get_db, Analysis, ComplianceGap
from app.services.document_generator import document_generator

logger = logging.getLogger("app.api.reports")
router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/analysis/{analysis_id}/report", response_class=PlainTextResponse)
def get_full_report(analysis_id: int, db: Session = Depends(get_db)):
    """Generates the full compliance audit report in Markdown."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="Cannot generate report for an incomplete analysis.")
        
    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    
    # Format gaps to match generator inputs
    gap_dicts = []
    for g in gaps:
        gap_dicts.append({
            "status": g.status,
            "evidence": g.evidence,
            "gap_description": g.gap_description,
            "remediation_plan": g.remediation_plan,
            "code_location": g.code_location,
            "priority": g.priority,
            "agent_name": g.agent_name,
            "requirement": {
                "article_reference": g.requirement.article_reference,
                "title": g.requirement.title,
                "description": g.requirement.description,
                "technical_requirement": g.requirement.technical_requirement,
                "severity": g.requirement.severity,
                "category": g.requirement.category,
                "verification_criteria": g.requirement.verification_criteria
            }
        })
        
    report_md = document_generator.generate_compliance_report(
        analysis.project.name,
        analysis.regulation.name,
        analysis.overall_score,
        gap_dicts,
        model_provider=analysis.model_provider,
        model_names=analysis.model_names,
        token_usage=analysis.token_usage,
        remediation_approval_status=analysis.remediation_approval_status
    )
    return report_md

@router.get("/analysis/{analysis_id}/patch", response_class=PlainTextResponse, responses={200: {"content": {"text/x-diff": {}}}})
def get_remediation_patch(analysis_id: int, db: Session = Depends(get_db)):
    """Generates a unified-diff style remediation patch suggestion."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="Patch export is only available for complete scans.")

    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    gap_dicts = []
    for g in gaps:
        gap_dicts.append({
            "status": g.status,
            "gap_description": g.gap_description,
            "remediation_plan": g.remediation_plan,
            "code_location": g.code_location,
            "priority": g.priority,
            "agent_name": g.agent_name,
            "requirement": {
                "article_reference": g.requirement.article_reference,
                "title": g.requirement.title,
                "description": g.requirement.description
            }
        })

    patch_text = document_generator.generate_remediation_patch(analysis.project.name, gap_dicts)
    return PlainTextResponse(content=patch_text, media_type="text/x-diff")

@router.get("/analysis/{analysis_id}/remediation", response_class=PlainTextResponse)
def get_remediation_guide(analysis_id: int, db: Session = Depends(get_db)):
    """Generates the step-by-step code correction plan in Markdown."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="Remediation guides are only available for complete scans.")
        
    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    
    gap_dicts = []
    for g in gaps:
        gap_dicts.append({
            "status": g.status,
            "gap_description": g.gap_description,
            "remediation_plan": g.remediation_plan,
            "code_location": g.code_location,
            "priority": g.priority,
            "agent_name": g.agent_name,
            "requirement": {
                "article_reference": g.requirement.article_reference,
                "title": g.requirement.title,
                "description": g.requirement.description
            }
        })
        
    remediation_md = document_generator.generate_remediation_plan(
        analysis.project.name,
        gap_dicts,
        remediation_approval_status=analysis.remediation_approval_status,
        remediation_approval_note=analysis.remediation_approval_note
    )
    return remediation_md

@router.get("/analysis/{analysis_id}/policy", response_class=PlainTextResponse)
def get_privacy_policy(analysis_id: int, db: Session = Depends(get_db)):
    """Generates the automated Privacy Policy GDPR clause additions."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="Privacy policy drafts are only generated for complete scans.")
        
    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    
    gap_dicts = []
    for g in gaps:
        gap_dicts.append({
            "status": g.status,
            "evidence": g.evidence,
            "requirement": {
                "article_reference": g.requirement.article_reference,
                "category": g.requirement.category
            }
        })
        
    policy_md = document_generator.generate_privacy_policy_section(
        [],  # Not needed since we scan gaps
        gap_dicts
    )
    return policy_md
