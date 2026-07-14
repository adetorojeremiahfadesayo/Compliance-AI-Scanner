# Cinematic Compliance UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing four-route compliance interface as a Stitch-derived operational workspace with GSAP choreography and route-aware Three.js visualization while preserving all current product behavior.

**Architecture:** Existing pages retain API calls, state, and route ownership. A responsive application shell and small shared presentation components provide visual consistency, while `ScanField` becomes a lazy route-aware Three.js renderer driven by a tested pure-data visual model. Styling moves into named design tokens and a dedicated cinematic stylesheet so page components remain readable.

**Tech Stack:** React 19, Vite 8, React Router 7, GSAP 3, Three.js 0.185, Lucide React, Node test runner, Playwright verification.

## Global Constraints

- Keep `/`, `/new-analysis`, `/analysis/:id`, and `/report/:id` unchanged.
- Add no dependency and delete no production file.
- Add no global search, Reports navigation destination, region live sync, account control, support destination, comparison tool, filter, export, metric, or backend behavior.
- Use only existing project, scan, stage, finding, regulation, and deployment data.
- Preserve Archivo Variable and IBM Plex Mono.
- Use named CSS tokens for every color and font family.
- Keep Three.js supplementary, lazy-loaded, disposable, and non-blocking.
- Support `prefers-reduced-motion` and a non-WebGL fallback.
- Verify 320, 375, 414, 768, 1024, and 1440px widths without page overflow.

---

## File Map

**Create**

- `frontend/src/cinematic.css`: app shell, page layouts, operational components, responsive rules, and motion-safe visual states.
- `frontend/src/components/AppShell.jsx`: navigation rail, mobile navigation, top status band, route transition stage.
- `frontend/src/components/PageContext.jsx`: compact page identity, breadcrumb, status, and action layout.
- `frontend/src/components/OperationalPanel.jsx`: shared panel frame with heading and optional action.
- `frontend/src/components/ConfidenceInstrument.jsx`: score, progress, and semantic status composition using the existing gauge.
- `frontend/src/utils/spatialModel.js`: pure conversion from route records to stable visual nodes.
- `frontend/src/utils/spatialModel.test.js`: deterministic model tests using `node:test`.

**Modify**

- `frontend/package.json`: add a dependency-free `test` script using Node's test runner.
- `frontend/src/main.jsx`: import the cinematic stylesheet.
- `frontend/src/index.css`: lock tokens, root overflow, geometry, controls, and reduced-motion behavior.
- `frontend/src/App.jsx`: replace inline shell with `AppShell`; preserve routes.
- `frontend/src/components/Sidebar.jsx`: convert to route rail content consumed by `AppShell`; keep only Dashboard and New Scan.
- `frontend/src/components/ScanField.jsx`: add route modes, data props, lifecycle controls, resize handling, visibility pause, and fallback.
- `frontend/src/components/ComplianceGauge.jsx`: expose status label and motion-safe count behavior.
- `frontend/src/components/AgentTimeline.jsx`: dense timeline semantics and active state classes.
- `frontend/src/components/GapMatrix.jsx`: operational table/list class structure and selection callback.
- `frontend/src/components/RequirementCard.jsx`: synchronized finding selection and compact confidence-report presentation.
- `frontend/src/components/CodeViewer.jsx`: selected annotation styling and accessible file evidence structure.
- `frontend/src/components/ComplianceReportModal.jsx`: reuse Confidence Report composition without introducing actions.
- `frontend/src/pages/Dashboard.jsx`: Analysis Hub composition and repository-to-spatial selection.
- `frontend/src/pages/NewAnalysis.jsx`: Configuration Hub composition with existing wizard behavior.
- `frontend/src/pages/AnalysisView.jsx`: Confidence Workspace composition and stage-driven spatial field.
- `frontend/src/pages/ReportView.jsx`: Confidence Report composition and finding/code synchronization.

**Delete**

- None.

---

### Task 1: Deterministic Spatial Model

