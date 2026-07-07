# analysis.py
import logging
import os
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.database import get_db, Analysis, Project, Regulation, Requirement, ComplianceGap, AuditLog
from app.models.schemas import AnalysisCreate, AnalysisResponse, ComplianceGapResponse, AuditLogResponse, AnalysisProgress, RemediationApprovalRequest, RegressionCheckResponse
from app.agents.orchestrator import orchestrator
from app.agents.monitor_agent import monitor_agent
from app.api.websocket import manager

logger = logging.getLogger("app.api.analysis")
router = APIRouter(prefix="/analysis", tags=["analysis"])

async def progress_broadcaster(progress: AnalysisProgress):
    """Callback to broadcast progress packets to WebSocket listeners."""
    logger.debug(f"Broadcasting websocket packet for analysis {progress.analysis_id}")
    await manager.broadcast(progress.analysis_id, progress.model_dump())

@router.post("/", response_model=AnalysisResponse)
def start_analysis(req: AnalysisCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Initiates a compliance scan for a codebase against a regulation in a background thread."""
    # Validate inputs
    proj = db.query(Project).filter(Project.id == req.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    reg = db.query(Regulation).filter(Regulation.id == req.regulation_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Regulation not found.")
        
    # Create Analysis record
    analysis = Analysis(
        project_id=req.project_id,
        regulation_id=req.regulation_id,
        status="pending",
        overall_score=0.0,
        model_provider="Qwen Cloud",
        remediation_approval_status="pending_review"
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    # Fire off pipeline in background task
    background_tasks.add_task(
        orchestrator.run,
        analysis.id,
        progress_broadcaster
    )
    
    return analysis

@router.get("/", response_model=List[AnalysisResponse])
def list_analyses(db: Session = Depends(get_db)):
    """Lists recent compliance analyses with project, regulation, gap, and model metadata."""
    return db.query(Analysis).order_by(Analysis.created_at.desc()).all()

@router.post("/demo", response_model=AnalysisResponse)
def create_demo_analysis(db: Session = Depends(get_db)):
    """Creates a complete sample scan for hackathon demos without cloning a remote repository."""
    repo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "demo-repo"))
    project = Project(
        name="Demo Flask Compliance App",
        repo_url=None,
        repo_path=repo_path,
        language="Python",
        status="active"
    )
    regulation = Regulation(
        name="GDPR Article 17 & 32 Demo Audit",
        source="GDPR",
        version="2016/679",
        full_text=(
            "Article 17 grants users the right to erasure. Article 32 requires appropriate "
            "security controls including password hashing, encryption, and protection against PII leakage."
        )
    )
    db.add_all([project, regulation])
    db.commit()
    db.refresh(project)
    db.refresh(regulation)

    requirements = [
        Requirement(
            regulation_id=regulation.id,
            article_reference="Article 32(1)(a)",
            title="Password & PII Encryption",
            description="Passwords must never be stored in plaintext and sensitive data should be protected at rest.",
            technical_requirement="Hash passwords with bcrypt or argon2 and encrypt sensitive profile fields.",
            severity="critical",
            category="security",
            verification_criteria="Check user model and registration route for password hashing and encryption controls."
        ),
        Requirement(
            regulation_id=regulation.id,
            article_reference="Article 32(1)(d)",
            title="Logging Restrictions for Sensitive Data",
            description="Logs must not expose personal data, passwords, tokens, or registration payloads.",
            technical_requirement="Remove raw PII logging and add safe masking helpers.",
            severity="high",
            category="security",
            verification_criteria="Search logging statements for PII fields."
        ),
        Requirement(
            regulation_id=regulation.id,
            article_reference="Article 17(1)",
            title="Automated Data Erasure Endpoint",
            description="Users must be able to request erasure of personal data without manual admin work.",
            technical_requirement="Add a DELETE endpoint that purges or anonymizes user profile data.",
            severity="critical",
            category="deletion",
            verification_criteria="Check routes for DELETE profile/account handlers."
        ),
    ]
    db.add_all(requirements)
    db.commit()
    for req in requirements:
        db.refresh(req)

    analysis = Analysis(
        project_id=project.id,
        regulation_id=regulation.id,
        status="complete",
        overall_score=16.7,
        model_provider="Qwen Cloud",
        model_names="qwen-max, qwen-plus",
        token_usage='{"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "mode": "seeded_demo"}',
        remediation_approval_status="pending_review",
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    demo_gaps = [
        ComplianceGap(
            analysis_id=analysis.id,
            requirement_id=requirements[0].id,
            status="non_compliant",
            evidence="password=data.get('password') stored directly on User model.",
            gap_description="Plaintext password storage and no field encryption detected.",
            remediation_plan="Install bcrypt, hash passwords before persistence, and encrypt sensitive profile fields.",
            code_location="demo-repo/app.py:L17-L38",
            priority="critical",
            agent_name="GapDetector"
        ),
        ComplianceGap(
            analysis_id=analysis.id,
            requirement_id=requirements[1].id,
            status="partial",
            evidence="print statement logs email and password during registration.",
            gap_description="Registration flow logs raw PII and credentials.",
            remediation_plan="Remove raw print logging and replace with a masking helper that redacts email/password values.",
            code_location="demo-repo/app.py:L27",
            priority="high",
            agent_name="GapDetector"
        ),
        ComplianceGap(
            analysis_id=analysis.id,
            requirement_id=requirements[2].id,
            status="non_compliant",
            evidence="No DELETE route exists for user profile erasure.",
            gap_description="The right-to-erasure workflow is missing.",
            remediation_plan="Add DELETE /api/profile/<user_id>, delete user records, clear related sessions/cache, and write an audit event.",
            code_location="demo-repo/app.py:L57",
            priority="critical",
            agent_name="RemediationEngine"
        ),
    ]
    db.add_all(demo_gaps)
    db.add_all([
        AuditLog(analysis_id=analysis.id, agent_name="Orchestrator", action="demo_seeded", details="Created one-click demo scan."),
        AuditLog(analysis_id=analysis.id, agent_name="GapDetector", action="gaps_discovered", details="Seeded GDPR gaps for demo repository."),
        AuditLog(analysis_id=analysis.id, agent_name="RemediationEngine", action="remediation_completed", details="Generated seeded remediation package.")
    ])
    db.commit()
    db.refresh(analysis)
    return analysis

@router.post("/{analysis_id}/approve-remediation", response_model=AnalysisResponse)
def approve_remediation(analysis_id: int, req: RemediationApprovalRequest, db: Session = Depends(get_db)):
    """Marks generated remediation output as reviewed and approved by a human reviewer."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="Remediation can only be approved for complete analyses.")

    analysis.remediation_approval_status = "approved"
    analysis.remediation_approved_at = datetime.utcnow()
    analysis.remediation_approval_note = req.note

    db.add(AuditLog(
        analysis_id=analysis_id,
        agent_name="HumanReviewer",
        action="remediation_approved",
        details=req.note or "Remediation package approved by human reviewer.",
        timestamp=datetime.utcnow()
    ))
    db.commit()
    db.refresh(analysis)
    return analysis

@router.post("/{analysis_id}/regression-check", response_model=RegressionCheckResponse)
def check_regression(analysis_id: int, db: Session = Depends(get_db)):
    """Compares the current analysis against the previous completed scan for the same project."""
    current = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    baseline = (
        db.query(Analysis)
        .filter(
            Analysis.project_id == current.project_id,
            Analysis.id < current.id,
            Analysis.status == "complete"
        )
        .order_by(Analysis.id.desc())
        .first()
    )

    if not baseline:
        return RegressionCheckResponse(
            project_id=current.project_id,
            current_analysis_id=current.id,
            baseline_analysis_id=None,
            message="No previous completed analysis found for regression comparison."
        )

    previous_gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == baseline.id).all()
    current_gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == current.id).all()
    comparison = monitor_agent.compare_analysis_gaps(previous_gaps, current_gaps)

    db.add(AuditLog(
        analysis_id=current.id,
        agent_name="MonitorAgent",
        action="regression_check_completed",
        details=(
            f"Compared against analysis {baseline.id}: "
            f"{len(comparison['new_regressions'])} regressions, "
            f"{len(comparison['resolved_gaps'])} resolved."
        ),
        timestamp=datetime.utcnow()
    ))
    db.commit()

    return RegressionCheckResponse(
        project_id=current.project_id,
        current_analysis_id=current.id,
        baseline_analysis_id=baseline.id,
        new_regressions=comparison["new_regressions"],
        resolved_gaps=comparison["resolved_gaps"],
        persistent_gaps=comparison["persistent_gaps"],
        message="Regression comparison completed."
    )

@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Retrieves full analysis results including status, overall score, and compliance gaps."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return analysis

@router.get("/{analysis_id}/gaps", response_model=List[ComplianceGapResponse])
def get_analysis_gaps(analysis_id: int, db: Session = Depends(get_db)):
    """Retrieves only the compliance gaps for a specific scan."""
    # Ensure analysis exists
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    return gaps

@router.get("/{analysis_id}/audit-log", response_model=List[AuditLogResponse])
def get_analysis_audit(analysis_id: int, db: Session = Depends(get_db)):
    """Gets the execution log entries for this scan."""
    # Ensure analysis exists
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    logs = db.query(AuditLog).filter(AuditLog.analysis_id == analysis_id).order_by(AuditLog.timestamp.asc()).all()
    return logs
