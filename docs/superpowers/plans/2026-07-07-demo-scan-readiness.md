# Demo Scan Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the industry/country demo scans durable, honest, and hackathon-ready.

**Architecture:** Keep the three demo codebases on disk and add a backend demo catalog that can seed completed analysis records for each codebase/country pair. The frontend wizard will launch those backend scans instead of relying on `sessionStorage`, while retaining a frontend fallback for presentation resilience.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, SQLite, React/Vite, existing pytest and ESLint checks.

## Global Constraints

- Preserve existing uncommitted work and do not revert user changes.
- Use curated source-backed rule packs for the hackathon MVP, not unsupported live legal scraping.
- Keep the pass/fail threshold at 60%.
- Keep three primary demo codebases: banking, shipping, and entertainment.

---

### Task 1: Backend Demo Catalog

**Files:**
- Create: `backend/app/services/demo_catalog.py`
- Modify: `backend/app/api/analysis.py`
- Modify: `backend/app/models/database.py`
- Modify: `backend/app/models/schemas.py`
- Test: `backend/tests/test_competition_features.py`

**Interfaces:**
- Produces: `get_demo_scan(codebase_id: str, country_id: str) -> dict | None`
- Produces: `POST /api/analysis/demo/{codebase_id}?country_id=<id>`
- Produces: analysis response metadata fields: `industry_label`, `country_label`, `country_flag`, `framework`, `authority`, `totalGaps`, `criticalGaps`

- [ ] Write tests that create durable demo scans for `neobank`, `streamvault`, and `cargotrack`.
- [ ] Run the targeted tests and confirm they fail before implementation.
- [ ] Implement the demo catalog and endpoint.
- [ ] Run the targeted tests and confirm they pass.

### Task 2: Frontend Durable Demo Flow

**Files:**
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/pages/NewAnalysis.jsx`
- Modify: `frontend/src/pages/AnalysisView.jsx`

**Interfaces:**
- Consumes: `api.createDemoAnalysisForCodebase(codebaseId, countryId)`
- Produces: navigation to `/analysis/<numeric-backend-id>` when backend is available

- [ ] Use the backend demo endpoint from the Launch button.
- [ ] Keep the existing session fallback only when the backend demo endpoint fails.
- [ ] Fix the two ESLint failures.

### Task 3: Source-Backed Copy and Passing Scenario

**Files:**
- Modify: `frontend/src/data/regulations.js`
- Modify: `frontend/src/pages/NewAnalysis.jsx`
- Modify: `frontend/src/components/ComplianceReportModal.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

**Interfaces:**
- Produces: visible wording that says source-backed rule pack rather than claiming unsupported live legal data.
- Produces: at least one passing demo path using the same three primary codebases.

- [ ] Add `sourceUrl` and `lastUpdated` metadata to each rule pack.
- [ ] Show source and timestamp in the wizard.
- [ ] Add at least one passing country score for a demo path.
- [ ] Make the modal describe `>=60%` as good and `<60%` as bad/high-risk.

### Task 4: Verification

**Files:**
- No production edits expected.

- [ ] Run backend tests.
- [ ] Run frontend lint.
- [ ] Run frontend build.
- [ ] Start the app and smoke-test the demo wizard and confidence modal.
