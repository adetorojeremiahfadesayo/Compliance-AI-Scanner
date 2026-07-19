import os
import sys
from datetime import datetime

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
from app.agents import remediation_engine as remediation_engine_module


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "autopilot_features.db"
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


def seed_project(SessionLocal, repo_url="https://github.com/example/checkout-api"):
    db = SessionLocal()
    project = Project(name="Checkout API", repo_url=repo_url, language="Python", status="active")
    db.add(project)
    db.commit()
    db.refresh(project)
    project_id = project.id
    db.close()
    return project_id


def seed_regulation(SessionLocal):
    db = SessionLocal()
    regulation = Regulation(
        name="GDPR Article 17 and 32",
        source="GDPR",
        version="2016/679",
        full_text="Right to erasure and security of processing.",
    )
    db.add(regulation)
    db.commit()
    db.refresh(regulation)
    regulation_id = regulation.id
    db.close()
    return regulation_id


def seed_completed_analysis(SessionLocal, project_id, regulation_id, score, approved=False):
    db = SessionLocal()
    analysis = Analysis(
        project_id=project_id,
        regulation_id=regulation_id,
        status="complete",
        overall_score=score,
        model_provider="Qwen Cloud",
        model_names=f"{settings.QWEN_MAX_MODEL}, {settings.QWEN_PLUS_MODEL}",
        remediation_approval_status="approved" if approved else "pending_review",
        completed_at=datetime.utcnow(),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    analysis_id = analysis.id
    db.close()
    return analysis_id


# --- rule-pack -> Regulation -------------------------------------------------

def test_from_rule_pack_creates_regulation_with_requirements(client):
    test_client, SessionLocal = client

    response = test_client.post("/api/regulations/from-rule-pack?industry=banking&country=de")

    assert response.status_code == 200
    payload = response.json()
    assert "BaFin" in payload["name"] or "GDPR" in payload["name"]

    db = SessionLocal()
    requirements = db.query(Requirement).filter(Requirement.regulation_id == payload["id"]).all()
    db.close()
    assert len(requirements) > 0


def test_from_rule_pack_is_idempotent(client):
    test_client, _ = client

    first = test_client.post("/api/regulations/from-rule-pack?industry=banking&country=de")
    second = test_client.post("/api/regulations/from-rule-pack?industry=banking&country=de")

    assert first.json()["id"] == second.json()["id"]


def test_from_rule_pack_404_for_unknown_combo(client):
    test_client, _ = client

    response = test_client.post("/api/regulations/from-rule-pack?industry=banking&country=zz")

    assert response.status_code == 404


# --- multi-framework scan -----------------------------------------------------

def test_multi_analysis_creates_one_analysis_per_regulation(client, monkeypatch):
    # Stub the orchestrator so the background task doesn't attempt a real git
    # clone of a repo URL that doesn't exist and doesn't hit the Qwen API.
    from app.agents.orchestrator import orchestrator

    async def _noop_run(analysis_id, progress_callback=None):
        return None

    monkeypatch.setattr(orchestrator, "run", _noop_run)

    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)
    reg_a = seed_regulation(SessionLocal)
    reg_b_resp = test_client.post("/api/regulations/from-rule-pack?industry=banking&country=de")
    reg_b = reg_b_resp.json()["id"]

    response = test_client.post("/api/analysis/multi", json={
        "project_id": project_id,
        "regulation_ids": [reg_a, reg_b],
    })

    assert response.status_code == 200
    analyses = response.json()
    assert len(analyses) == 2
    assert {a["regulation_id"] for a in analyses} == {reg_a, reg_b}


def test_multi_analysis_404_on_missing_regulation(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)

    response = test_client.post("/api/analysis/multi", json={
        "project_id": project_id,
        "regulation_ids": [999999],
    })

    assert response.status_code == 404


# --- CI badge + gate -----------------------------------------------------------

def test_badge_is_grey_when_unscanned(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)

    response = test_client.get(f"/api/projects/{project_id}/badge.svg")

    assert response.status_code == 200
    assert "#9f9f9f" in response.text
    assert "unscanned" in response.text


def test_badge_is_green_when_passing(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)
    regulation_id = seed_regulation(SessionLocal)
    seed_completed_analysis(SessionLocal, project_id, regulation_id, score=85.0)

    response = test_client.get(f"/api/projects/{project_id}/badge.svg")

    assert response.status_code == 200
    assert "#3fb950" in response.text
    assert "85%" in response.text


