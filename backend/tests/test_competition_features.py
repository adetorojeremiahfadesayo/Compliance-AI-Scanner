import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.main import app
from app.models.database import (
    Base,
    get_db,
    Project,
    Regulation,
    Requirement,
    Analysis,
    ComplianceGap,
)


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "competition.db"
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


def seed_project_regulation(SessionLocal):
    db = SessionLocal()
    project = Project(
        name="Checkout API",
        repo_url="https://github.com/example/checkout-api",
        language="Python",
        status="active",
    )
    regulation = Regulation(
        name="GDPR Article 17 and 32",
        source="GDPR",
        version="2016/679",
        full_text="Right to erasure and security of processing.",
    )
    db.add_all([project, regulation])
    db.commit()
    db.refresh(project)
    db.refresh(regulation)

    req_delete = Requirement(
        regulation_id=regulation.id,
        article_reference="Article 17(1)",
        title="Automated Data Erasure Endpoint",
        description="Users must be able to delete their personal data.",
        technical_requirement="Provide a DELETE endpoint for profile erasure.",
        severity="critical",
        category="deletion",
        verification_criteria="Check for DELETE profile route.",
    )
    req_security = Requirement(
        regulation_id=regulation.id,
        article_reference="Article 32(1)(a)",
        title="Password & PII Encryption",
        description="Passwords must not be stored in plaintext.",
        technical_requirement="Hash passwords and encrypt sensitive fields.",
        severity="critical",
        category="security",
        verification_criteria="Check for bcrypt or argon2.",
    )
    db.add_all([req_delete, req_security])
    db.commit()
    db.refresh(req_delete)
    db.refresh(req_security)
    project_id = project.id
    regulation_id = regulation.id
    req_delete_id = req_delete.id
    req_security_id = req_security.id
    db.close()
    return project_id, regulation_id, req_delete_id, req_security_id