**Files:**
- Create: `frontend/src/utils/spatialModel.js`
- Create: `frontend/src/utils/spatialModel.test.js`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `buildSpatialModel({ mode, projects, analyses, stages, findings, selections })` returning `{ nodes, links, focusId, intensity }`.
- Produces: each node as `{ id, kind, status, severity, position: [number, number, number], scale }`.

- [ ] **Step 1: Add the failing Node tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpatialModel } from './spatialModel.js';

test('analysis mode produces stable project nodes', () => {
  const input = { mode: 'analysis', projects: [{ id: 7 }, { id: 8 }], analyses: [] };
  assert.deepEqual(buildSpatialModel(input), buildSpatialModel(input));
  assert.equal(buildSpatialModel(input).nodes.length, 2);
});

test('evidence mode retains finding severity', () => {
  const result = buildSpatialModel({ mode: 'evidence', findings: [{ id: 3, priority: 'critical', status: 'non_compliant' }] });
  assert.equal(result.nodes[0].severity, 'critical');
  assert.equal(result.nodes[0].status, 'non_compliant');
});

test('empty input returns an honest idle model', () => {
  assert.deepEqual(buildSpatialModel({ mode: 'analysis' }).nodes, []);
});
```

- [ ] **Step 2: Run the tests and verify import failure**

Run: `npm test -- --test-name-pattern="spatial"`
Expected: FAIL because `spatialModel.js` does not exist.

- [ ] **Step 3: Implement seeded positions and route mapping**

Use a stable string hash and spherical distribution; never call `Math.random()`.
Map project IDs, selection IDs, stage names, and finding IDs to stable node IDs.
Use existing status/severity values without inventing scores.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all spatial model tests pass.

- [ ] **Step 5: Commit**

Run: `git add frontend/package.json frontend/src/utils && git commit -m "test: define spatial visualization model"`

### Task 2: Operational App Shell And Tokens

**Files:**
- Create: `frontend/src/cinematic.css`
- Create: `frontend/src/components/AppShell.jsx`
- Create: `frontend/src/components/PageContext.jsx`
- Create: `frontend/src/components/OperationalPanel.jsx`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

**Interfaces:**
- `AppShell({ children })` reads current route and renders rail/status/stage.
- `PageContext({ eyebrow, title, description, status, actions, backAction })` renders page context without owning navigation.
- `OperationalPanel({ title, meta, action, className, children })` renders a semantic section.

- [ ] **Step 1: Add structural shell components**

Build a fixed 260px desktop rail, 64px top band, and flexible stage. Keep only the
existing Dashboard and New Scan destinations. The mobile rail becomes a compact
toggle; Escape closes it and route changes reset it.

- [ ] **Step 2: Replace inline App layout**

Wrap the unchanged route table with `AppShell`. Use `useLocation()` and a GSAP
context to animate `.route-stage__content` on pathname changes. Kill the context
on cleanup.

- [ ] **Step 3: Lock design tokens and controls**

Replace legacy gradient aliases with flat token values. Add explicit tokens for
void, rail, surfaces, borders, text, signal, semantic states, spacing, geometry,
and motion. Set `overflow-x: clip` on `html` and `body`.

- [ ] **Step 4: Add responsive shell rules**

At 900px collapse the rail. At 768px reduce page padding and status-band density.
At 414px keep icon buttons at least 40px and ensure command labels do not wrap.

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: both commands succeed without new warnings.

- [ ] **Step 6: Commit**

Run: `git add frontend/src/App.jsx frontend/src/main.jsx frontend/src/index.css frontend/src/cinematic.css frontend/src/components/AppShell.jsx frontend/src/components/PageContext.jsx frontend/src/components/OperationalPanel.jsx frontend/src/components/Sidebar.jsx && git commit -m "feat: add operational application shell"`

### Task 3: Route-Aware Three.js Field

**Files:**
- Modify: `frontend/src/components/ScanField.jsx`
- Test: `frontend/src/utils/spatialModel.test.js`

**Interfaces:**
- `ScanField({ mode = 'analysis', projects = [], analyses = [], stages = [], findings = [], selections = {}, focusId = null, className = '' })`.
- Consumes: `buildSpatialModel` from Task 1.

- [ ] **Step 1: Extend tests for links and focus**

Add assertions that links reference existing node IDs and explicit `focusId`
passes through unchanged.

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- --test-name-pattern="links|focus"`
Expected: FAIL until the model exposes both behaviors.

