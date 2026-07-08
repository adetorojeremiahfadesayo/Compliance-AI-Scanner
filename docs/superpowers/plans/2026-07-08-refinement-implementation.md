# Refinement Implementation Plan — 2026-07-08

Execution plan for the code-review findings from 2026-07-08. Written so a coding agent
can execute it top to bottom without extra context. Tasks are ordered by priority;
each phase is independently committable. Run the verification steps at the end of
every phase before moving to the next.

**Repo layout context:** FastAPI backend under `backend/app` (agents pipeline in
`backend/app/agents`, REST in `backend/app/api`, config in `backend/app/config.py`),
React/Vite frontend under `frontend/src`. Demo scans are seeded via
`POST /api/analysis/demo/{codebase_id}`; the real Qwen pipeline runs via
`POST /api/analysis` and streams progress over `ws://host:8000/ws/analysis/{id}`.

---

## Phase 1 — Finish the model upgrade (small, do first)

The commit `58c432f` bumped default model IDs to `qwen3.7-max` / `qwen3.7-plus` /
`qwen3.6-flash` but left stale references behind.

### Task 1.1 — Restore `backend/.env.example`

Recreate the file (it was deleted) with current variables:

```
DASHSCOPE_API_KEY=your-qwen-cloud-api-key
GITHUB_TOKEN=your-github-token-optional
DATABASE_URL=sqlite:///./compliance_autopilot.db
QWEN_MAX_MODEL=qwen3.7-max
QWEN_PLUS_MODEL=qwen3.7-plus
QWEN_TURBO_MODEL=qwen3.6-flash
```

### Task 1.2 — Remove hard-coded model-name strings

- `backend/app/api/analysis.py` line ~180 and ~298: both demo endpoints set
  `model_names="qwen-max, qwen-plus"`. Replace with
  `model_names=f"{settings.QWEN_MAX_MODEL}, {settings.QWEN_PLUS_MODEL}"` and add
  `from app.config import settings` to the imports.
- `backend/tests/test_competition_features.py` (deployment-proof test): replace the
  three literal assertions with assertions against `settings.QWEN_MAX_MODEL`,
  `settings.QWEN_PLUS_MODEL`, `settings.QWEN_TURBO_MODEL` (import settings in the test).
- `README.md`: update the `qwen-max` / `qwen-plus` mentions (lines ~9, 11, 12, 44) to
  the new model names, or rephrase to "the configured Qwen max/plus tier models".

**Acceptance:** `grep -rn "qwen-max\|qwen-plus" backend/ README.md` returns no
hard-coded model IDs outside of comments/docs history.

---

## Phase 2 — Wire the real scan pipeline back into the UI (highest value)

`api.startAnalysis` and `api.createProject` in `frontend/src/services/api.js` are
defined but never called. The wizard (`frontend/src/pages/NewAnalysis.jsx`) only
launches seeded demos. The live Qwen pipeline is the product's differentiator and
must be reachable.

### Task 2.1 — Add a "Scan your own repository" option to wizard step 3

In `NewAnalysis.jsx` step 3 ("Select Demo Codebase"):

- Add a mode toggle at the top of the step: **Demo codebase** (default, existing
  behavior) vs **My repository**.
- In "My repository" mode show a text input for a public GitHub URL. Validate with
  `/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/`. Store in new state `repoUrl`.
- `canProceed()` for step 3: `mode === 'demo' ? !!selectedCodebase : isValidRepoUrl`.
- Step 4 config summary: when in repo mode, show the repo URL instead of the demo
  codebase row.

### Task 2.2 — Launch the real pipeline

In `handleLaunch`, branch on mode. For repo mode:

1. `const reg = await api.loadTemplate(0);` — seeds/returns a GDPR regulation via
   the existing `POST /api/regulations/load-gdpr-template` endpoint. (Follow-up
   niceness, optional: pick the template whose scope best matches the selected
   industry if multiple templates exist.)
