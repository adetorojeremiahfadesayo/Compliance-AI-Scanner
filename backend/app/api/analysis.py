# analysis.py
import json
import logging
import os
import re
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.database import get_db, Analysis, Project, Regulation, Requirement, ComplianceGap, AuditLog
from app.models.schemas import AnalysisCreate, AnalysisResponse, ComplianceGapResponse, AuditLogResponse, AnalysisProgress, RemediationApprovalRequest, RegressionCheckResponse, CodeInspectorResponse, MultiAnalysisCreate, FixPrResponse
from app.agents.orchestrator import orchestrator
from app.agents.monitor_agent import monitor_agent
from app.api.websocket import manager
from app.services.demo_catalog import get_demo_scan
from app.services.github_service import github_service
from app.config import settings

DEMO_MODEL_NAMES = f"{settings.QWEN_MAX_MODEL}, {settings.QWEN_PLUS_MODEL}"

logger = logging.getLogger("app.api.analysis")
router = APIRouter(prefix="/analysis", tags=["analysis"])
CODE_LOCATION_RE = re.compile(r"^(?P<path>.+?)(?::L(?P<start>\d+)(?:-L?(?P<end>\d+))?)?$")

async def progress_broadcaster(progress: AnalysisProgress):
    """Callback to broadcast progress packets to WebSocket listeners."""
    logger.debug(f"Broadcasting websocket packet for analysis {progress.analysis_id}")
    await manager.broadcast(progress.analysis_id, progress.model_dump(mode="json"))

def _parse_code_location(code_location: str):
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

    return {
        "file_path": file_path,
        "start_line": start,
        "end_line": end,
    }

def _resolve_repo_file(repo_path: str, file_path: str):
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

def _display_repo_path(repo_path: str, file_path: str):
    repo_root = os.path.abspath(repo_path)
    try:
        return os.path.relpath(file_path, repo_root).replace("\\", "/")
    except ValueError:
        return os.path.basename(file_path)

def _get_or_create_project(db: Session, name: str, **defaults) -> Project:
    """Reuses a project by name so repeated demo runs don't spawn duplicate rows."""
    project = db.query(Project).filter(Project.name == name).first()
    if project:
        return project
    project = Project(name=name, **defaults)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def _get_or_create_regulation(db: Session, name: str, version: str, **defaults):
    """Reuses a regulation by (name, version). Returns (regulation, created)."""
    regulation = (
        db.query(Regulation)
        .filter(Regulation.name == name, Regulation.version == version)
        .first()
    )
    if regulation:
        return regulation, False
    regulation = Regulation(name=name, version=version, **defaults)
    db.add(regulation)
    db.commit()
    db.refresh(regulation)
    return regulation, True

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

async def run_analyses_sequentially(analysis_ids: List[int]):
    """Runs multiple scans one after another so token usage and repo syncs don't interleave."""
    for analysis_id in analysis_ids:
        await orchestrator.run(analysis_id, progress_broadcaster)

