# Hackathon Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five requested Qwen Cloud Hackathon readiness improvements.

**Architecture:** Add backend metadata and approval fields to `Analysis`, expose them through schemas and endpoints, consume them from the React dashboard/report views, and add submission documentation. Keep the existing scan pipeline intact.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, SQLite, React, Vite, Markdown docs.

---

### Task 1: Backend Contract and Tests

**Files:**
- Create: `backend/tests/test_hackathon_readiness.py`
- Modify: `backend/app/models/database.py`
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/api/analysis.py`
- Modify: `backend/app/agents/orchestrator.py`
- Modify: `backend/app/api/reports.py`
- Modify: `backend/app/services/document_generator.py`

- [ ] Write failing tests for analysis listing, approval endpoint, and report metadata.
- [ ] Run the new tests and confirm they fail because fields/endpoints do not exist.
- [ ] Add database fields and SQLite column backfill.
- [ ] Add schemas for nested project/regulation, Qwen metadata, and approval status.
- [ ] Add `GET /api/analysis`.
- [ ] Add `POST /api/analysis/{analysis_id}/approve-remediation`.
- [ ] Persist Qwen model/token metadata at pipeline completion.
- [ ] Include metadata and approval status in generated Markdown reports.
- [ ] Run backend tests and confirm they pass.

### Task 2: Frontend Real Data and Approval UI

**Files:**
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/AnalysisView.jsx`
- Modify: `frontend/src/pages/ReportView.jsx`

- [ ] Add API client methods for listing analyses and approving remediation.
- [ ] Replace dashboard mock scan list with real analysis list and empty states.
- [ ] Derive dashboard stats from real project/analysis/gap data.
- [ ] Show Qwen Cloud model metadata on completed analysis and report pages.
- [ ] Add remediation approval badge and approval action.
- [ ] Run frontend lint/build and fix syntax issues.

### Task 3: Submission Documentation

**Files:**
- Create: `docs/HACKATHON_SUBMISSION.md`
- Create: `docs/ARCHITECTURE.md`
- Modify: `README.md`

- [ ] Add Track 4 positioning, demo video script, judging checklist, and deployment checklist.
- [ ] Add Mermaid architecture diagram.
- [ ] Update README with Qwen Cloud setup, demo flow, and hackathon notes.

### Task 4: Final Verification

- [ ] Run backend tests.
- [ ] Run frontend build.
- [ ] Report any remaining limitations clearly.