2. `const project = await api.createProject({ name: <repo name from URL>, repo_url: repoUrl, language: 'auto' });`
   — check `backend/app/models/schemas.py` `ProjectCreate` for exact required fields
   and match them.
3. `const analysis = await api.startAnalysis({ project_id: project.id, regulation_id: reg.id });`
4. `navigate(`/analysis/${analysis.id}`)`.

No `AnalysisView` changes needed: it already connects to the WebSocket for
non-complete analyses (line ~71) and re-fetches on `complete`.

For repo mode, do **not** fall back to sessionStorage fake data on error — show the
error inline (a red banner in step 4) so a failed real scan is never silently
replaced by a mock.

### Task 2.3 — Make the demo fallback honest

Still in `handleLaunch` (demo mode): the `catch` currently swallows every error and
navigates to sessionStorage fake data.

- Add `console.error('Backend demo seed failed, using offline demo:', err)` in the catch.
- Set a flag in the sessionStorage payload, e.g. `offlineDemo: true`, and in
  `AnalysisView.jsx` render a small badge near the header when it's set
  ("Offline demo mode — backend unavailable") so the fallback is visible, not silent.

### Task 2.4 — Serve rule packs from the backend instead of fake fetch theater

`NewAnalysis.jsx` `handleNext` (step 2) plays a 2.5 s scripted "Connecting to
source-backed compliance registry..." sequence over purely local data.

- Backend: add `GET /api/regulations/rule-pack?industry={id}&country={id}` in
  `backend/app/api/regulations.py`. Source of truth: port the rule-pack objects from
  `frontend/src/data/regulations.js` (`getRegulations`) into a JSON file at
  `backend/app/knowledge/rule_packs.json` and serve lookups from it. Return 404 for
  unknown combos.
- Frontend: in `handleNext`, `fetch` that endpoint; keep `frontend/src/data/regulations.js`
  `getRegulations` as the offline fallback if the request fails. Keep at most one short
  "Loading rule pack…" state; delete the scripted multi-step `setTimeout` loop.

**Acceptance for Phase 2:** with the backend running and a valid `DASHSCOPE_API_KEY`,
entering a public repo URL in the wizard produces a live analysis page whose stage
bar advances via WebSocket and ends with real gaps; killing the backend and running a
demo scan shows the offline badge.

---

## Phase 3 — Backend correctness fixes

### Task 3.1 — Per-analysis token usage

`backend/app/services/qwen_client.py` accumulates `total_input_tokens` /
`total_output_tokens` for the process lifetime; `orchestrator.py` line ~247 stores the
cumulative totals on each analysis.

- In `AnalysisOrchestrator.run`, snapshot `qwen_client.get_token_usage()` right after
  the analysis is loaded, and at the end store the per-key difference
  (`end[k] - start[k]`) as `analysis.token_usage`.

### Task 3.2 — Refresh repos on every scan

`orchestrator.py` line ~119 only clones when `project.repo_path` is unset, so rescans
(and the MonitorAgent regression check) run on a stale clone.