@router.post("/multi", response_model=List[AnalysisResponse])
def start_multi_analysis(req: MultiAnalysisCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Scans one project against several regulations at once (multi-framework compliance matrix)."""
    proj = db.query(Project).filter(Project.id == req.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")

    regulations = db.query(Regulation).filter(Regulation.id.in_(req.regulation_ids)).all()
    found_ids = {r.id for r in regulations}
    missing = [rid for rid in req.regulation_ids if rid not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"Regulations not found: {missing}")

    analyses = []
    for regulation_id in req.regulation_ids:
        analysis = Analysis(
            project_id=req.project_id,
            regulation_id=regulation_id,
            status="pending",
            overall_score=0.0,
            model_provider="Qwen Cloud",
            remediation_approval_status="pending_review"
        )
        db.add(analysis)
        analyses.append(analysis)
    db.commit()
    for analysis in analyses:
        db.refresh(analysis)

    background_tasks.add_task(run_analyses_sequentially, [a.id for a in analyses])
    return analyses

@router.get("/", response_model=List[AnalysisResponse])
def list_analyses(db: Session = Depends(get_db)):
    """Lists recent compliance analyses with project, regulation, gap, and model metadata."""
    return db.query(Analysis).order_by(Analysis.created_at.desc()).all()

@router.post("/demo", response_model=AnalysisResponse)
def create_demo_analysis(db: Session = Depends(get_db)):
    """Creates a complete sample scan for hackathon demos without cloning a remote repository."""
    repo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "demo-repo"))
    project = _get_or_create_project(
        db,
        name="Demo Flask Compliance App",
        repo_url=None,
        repo_path=repo_path,
        language="Python",
        status="active",
    )
    regulation, reg_created = _get_or_create_regulation(
        db,
        name="GDPR Article 17 & 32 Demo Audit",
        version="2016/679",
        source="GDPR",
        full_text=(
            "Article 17 grants users the right to erasure. Article 32 requires appropriate "
            "security controls including password hashing, encryption, and protection against PII leakage."
        ),
    )

    if reg_created:
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
    else:
        requirements = (
            db.query(Requirement)
            .filter(Requirement.regulation_id == regulation.id)
            .order_by(Requirement.id)
            .all()
        )

    analysis = Analysis(
        project_id=project.id,
        regulation_id=regulation.id,
        status="complete",
        overall_score=16.7,
        model_provider="Qwen Cloud",
        model_names=DEMO_MODEL_NAMES,
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

@router.post("/demo/{codebase_id}", response_model=AnalysisResponse)
def create_industry_demo_analysis(codebase_id: str, country_id: str = "de", db: Session = Depends(get_db)):
    """Creates a durable industry/country demo scan for a bundled demo codebase."""
    demo = get_demo_scan(codebase_id, country_id)
    if not demo:
        raise HTTPException(status_code=404, detail="Demo codebase or country rule pack not found.")

    project = _get_or_create_project(
        db,
        name=demo["project"]["name"],
        repo_url=None,
        repo_path=demo["project"]["repo_path"],
        language=demo["project"]["language"],
        status="active",
    )
    regulation, reg_created = _get_or_create_regulation(
        db,
        name=demo["regulation"]["framework"],
        version=demo["regulation"]["last_updated"],
        source=demo["regulation"]["authority"],
        full_text=(
            f"{demo['industry_label']} source-backed rule pack for "
            f"{demo['country_label']}: {demo['regulation']['framework']}. "
            f"Source: {demo['regulation']['source_url']}"
        ),
    )

    if reg_created:
        requirements = []
        for req in demo["regulation"]["requirements"]:
            requirements.append(Requirement(
                regulation_id=regulation.id,
                article_reference=req["ref"],
                title=req["title"],
                description=req["description"],
                technical_requirement=f"Implement and document controls for {req['title'].lower()}.",
                severity=req["severity"],
                category=req["category"],
                verification_criteria=f"Inspect code paths and configuration for {req['category']} controls.",
            ))
        db.add_all(requirements)
        db.commit()
        for req in requirements:
            db.refresh(req)
    else:
        requirements = (
            db.query(Requirement)
            .filter(Requirement.regulation_id == regulation.id)
            .order_by(Requirement.id)
            .all()
        )

    demo_metadata = {
        "codebase_id": demo["codebase_id"],
        "country_id": demo["country_id"],
        "industry_label": demo["industry_label"],
        "country_label": demo["country_label"],
        "country_flag": demo["country_flag"],
        "framework": demo["regulation"]["framework"],
        "authority": demo["regulation"]["authority"],
        "source_url": demo["regulation"]["source_url"],
        "last_updated": demo["regulation"]["last_updated"],
    }
    analysis = Analysis(
        project_id=project.id,
        regulation_id=regulation.id,
        status="complete",
        overall_score=float(demo["score"]),
        model_provider="Qwen Cloud",
        model_names=DEMO_MODEL_NAMES,
        token_usage=json.dumps({
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "mode": "seeded_industry_demo",
            "demo_metadata": demo_metadata,
        }),
        remediation_approval_status="pending_review",
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    gaps = []
    for index, req in enumerate(requirements):
        violation, code_location = demo["violations"][index % len(demo["violations"])]
        status = "partial" if demo["score"] >= 60 and index == 0 else "non_compliant"
        gaps.append(ComplianceGap(
            analysis_id=analysis.id,
            requirement_id=req.id,
            status=status,
            evidence=violation,
            gap_description=violation,
            remediation_plan=(
                f"Map {req.article_reference} to an owner, add automated checks for "
                f"{req.category}, and re-run Compliance AutoPilot after remediation."
            ),
            code_location=code_location,
            priority=req.severity,
            agent_name=["GeoRegulator", "GapDetector", "RemediationEngine"][index % 3],
        ))
    db.add_all(gaps)
    db.add_all([
        AuditLog(analysis_id=analysis.id, agent_name="GeoRegulator", action="rule_pack_loaded", details=f"Loaded {demo['regulation']['framework']} for {demo['country_label']}."),
        AuditLog(analysis_id=analysis.id, agent_name="CodebaseAnalyzer", action="demo_codebase_scanned", details=f"Scanned bundled demo codebase at {project.repo_path}."),
        AuditLog(analysis_id=analysis.id, agent_name="GapDetector", action="gaps_discovered", details=f"Mapped {len(gaps)} findings to source-backed requirements."),
        AuditLog(analysis_id=analysis.id, agent_name="RemediationEngine", action="recommendations_generated", details=f"Generated confidence status: {analysis.confidence_status}."),
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

def _build_remediation_markdown(analysis: Analysis, gaps: List[ComplianceGap]) -> str:
    """Assembles the remediation document committed to the fix branch."""
    lines = [
        "# Compliance Autopilot — Remediation Package",
        "",
        f"- **Project:** {analysis.project.name}",
        f"- **Regulation:** {analysis.regulation.name} ({analysis.regulation.source})",
        f"- **Scan:** #{analysis.id}, score {analysis.overall_score:.1f}%",
        f"- **Human approved:** {analysis.remediation_approved_at:%Y-%m-%d %H:%M} UTC",
        "",
        "This document was generated by the Compliance Autopilot agent pipeline and",
        "approved by a human reviewer. Each section below is an actionable remediation",
        "plan for a detected compliance gap.",
        "",
    ]
    for gap in gaps:
        if gap.status == "compliant" or not gap.remediation_plan:
            continue
        lines.extend([
            "---",
            "",
            f"## {gap.requirement.article_reference} — {gap.requirement.title}",
            "",
            f"- **Status:** {gap.status}",
            f"- **Priority:** {gap.priority}",
            f"- **Code location:** {gap.code_location or 'n/a'}",
            "",
            f"**Gap:** {gap.gap_description or gap.evidence or 'See scan report.'}",
            "",
            "### Remediation plan",
            "",
            gap.remediation_plan,
            "",
        ])
    return "\n".join(lines)

@router.post("/{analysis_id}/create-fix-pr", response_model=FixPrResponse)
async def create_fix_pr(analysis_id: int, db: Session = Depends(get_db)):
    """Pushes the approved remediation package to a branch and opens a GitHub pull request."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    if analysis.status != "complete":
        raise HTTPException(status_code=400, detail="A fix PR can only be created for a completed scan.")
    if analysis.remediation_approval_status != "approved":
        raise HTTPException(status_code=400, detail="Remediation must be human-approved before a fix PR can be created.")

    project = analysis.project
    if not project or not project.repo_url:
        raise HTTPException(status_code=400, detail="This project has no remote repository URL to open a PR against.")
    if not project.repo_path or not os.path.isdir(project.repo_path):
        raise HTTPException(status_code=400, detail="Local clone of the repository not found — run a scan first.")

    token = settings.GITHUB_TOKEN
    if not token:
        raise HTTPException(status_code=400, detail="GITHUB_TOKEN is not configured on the backend. Set it in backend/.env to enable fix PRs.")

    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    actionable = [g for g in gaps if g.status != "compliant" and g.remediation_plan]
    if not actionable:
        raise HTTPException(status_code=400, detail="No remediation plans available to commit for this scan.")

    branch = f"compliance-autopilot/scan-{analysis_id}"
    markdown = _build_remediation_markdown(analysis, gaps)
    pr_title = f"Compliance remediation package (scan #{analysis_id}, score {analysis.overall_score:.0f}%)"
    pr_body = (
        f"Automated remediation package generated by **Compliance Autopilot** against "
        f"*{analysis.regulation.name}* and approved by a human reviewer.\n\n"
        f"- Compliance score: **{analysis.overall_score:.1f}%**\n"
        f"- Gaps with remediation plans: **{len(actionable)}**\n"
        f"- Models: {analysis.model_names}\n\n"
        f"See `COMPLIANCE_REMEDIATION.md` in this branch for the full step-by-step plans."
    )

    try:
        await github_service.push_fix_branch(
            repo_path=project.repo_path,
            repo_url=project.repo_url,
            branch=branch,
            file_name="COMPLIANCE_REMEDIATION.md",
            content=markdown,
            commit_message=f"docs: compliance remediation package from scan #{analysis_id}",
            token=token,
        )
        pr_url = await github_service.create_pull_request(
            repo_url=project.repo_url,
            branch=branch,
            title=pr_title,
            body=pr_body,
            token=token,
        )
    except Exception as e:
        logger.exception(f"Fix PR creation failed for analysis {analysis_id}")
        db.add(AuditLog(
            analysis_id=analysis_id,
            agent_name="RemediationEngine",
            action="fix_pr_failed",
            details=str(e)[:500],
            timestamp=datetime.utcnow()
        ))
        db.commit()
        return FixPrResponse(
            status="failed",
            branch=branch,
            message=f"Could not push branch or open PR: {e}",
        )

    db.add(AuditLog(
        analysis_id=analysis_id,
        agent_name="RemediationEngine",
        action="fix_pr_created",
        details=f"Opened {pr_url} from branch {branch}.",
        timestamp=datetime.utcnow()
    ))
    db.commit()
    return FixPrResponse(
        status="created",
        branch=branch,
        pr_url=pr_url,
        message="Remediation branch pushed and pull request opened.",
    )

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

@router.get("/{analysis_id}/code-inspector", response_model=CodeInspectorResponse)
def get_code_inspector(analysis_id: int, db: Session = Depends(get_db)):
    """Returns scanned source code and line annotations for the report inspector."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    project = analysis.project
    if not project or not project.repo_path or not os.path.isdir(project.repo_path):
        raise HTTPException(status_code=404, detail="Project repository path not found.")

    gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
    files = {}
    for gap in gaps:
        parsed = _parse_code_location(gap.code_location or "")
        if not parsed:
            continue

        resolved_file = _resolve_repo_file(project.repo_path, parsed["file_path"])
        if not resolved_file:
            continue

        annotation_lines = []
        if parsed["start_line"] is not None:
            annotation_lines = range(parsed["start_line"], (parsed["end_line"] or parsed["start_line"]) + 1)

        file_entry = files.setdefault(resolved_file, [])
        for line_number in annotation_lines:
            file_entry.append({
                "line_number": line_number,
                "status": gap.status,
                "description": gap.gap_description or gap.evidence or gap.requirement.title,
                "code_location": gap.code_location,
            })

    if not files:
        raise HTTPException(status_code=404, detail="No readable code references found for this analysis.")

    selected_file = max(files, key=lambda path: len(files[path]))
    with open(selected_file, "r", encoding="utf-8", errors="replace") as source_file:
        code = source_file.read()

    annotations = sorted(files[selected_file], key=lambda annotation: annotation["line_number"])
    return CodeInspectorResponse(
        file_path=_display_repo_path(project.repo_path, selected_file),
        code=code,
        annotations=annotations,
    )

@router.get("/{analysis_id}/audit-log", response_model=List[AuditLogResponse])
def get_analysis_audit(analysis_id: int, db: Session = Depends(get_db)):
    """Gets the execution log entries for this scan."""
    # Ensure analysis exists
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
        
    logs = db.query(AuditLog).filter(AuditLog.analysis_id == analysis_id).order_by(AuditLog.timestamp.asc()).all()
    return logs