def create_analysis(SessionLocal, project_id, regulation_id, gaps):
    db = SessionLocal()
    analysis = Analysis(
        project_id=project_id,
        regulation_id=regulation_id,
        status="complete",
        overall_score=50.0,
        model_provider="Qwen Cloud",
        model_names=f"{settings.QWEN_MAX_MODEL}, {settings.QWEN_PLUS_MODEL}",
        token_usage='{"input_tokens": 25, "output_tokens": 10, "total_tokens": 35}',
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    for gap_data in gaps:
        db.add(ComplianceGap(analysis_id=analysis.id, **gap_data))
    db.commit()
    db.refresh(analysis)
    analysis_id = analysis.id
    db.close()
    return analysis_id


def test_deployment_proof_exposes_alibaba_and_qwen_metadata(client):
    test_client, _ = client

    response = test_client.get("/api/deployment-proof")

    assert response.status_code == 200
    payload = response.json()
    assert payload["deployment_provider"] == "Alibaba Cloud"
    assert payload["qwen_base_url"].endswith("/compatible-mode/v1")
    assert settings.QWEN_MAX_MODEL in payload["models"]
    assert settings.QWEN_PLUS_MODEL in payload["models"]
    assert settings.QWEN_TURBO_MODEL in payload["models"]
    assert "api_key_configured" in payload


def test_patch_export_returns_diff_with_remediation_context(client):
    test_client, SessionLocal = client
    project_id, regulation_id, req_delete_id, _ = seed_project_regulation(SessionLocal)
    analysis_id = create_analysis(SessionLocal, project_id, regulation_id, [
        {
            "requirement_id": req_delete_id,
            "status": "non_compliant",
            "evidence": "No DELETE route found.",
            "gap_description": "Missing profile erasure route.",
            "remediation_plan": "Add DELETE /api/profile/<user_id> and purge user PII.",
            "code_location": "app.py:L45",
            "priority": "critical",
            "agent_name": "RemediationEngine",
        }
    ])

    response = test_client.get(f"/api/reports/analysis/{analysis_id}/patch")

    assert response.status_code == 200
    assert "text/x-diff" in response.headers["content-type"]
    assert "diff --git" in response.text
    assert "Add DELETE /api/profile/<user_id>" in response.text
    assert "Generated by RemediationEngine" in response.text


def test_demo_scan_endpoint_creates_complete_sample_with_agent_evidence(client):
    test_client, _ = client

    response = test_client.post("/api/analysis/demo")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "complete"
    assert payload["project"]["name"] == "Demo Flask Compliance App"
    assert payload["model_provider"] == "Qwen Cloud"
    assert len(payload["gaps"]) >= 2
    assert {gap["agent_name"] for gap in payload["gaps"]} >= {"GapDetector", "RemediationEngine"}


@pytest.mark.parametrize(
    "codebase_id,country_id,expected_project,expected_industry",
    [
        ("neobank", "de", "NeoBank API", "Banking & FinTech"),
        ("streamvault", "gb", "StreamVault", "Entertainment & Media"),
        ("cargotrack", "sg", "CargoTrack", "Shipping & Logistics"),
    ],
)
def test_industry_demo_scan_endpoint_creates_durable_country_specific_report(
    client,
    codebase_id,
    country_id,
    expected_project,
    expected_industry,
):
    test_client, _ = client

    response = test_client.post(f"/api/analysis/demo/{codebase_id}?country_id={country_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "complete"
    assert payload["project"]["name"] == expected_project
    assert payload["industry_label"] == expected_industry
    assert payload["country_label"]
    assert payload["country_flag"]
    assert payload["framework"]
    assert payload["authority"]
    assert payload["totalGaps"] >= 1
    assert payload["criticalGaps"] >= 1
    assert len(payload["gaps"]) == payload["totalGaps"]
    assert {gap["agent_name"] for gap in payload["gaps"]} >= {"GeoRegulator", "GapDetector", "RemediationEngine"}

    persisted = test_client.get(f"/api/analysis/{payload['id']}")
    assert persisted.status_code == 200
    persisted_payload = persisted.json()
    assert persisted_payload["project"]["name"] == expected_project
    assert persisted_payload["industry_label"] == expected_industry
    assert persisted_payload["framework"] == payload["framework"]


def test_industry_demo_scan_endpoint_supports_a_passing_confidence_path(client):
    test_client, _ = client

    response = test_client.post("/api/analysis/demo/cargotrack?country_id=sg")

    assert response.status_code == 200
    payload = response.json()
    assert payload["overall_score"] >= 60
    assert payload["confidence_status"] == "good"


def test_regression_check_compares_against_previous_analysis(client):
    test_client, SessionLocal = client
    project_id, regulation_id, req_delete_id, req_security_id = seed_project_regulation(SessionLocal)
    create_analysis(SessionLocal, project_id, regulation_id, [
        {
            "requirement_id": req_delete_id,
            "status": "compliant",
            "evidence": "DELETE route exists.",
            "gap_description": "",
            "remediation_plan": "",
            "code_location": "app.py:L40",
            "priority": "low",
            "agent_name": "GapDetector",
        },
        {
            "requirement_id": req_security_id,
            "status": "partial",
            "evidence": "bcrypt exists.",
            "gap_description": "Encryption-at-rest missing.",
            "remediation_plan": "Add field encryption.",
            "code_location": "app.py:L12",
            "priority": "high",
            "agent_name": "GapDetector",
        },
    ])
    current_id = create_analysis(SessionLocal, project_id, regulation_id, [
        {
            "requirement_id": req_delete_id,
            "status": "non_compliant",
            "evidence": "DELETE route removed.",
            "gap_description": "Erasure endpoint is missing.",
            "remediation_plan": "Restore DELETE endpoint.",
            "code_location": "app.py:L40",
            "priority": "critical",
            "agent_name": "MonitorAgent",
        },
        {
            "requirement_id": req_security_id,
            "status": "compliant",
            "evidence": "bcrypt and encryption exist.",
            "gap_description": "",
            "remediation_plan": "",
            "code_location": "app.py:L12",
            "priority": "low",
            "agent_name": "MonitorAgent",
        },
    ])

    response = test_client.post(f"/api/analysis/{current_id}/regression-check")

    assert response.status_code == 200
    payload = response.json()
    assert payload["baseline_analysis_id"] is not None
    assert payload["current_analysis_id"] == current_id
    assert payload["new_regressions"][0]["article_reference"] == "Article 17(1)"
    assert payload["resolved_gaps"][0]["article_reference"] == "Article 32(1)(a)"


def test_code_inspector_returns_scanned_file_annotations(client, tmp_path):
    test_client, SessionLocal = client
    project_id, regulation_id, req_delete_id, req_security_id = seed_project_regulation(SessionLocal)
    repo_dir = tmp_path / "checkout-api"
    repo_dir.mkdir()
    app_file = repo_dir / "app.py"
    app_file.write_text(
        "\n".join([
            "from flask import Flask",
            "app = Flask(__name__)",
            "password = request.json['password']",
            "db.session.add(password)",
            "print('safe event')",
            "print(request.json['email'])",
        ]),
        encoding="utf-8",
    )

    db = SessionLocal()
    project = db.query(Project).filter(Project.id == project_id).one()
    project.repo_path = str(repo_dir)
    db.commit()
    db.close()

    analysis_id = create_analysis(SessionLocal, project_id, regulation_id, [
        {
            "requirement_id": req_security_id,
            "status": "non_compliant",
            "evidence": "Password is stored directly.",
            "gap_description": "Plaintext password storage.",
            "remediation_plan": "Hash passwords before persistence.",
            "code_location": "app.py:L3-L4",
            "priority": "critical",
            "agent_name": "GapDetector",
        },
        {
            "requirement_id": req_delete_id,
            "status": "partial",
            "evidence": "Email is printed.",
            "gap_description": "PII is logged.",
            "remediation_plan": "Remove raw PII logging.",
            "code_location": "app.py:L6",
            "priority": "high",
            "agent_name": "GapDetector",
        },
    ])

    response = test_client.get(f"/api/analysis/{analysis_id}/code-inspector")

    assert response.status_code == 200
    payload = response.json()
    assert payload["file_path"] == "app.py"
    assert "password = request.json" in payload["code"]
    annotations = {annotation["line_number"]: annotation for annotation in payload["annotations"]}
    assert set(annotations) == {3, 4, 6}
    assert annotations[3]["status"] == "non_compliant"
    assert annotations[3]["description"] == "Plaintext password storage."
    assert annotations[6]["status"] == "partial"