- [ ] **Step 3: Update the model and make tests pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Rebuild ScanField**

Create one point buffer, one line buffer, one focus ring, and one narrow scan
plane. Use mode-specific camera targets and motion speeds. Update buffer data
from the pure model without rebuilding the renderer. Set `data-webgl-state` to
`ready`, `idle`, or `fallback` on the mount element.

- [ ] **Step 5: Add lifecycle and performance controls**

Lazy-load Three.js, cap DPR, observe intersection, pause on `visibilitychange`,
debounce resize through requestAnimationFrame, render one frame for reduced
motion, and dispose all resources on unmount.

- [ ] **Step 6: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all checks pass and the Three chunk remains lazy in Vite output.

- [ ] **Step 7: Commit**

Run: `git add frontend/src/components/ScanField.jsx frontend/src/utils && git commit -m "feat: add route-aware spatial field"`

### Task 4: Dashboard Analysis Hub

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/cinematic.css`

**Interfaces:**
- Existing `api.getProjects`, `api.getAnalyses`, and `api.getDeploymentProof` calls remain unchanged.
- Dashboard stores `focusedRepositoryId` only for synchronized row/canvas focus.

- [ ] **Step 1: Replace the marketing first viewport**

Render `PageContext` with `Analysis Hub`, the existing New Scan action, and
operational status. Build an open split stage: repository source/inventory on the
left and the Analysis Field on the right. Remove the sales headline and claim.

- [ ] **Step 2: Recompose existing data**

Place existing average compliance, critical gaps, approved packages, and project
count in a continuous instrument strip. Keep recent scans as dense rows and
deployment proof/error as status regions. Do not invent anomaly data.

- [ ] **Step 3: Synchronize repository focus**

Set `focusedRepositoryId` on row hover and focus. Pass it to `ScanField`; clear
it on pointer leave/blur. Clicking retains existing navigation behavior.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: success; no marketing hero copy remains.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/pages/Dashboard.jsx frontend/src/cinematic.css && git commit -m "feat: rebuild dashboard as analysis hub"`

### Task 5: New Scan Configuration Hub

**Files:**
- Modify: `frontend/src/pages/NewAnalysis.jsx`
- Modify: `frontend/src/cinematic.css`

**Interfaces:**
- Preserve `STEPS`, state variables, validation, `fetchRulePack`, `handleNext`, `handleBack`, `handleStartScan`, and existing navigation.
- Pass existing `selectedIndustry`, `selectedCountry`, and `selectedCodebase` values to `ScanField` as `selections`.

- [ ] **Step 1: Preserve behavior and replace only composition**

Wrap the existing four steps in the Configuration Hub shell: vertical numbered
step rail, active configuration panel, spatial context stage, and stable command
bar. Keep current form controls and labels.

- [ ] **Step 2: Connect visual selection feedback**

Pass selection state to `ScanField mode="configuration"`. The field changes
node activation only; it performs no fetch and adds no live-sync label.

- [ ] **Step 3: Refine GSAP step choreography**

Scope GSAP to the active panel, animate directional opacity/clip transitions,
focus the first interactive control after transition, and clean up each context.

- [ ] **Step 4: Verify the full existing flow**

Exercise Industry -> Geography -> Codebase -> Launch with both demo and GitHub
paths. Verify validation, Back, Continue, loading, and error behavior.

- [ ] **Step 5: Run checks and commit**

Run: `npm run lint && npm run build`
Expected: success.

Run: `git add frontend/src/pages/NewAnalysis.jsx frontend/src/cinematic.css && git commit -m "feat: rebuild new scan as configuration hub"`

