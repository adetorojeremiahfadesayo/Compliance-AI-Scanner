# Code Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the report page's hardcoded demo code inspector with actual scanned file content and line annotations for the selected analysis.

**Architecture:** Add a backend analysis endpoint that derives inspector data from `Analysis.project.repo_path` and each gap's `code_location`. The frontend calls that endpoint from `ReportView.jsx` and passes the returned code and annotations into the existing `CodeViewer`.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, Vite.

## Global Constraints

- Keep the change scoped to the report inspector.
- Do not add new runtime dependencies.
- Preserve existing demo fallback behavior when the backend is unavailable.
- Never read files outside the selected project's `repo_path`.

---

### Task 1: Backend Inspector Endpoint

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/api/analysis.py`
- Test: `backend/tests/test_competition_features.py`

**Interfaces:**
- Produces: `GET /api/analysis/{analysis_id}/code-inspector`
- Produces response shape:

```json
{
  "file_path": "app.py",
  "code": "file contents",
  "annotations": [
    {
      "line_number": 12,
      "status": "non_compliant",
      "description": "Plaintext password storage",
      "code_location": "app.py:L12"
    }
  ]
}
```

- [ ] **Step 1: Write the failing test**

Add a test that creates a temporary project repo with `app.py`, stores gaps with `app.py:L3-L4` and `app.py:L6`, then asserts the endpoint returns the file content and line annotations for lines 3, 4, and 6.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_competition_features.py::test_code_inspector_returns_scanned_file_annotations -q`
Expected: FAIL with `404 Not Found`.

- [ ] **Step 3: Write minimal implementation**

Add Pydantic response models, parse safe `code_location` values, select the first readable referenced file, expand line ranges into annotations, and reject path traversal by resolving paths under `project.repo_path`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_competition_features.py::test_code_inspector_returns_scanned_file_annotations -q`
Expected: PASS.

### Task 2: Frontend Wiring

**Files:**
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/pages/ReportView.jsx`

**Interfaces:**
- Consumes: `api.getCodeInspector(id)` returning the backend response shape from Task 1.
- Produces: live `CodeViewer` props from selected analysis data, with mock fallback only on failed loads.

- [ ] **Step 1: Add service method**

Add `getCodeInspector(id)` to `frontend/src/services/api.js`, calling `/analysis/${id}/code-inspector`.

- [ ] **Step 2: Wire report state**

In `ReportView.jsx`, replace hardcoded `MOCK_CODE` and `MOCK_ANNOTATIONS` usage with `inspector.code`, `inspector.annotations`, and `inspector.file_path`.

- [ ] **Step 3: Preserve fallback**

If report loading fails, keep the existing mock data so the visual preview still renders.

- [ ] **Step 4: Run frontend build**

Run: `npm run build` in `frontend`.
Expected: build completes.

### Task 3: Verification

**Files:**
- No additional files.

**Interfaces:**
- Consumes: implemented backend endpoint and frontend wiring.
- Produces: verified passing targeted backend test and frontend production build.

- [ ] **Step 1: Run targeted backend tests**

Run: `python -m pytest backend/tests/test_competition_features.py -q`
Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `npm run build` in `frontend`.
Expected: PASS.
