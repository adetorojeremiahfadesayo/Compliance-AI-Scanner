# tests/test_run.py
import asyncio
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import init_db, SessionLocal, Project, Regulation, Requirement, Analysis, ComplianceGap, AuditLog
from app.agents.orchestrator import orchestrator
from app.models.schemas import AnalysisProgress

async def progress_printer(progress: AnalysisProgress):
    print(f"[{progress.stage}] Progress: {progress.progress_pct}% - {progress.message}")

async def main():
    print("Initializing compliance database...")
    init_db()
    
    db = SessionLocal()
    
    # 1. Clean existing records to start fresh
    db.query(ComplianceGap).delete()
    db.query(AuditLog).delete()
    db.query(Analysis).delete()
    db.query(Project).delete()
    db.query(Requirement).delete()
    db.query(Regulation).delete()
    db.commit()
    
    # 2. Create local project record
    demo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "demo-repo")
    print(f"Creating project record pointing to local path: {demo_path}")
    project = Project(
        name="Demo-Flask-App",
        repo_url=None,
        repo_path=demo_path,
        language="Python",
        status="active"
    )
    db.add(project)
    
    # 3. Create mock regulation template matching GDPR Article 17 & 32
    print("Creating Regulation template record...")
    regulation = Regulation(
        name="GDPR Article 17 & 32 Audit",
        source="GDPR",
        version="2016/679",
        full_text=(
            "Article 17: Right to Erasure ('Right to be Forgotten'). The user has the right to obtain the erasure "
            "of their personal data without undue delay. The controller has the obligation to erase personal data "
            "without undue delay where the data is no longer necessary, or consent is withdrawn.\n"
            "Article 32: Security of Processing. The controller and processor shall implement appropriate technical "
            "measures to ensure a level of security appropriate to risk, including password hashing, encryption of "
            "personal data, and avoiding logs leakage."
        )
    )
    db.add(regulation)
    db.commit()
    db.refresh(project)
    db.refresh(regulation)
    
    # 4. Create analysis task
    print("Creating Analysis task...")
    analysis = Analysis(
        project_id=project.id,
        regulation_id=regulation.id,
        status="pending",
        overall_score=0.0
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    # 5. Execute orchestrator pipeline
    print(f"Launching compliance scan for analysis ID: {analysis.id}...")
    try:
        await orchestrator.run(analysis.id, progress_printer)
        
        # 6. Fetch results
        db.refresh(analysis)
        print("\n==================================================")
        print("SCAN EXECUTION COMPLETED")
        print(f"Status: {analysis.status}")
        print(f"Overall Score: {analysis.overall_score:.1f}%")
        print("==================================================")
        
        print("\nAudit Logs:")
        logs = db.query(AuditLog).filter(AuditLog.analysis_id == analysis.id).order_by(AuditLog.timestamp.asc()).all()
        for log in logs:
            print(f"  [{log.timestamp.strftime('%H:%M:%S')}] {log.agent_name} - {log.action}: {log.details}")
            
        print("\nCompliance Gaps Discovered:")
        gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis.id).all()
        for gap in gaps:
            req = gap.requirement
            print(f"  - [{req.article_reference}] {req.title}: {gap.status.upper()}")
            print(f"    Gap: {gap.gap_description}")
            print(f"    Location: {gap.code_location}")
            print(f"    Priority: {gap.priority.upper()}")
            print("    Remediation:")
            print(f"      {gap.remediation_plan}")
            print("    ----------------------------------------------")
            
    except Exception as e:
        print(f"Pipeline execution failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure event loop runs correctly
    asyncio.run(main())