def test_ci_status_reports_passing_and_failing(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)
    regulation_id = seed_regulation(SessionLocal)
    seed_completed_analysis(SessionLocal, project_id, regulation_id, score=45.0)

    response = test_client.get(f"/api/projects/{project_id}/ci-status?threshold=60")

    assert response.status_code == 200
    payload = response.json()
    assert payload["passing"] is False
    assert payload["score"] == 45.0


def test_ci_status_with_no_scan_reports_not_passing(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)

    response = test_client.get(f"/api/projects/{project_id}/ci-status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["passing"] is False
    assert payload["score"] is None


# --- monitoring toggle -----------------------------------------------------

def test_monitoring_toggle_enables_and_disables(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)

    enable = test_client.post(f"/api/projects/{project_id}/monitoring", json={
        "enabled": True, "interval_minutes": 30,
    })
    assert enable.status_code == 200
    assert enable.json()["monitor_enabled"] is True
    assert enable.json()["monitor_interval_minutes"] == 30

    disable = test_client.post(f"/api/projects/{project_id}/monitoring", json={
        "enabled": False,
    })
    assert disable.status_code == 200
    assert disable.json()["monitor_enabled"] is False


# --- auto-PR toggle ---------------------------------------------------------

def test_auto_pr_toggle_enables_and_disables(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)

    enable = test_client.post(f"/api/projects/{project_id}/auto-pr", json={"enabled": True})
    assert enable.status_code == 200
    assert enable.json()["auto_approve_remediation"] is True

    disable = test_client.post(f"/api/projects/{project_id}/auto-pr", json={"enabled": False})
    assert disable.status_code == 200
    assert disable.json()["auto_approve_remediation"] is False


# --- API access token gate ---------------------------------------------------

def test_api_access_token_gate_blocks_and_allows(client, monkeypatch):
    test_client, _ = client
    monkeypatch.setattr(settings, "API_ACCESS_TOKEN", "expected-secret")

    unauthenticated = test_client.get("/api/projects")
    assert unauthenticated.status_code == 401

    wrong_token = test_client.get("/api/projects", headers={"X-API-Token": "wrong"})
    assert wrong_token.status_code == 401

    authenticated = test_client.get("/api/projects", headers={"X-API-Token": "expected-secret"})
    assert authenticated.status_code == 200


def test_deployment_proof_stays_public_when_token_configured(client, monkeypatch):
    test_client, _ = client
    monkeypatch.setattr(settings, "API_ACCESS_TOKEN", "expected-secret")

    response = test_client.get("/api/deployment-proof")

    assert response.status_code == 200


# --- fix PR guardrails -----------------------------------------------------

def test_create_fix_pr_rejects_unapproved_remediation(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal)
    regulation_id = seed_regulation(SessionLocal)
    analysis_id = seed_completed_analysis(SessionLocal, project_id, regulation_id, score=50.0, approved=False)

    response = test_client.post(f"/api/analysis/{analysis_id}/create-fix-pr")

    assert response.status_code == 400
    assert "approved" in response.json()["detail"].lower()


def test_create_fix_pr_rejects_project_without_repo_url(client):
    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal, repo_url=None)
    regulation_id = seed_regulation(SessionLocal)
    analysis_id = seed_completed_analysis(SessionLocal, project_id, regulation_id, score=50.0, approved=True)

    response = test_client.post(f"/api/analysis/{analysis_id}/create-fix-pr")

    assert response.status_code == 400
    assert "repository" in response.json()["detail"].lower()


# --- real code-fix generation -----------------------------------------------

