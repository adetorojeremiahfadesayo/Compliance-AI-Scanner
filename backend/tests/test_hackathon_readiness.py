import os
import sys
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.models.database import (
    Base,
    get_db,
    Project,
    Regulation,
    Requirement,
    Analysis,
    ComplianceGap,
    AuditLog,
)


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "readiness.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal
    app.dependency_overrides.clear()


def seed_completed_analysis(SessionLocal):
    db = SessionLocal()
    project = Project(
        name="Checkout API",
        repo_url="https://github.com/example/checkout-api",
        language="Python",
        status="active",
    )
    regulation = Regulation(
        name="GDPR Article 32",
        source="GDPR",
        version="2016/679",
        full_text="Security of processing requires appropriate technical measures.",
    )
    db.add_all([project, regulation])
    db.commit()
    db.refresh(project)
    db.refresh(regulation)

    requirement = Requirement(
        regulation_id=regulation.id,
        article_reference="Article 32(1)(a)",
        title="Password & PII Encryption",
        description="Passwords must not be stored in plaintext.",
        technical_requirement="Use bcrypt or argon2 for password hashing.",
        severity="critical",
        category="security",
        verification_criteria="Check for strong password hashing.",
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    analysis = Analysis(
        project_id=project.id,
        regulation_id=regulation.id,
        status="complete",
        overall_score=50.0,
        model_provider="Qwen Cloud",
        model_names="qwen-max, qwen-plus",
        token_usage='{"input_tokens": 100, "output_tokens": 25, "total_tokens": 125}',
        remediation_approval_status="pending_review",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    gap = ComplianceGap(
        analysis_id=analysis.id,
        requirement_id=requirement.id,
        status="partial",
        evidence="password_hash helper detected, encryption-at-rest missing",
        gap_description="PII encryption-at-rest is not implemented.",
        remediation_plan="Add field encryption for sensitive profile data.",
        code_location="app/models.py:L42",
        priority="high",
    )
    db.add(gap)
    db.commit()
    db.refresh(analysis)
    db.close()
    return analysis.id


def test_list_analyses_returns_real_scan_metadata(client):
    test_client, SessionLocal = client
    analysis_id = seed_completed_analysis(SessionLocal)

    response = test_client.get("/api/analysis")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["id"] == analysis_id
    assert payload[0]["project"]["name"] == "Checkout API"
    assert payload[0]["regulation"]["name"] == "GDPR Article 32"
    assert payload[0]["model_provider"] == "Qwen Cloud"
    assert payload[0]["model_names"] == "qwen-max, qwen-plus"
    assert payload[0]["remediation_approval_status"] == "pending_review"
    assert payload[0]["gaps"][0]["priority"] == "high"


def test_approve_remediation_records_human_review(client):
    test_client, SessionLocal = client
    analysis_id = seed_completed_analysis(SessionLocal)

    response = test_client.post(
        f"/api/analysis/{analysis_id}/approve-remediation",
        json={"note": "Reviewed by compliance lead for demo submission."},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["remediation_approval_status"] == "approved"
    assert payload["remediation_approval_note"] == "Reviewed by compliance lead for demo submission."
    assert payload["remediation_approved_at"] is not None

    db = SessionLocal()
    approval_log = (
        db.query(AuditLog)
        .filter(AuditLog.analysis_id == analysis_id, AuditLog.action == "remediation_approved")
        .one()
    )
    assert approval_log.agent_name == "HumanReviewer"
    assert "compliance lead" in approval_log.details
    db.close()


def test_report_includes_qwen_metadata_and_approval_state(client):
    test_client, SessionLocal = client
    analysis_id = seed_completed_analysis(SessionLocal)

    response = test_client.get(f"/api/reports/analysis/{analysis_id}/report")

    assert response.status_code == 200
    markdown = response.text
    assert "Qwen Cloud" in markdown
    assert "qwen-max, qwen-plus" in markdown
    assert "pending_review" in markdown