- Change the condition: when `project.repo_url` is set, always refresh — if
  `repo_path` exists and contains `.git`, run `git -C <path> pull --ff-only` (add a
  `pull_repo` method to `backend/app/services/github_service.py` mirroring
  `clone_repo`'s subprocess pattern); on pull failure, delete the directory and
  re-clone. Keep the pure-local-path case (no `repo_url`) untouched — demo repos
  are bundled and must not be pulled.

### Task 3.3 — Severity-weighted compliance score

`orchestrator.py` Stage 5 weights all requirements equally.

- Weight by requirement severity: `critical=4, high=3, medium=2, low=1`.
  `score = 100 * sum(weight_i * status_factor_i) / sum(weight_i)` where
  `status_factor` is 1.0 / 0.5 / 0.0 for compliant / partial / non_compliant.
- Update or add a unit test in `backend/tests/` pinning the formula with a
  mixed-severity fixture.

### Task 3.4 — Stop demo endpoints polluting the DB

Both `POST /analysis/demo` and `POST /analysis/demo/{codebase_id}` in
`backend/app/api/analysis.py` create new `Project` + `Regulation` (+ `Requirement`)
rows on every call.

- Get-or-create `Project` by `name` and `Regulation` by `name` + `version`; only seed
  `Requirement` rows when the regulation was just created. Each call may still create
  a new `Analysis` (that's the point — it enables regression checks between runs).

### Task 3.5 — Env-driven CORS

`backend/app/config.py` hard-codes localhost origins. `CORS_ORIGINS` is already a
pydantic-settings field, so a JSON-array env value works — verify by documenting it:
add `CORS_ORIGINS=["http://localhost:5173"]` example to `.env.example` and confirm
`Settings()` parses an env override (pydantic-settings parses JSON for list fields).
Keep localhost defaults for dev.

### Task 3.6 — Qwen client hardening (smaller, bundle in one commit)

In `backend/app/services/qwen_client.py`:

- Retry policy: don't retry auth failures. Catch `openai.AuthenticationError` /
  `openai.PermissionDeniedError` — change `retry_if_exception_type(Exception)` to
  retry only on `(openai.APIConnectionError, openai.RateLimitError, openai.APIStatusError)`
  or use `retry_if_not_exception_type((AuthenticationError, PermissionDeniedError))`.
- `chat_json`: before `json.loads`, strip markdown fences — if content starts with
  ```` ``` ````, remove the first fence line and trailing fence. Also try extracting
  the first `{...}` block via a lazy regex if a bare parse fails, before raising.

In `backend/app/agents/codebase_analyzer.py`:

- Replace the blind `static_findings[:15]` cap with a ranked cut: sort
  `static_findings` descending by `len(pii_fields) * 3 + len(data_operations) * 2 +
  len(structure.get("functions", []))` then take the top 15, so large repos surface
  their highest-signal files instead of the first 15 walked.

---

## Phase 4 — Frontend infrastructure

### Task 4.1 — Env-driven API + WebSocket base URLs

- `frontend/src/services/api.js`: replace the hard-coded
  `http://${host}:8000/api` with
  `const API_BASE = import.meta.env.VITE_API_BASE || '/api';`
- `frontend/src/services/websocket.js`: replace `ws://${host}:8000/ws/analysis` with
  `import.meta.env.VITE_WS_BASE || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/analysis``.
- `frontend/vite.config.js`: add a dev `server.proxy` for `/api` and `/ws` (ws: true)
  → `http://localhost:8000`, so the relative defaults work in dev.
- Add `frontend/.env.example` documenting `VITE_API_BASE` and `VITE_WS_BASE` for
  deployments where the API is on another host.
- Update `docker-compose.yml` / frontend Dockerfile if they rely on the old
  hard-coded port behavior (check and set build args accordingly).

### Task 4.2 (optional, lowest priority) — Extract repeated inline-style patterns

Do only if time allows. Extract into `frontend/src/index.css` classes or tiny
components: selectable card (used by industry, country, and codebase pickers in
`NewAnalysis.jsx`), stat chip (used across `AnalysisView.jsx` / `Dashboard.jsx`),
and the step indicator. Replace `onMouseEnter`/`onMouseLeave` style mutation with
CSS `:hover`. No visual changes — verify by eyeballing each page before/after.

---

## Verification (run after every phase)

```bash
# backend
cd backend && python -m pytest tests -q

# frontend
cd frontend && npm run build
```

End-to-end (after Phase 2): start backend (`uvicorn app.main:app --reload`) and
frontend (`npm run dev`), then:

1. Demo path: wizard → industry → country → demo codebase → launch → report renders.
2. Real path: wizard → "My repository" → a small public repo URL → launch → stage bar
   advances live → gaps appear → export report from the report page.
3. Offline path: stop the backend, run a demo scan, confirm the offline badge shows.

Commit at each phase boundary with messages: `fix: derive model names from settings`,
`feat: wire real repo scans into the wizard`, `fix: backend correctness (tokens, repo refresh, weighted score, demo dedupe)`,
`feat: env-driven API/WS endpoints`.