def test_generate_fixes_produces_real_diff_and_persists(client, monkeypatch, tmp_path):
    test_client, SessionLocal = client

    repo_dir = tmp_path / "demo-repo"
    repo_dir.mkdir()
    vulnerable_file = repo_dir / "app.py"
    original_source = "def register(password):\n    user.password = password\n    save(user)\n"
    vulnerable_file.write_text(original_source, encoding="utf-8")

    project_id = seed_project(SessionLocal)
    db = SessionLocal()
    project = db.query(Project).filter(Project.id == project_id).first()
    project.repo_path = str(repo_dir)
    db.commit()
    db.close()

    regulation_id = seed_regulation(SessionLocal)
    analysis_id = seed_completed_analysis(SessionLocal, project_id, regulation_id, score=40.0, approved=False)

    db = SessionLocal()
    requirement = Requirement(
        regulation_id=regulation_id,
        article_reference="Article 32(1)(a)",
        title="Password Hashing",
        description="Passwords must not be stored in plaintext.",
        technical_requirement="Use bcrypt or argon2.",
        severity="critical",
        category="security",
        verification_criteria="Check password storage.",
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    gap = ComplianceGap(
        analysis_id=analysis_id,
        requirement_id=requirement.id,
        status="non_compliant",
        evidence="password stored in plaintext",
        gap_description="User passwords are stored without hashing.",
        remediation_plan="Hash the password with bcrypt before saving it.",
        code_location="app.py:L2",
        priority="critical",
        agent_name="GapDetector",
    )
    db.add(gap)
    db.commit()
    db.refresh(gap)
    gap_id = gap.id
    db.close()

    corrected_source = "def register(password):\n    user.password = hash_password(password)\n    save(user)\n"

    async def fake_generate_code_fix(**kwargs):
        return corrected_source

    monkeypatch.setattr(
        remediation_engine_module.remediation_engine_agent,
        "generate_code_fix",
        fake_generate_code_fix,
    )

    response = test_client.post(f"/api/analysis/{analysis_id}/generate-fixes", json={"gap_ids": [gap_id]})

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["has_fix"] is True
    assert results[0]["file_path"] == "app.py"
    assert "hash_password" in results[0]["diff"]

    # Persisted on the gap, and re-fetchable without regenerating.
    fetched = test_client.get(f"/api/analysis/{analysis_id}/code-fixes")
    assert fetched.status_code == 200
    fetched_results = fetched.json()
    assert len(fetched_results) == 1
    assert fetched_results[0]["has_fix"] is True
    assert "hash_password" in fetched_results[0]["diff"]


def test_generate_fixes_skips_gap_when_model_declines(client, monkeypatch, tmp_path):
    test_client, SessionLocal = client

    repo_dir = tmp_path / "demo-repo"
    repo_dir.mkdir()
    (repo_dir / "app.py").write_text("password = 'x'\n", encoding="utf-8")

    project_id = seed_project(SessionLocal)
    db = SessionLocal()
    project = db.query(Project).filter(Project.id == project_id).first()
    project.repo_path = str(repo_dir)
    db.commit()
    db.close()

    regulation_id = seed_regulation(SessionLocal)
    analysis_id = seed_completed_analysis(SessionLocal, project_id, regulation_id, score=40.0)

    db = SessionLocal()
    requirement = Requirement(
        regulation_id=regulation_id,
        article_reference="Article 32(1)(a)",
        title="Password Hashing",
        description="x",
        technical_requirement="x",
        severity="critical",
        category="security",
        verification_criteria="x",
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    gap = ComplianceGap(
        analysis_id=analysis_id,
        requirement_id=requirement.id,
        status="non_compliant",
        remediation_plan="Hash it.",
        code_location="app.py:L1",
        priority="critical",
    )
    db.add(gap)
    db.commit()
    db.refresh(gap)
    gap_id = gap.id
    db.close()

    async def declining_fix(**kwargs):
        return None

    monkeypatch.setattr(
        remediation_engine_module.remediation_engine_agent,
        "generate_code_fix",
        declining_fix,
    )

    response = test_client.post(f"/api/analysis/{analysis_id}/generate-fixes", json={"gap_ids": [gap_id]})

    assert response.status_code == 200
    results = response.json()
    assert results[0]["has_fix"] is False
    assert results[0]["error"]


# --- GitHub push webhook -----------------------------------------------------

def test_webhook_ignores_unmatched_repository(client):
    test_client, _ = client

    response = test_client.post("/api/webhooks/github", json={
        "repository": {"clone_url": "https://github.com/nobody/nothing.git"}
    })

    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


def test_webhook_ignores_project_with_no_prior_scan(client):
    test_client, SessionLocal = client
    seed_project(SessionLocal, repo_url="https://github.com/example/checkout-api")

    response = test_client.post("/api/webhooks/github", json={
        "repository": {"clone_url": "https://github.com/example/checkout-api.git"}
    })

    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


def test_webhook_triggers_rescan_for_matched_project(client, monkeypatch):
    # The endpoint schedules the real orchestrator pipeline as a background task,
    # which would otherwise hit the network (git clone + Qwen API). Stub it out
    # so this test only verifies the webhook's own matching/dispatch logic.
    from app.agents.orchestrator import orchestrator

    async def _noop_run(analysis_id, progress_callback=None):
        return None

    monkeypatch.setattr(orchestrator, "run", _noop_run)

    test_client, SessionLocal = client
    project_id = seed_project(SessionLocal, repo_url="https://github.com/example/checkout-api")
    regulation_id = seed_regulation(SessionLocal)
    seed_completed_analysis(SessionLocal, project_id, regulation_id, score=70.0)

    response = test_client.post("/api/webhooks/github", json={
        "repository": {"clone_url": "https://github.com/example/checkout-api.git"}
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "rescan_triggered"
    assert payload["analyses"][0]["project_id"] == project_id