### Task 6: Confidence Workspace And Report

**Files:**
- Create: `frontend/src/components/ConfidenceInstrument.jsx`
- Modify: `frontend/src/components/ComplianceGauge.jsx`
- Modify: `frontend/src/components/AgentTimeline.jsx`
- Modify: `frontend/src/components/GapMatrix.jsx`
- Modify: `frontend/src/components/RequirementCard.jsx`
- Modify: `frontend/src/components/CodeViewer.jsx`
- Modify: `frontend/src/components/ComplianceReportModal.jsx`
- Modify: `frontend/src/pages/AnalysisView.jsx`
- Modify: `frontend/src/pages/ReportView.jsx`
- Modify: `frontend/src/cinematic.css`

**Interfaces:**
- `ConfidenceInstrument({ score, status, progress, label, meta = [] })` composes the existing gauge and real metadata.
- `GapMatrix({ gaps, selectedId, onSelect })` remains compatible when new props are omitted.
- `RequirementCard({ selected, onSelect, ...existingProps })` remains compatible with current callers.
- `CodeViewer({ code, annotations, activeLine })` remains compatible when `activeLine` is omitted.

- [ ] **Step 1: Build ConfidenceInstrument**

Use the existing animated gauge, a real scan progress bar when available, and
semantic state. Do not derive or display a second score.

- [ ] **Step 2: Recompose AnalysisView**

Lead with route context, confidence instrument, project/regulation context, and
Evidence Constellation. Keep all current approval, fix PR, monitoring,
regression, report, modal, logs, gap, and timeline behavior.

- [ ] **Step 3: Recompose ReportView**

Lead with confidence report context and existing exports. Add local
`selectedFindingId`; selecting a requirement focuses the existing annotation
and the corresponding spatial marker. Keep all download behavior unchanged.

- [ ] **Step 4: Update supporting components**

Add semantic class names, selected/focus treatments, and compact layouts without
changing domain content. Ensure default props preserve existing call sites.

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all checks pass.

- [ ] **Step 6: Commit**

Run: `git add frontend/src/components frontend/src/pages/AnalysisView.jsx frontend/src/pages/ReportView.jsx frontend/src/cinematic.css && git commit -m "feat: add cinematic confidence workspaces"`

### Task 7: Browser Fidelity And Performance QA

**Files:**
- Modify as required: `frontend/src/cinematic.css`, affected pages/components.
- Create: `docs/qa/2026-07-14-cinematic-ui-fidelity.md`

**Interfaces:**
- No new product interfaces.

- [ ] **Step 1: Start the application**

Run the existing frontend dev server on an available port and record the URL.

- [ ] **Step 2: Verify core route workflow**

Exercise Dashboard -> New Scan -> Scan -> Report. Confirm repository selection,
wizard controls, report navigation, finding selection, code focus, and exports.

- [ ] **Step 3: Capture required viewports**

Capture every route at 1440x900 and mobile at 375x812. Also inspect widths 320,
414, 768, and 1024 for overflow and action placement.

- [ ] **Step 4: Verify WebGL**

Check that every route canvas has nonblank pixels, correct dimensions, and
`data-webgl-state="ready"` when supported. Verify resize, hidden-tab pause,
reduced motion, and static fallback.

- [ ] **Step 5: Compare against Stitch references**

Inspect at least: shell density, first-viewport hierarchy, typography, palette,
border/radius treatment, page-specific composition, icon alignment, responsive
collapse, and motion. Record mismatch, evidence, and repair in the fidelity file.

- [ ] **Step 6: Run copy and feature gate audit**

Search rendered copy for unapproved Search, Reports nav, Live Sync, Account,
Support, Compare, or invented metric language. Remove any accidental additions.

- [ ] **Step 7: Final checks**

Run: `npm test && npm run lint && npm run build`
Expected: all checks pass.

- [ ] **Step 8: Commit**

Run: `git add frontend docs/qa/2026-07-14-cinematic-ui-fidelity.md && git commit -m "test: verify cinematic compliance interface"`

