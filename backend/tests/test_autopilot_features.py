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
)


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
