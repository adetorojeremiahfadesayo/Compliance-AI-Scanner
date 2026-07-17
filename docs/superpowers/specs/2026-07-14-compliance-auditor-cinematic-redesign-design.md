<!-- Hallmark pre-emit critique: P5 H5 E4 S5 R5 V5 -->

# Compliance Auditor Cinematic Redesign Specification

Date: 2026-07-14
Status: Awaiting written-spec approval

## Outcome

Apply the supplied Stitch prototype language to the current React application
and expand it into a cinematic operational experience. The redesign changes
layout, visual hierarchy, motion, and spatial feedback while preserving all
existing application behavior.

The user has approved the cinematic direction and the following page mapping:

- Dashboard becomes the operational Analysis Hub.
- New Scan follows the Configuration Hub.
- Scan and Report follow the Confidence Report.
- Any new product feature requires explicit approval before implementation.

## References

Primary visual references are the supplied Stitch screens:

- `analysis_hub_repository_scan/screen.png`
- `configuration_hub_setup/screen.png`
- `compliance_audit_results/screen.png`

The single-screen marketing prototype is not the structural reference for the
Dashboard because the approved direction explicitly removes the marketing hero.

## Existing Constraints

The application already provides React 19, Vite 8, React Router, GSAP, Three.js,
Lucide, Recharts, Archivo Variable, and IBM Plex Mono. No new dependency is
required for the redesign.

Existing routes remain unchanged:

- `/`
- `/new-analysis`
- `/analysis/:id`
- `/report/:id`

Existing API calls, scan creation, navigation, exports, report downloads,
approval state, code inspection, and fallback presentation data remain intact.

## Approved Design Direction

### Visual System

Use the locked system in the project root `design.md`. The interface uses dark
graphite and navy operational surfaces, quiet steel borders, cool white text,
and a limited green signal color. Risk, warning, and compliant colors appear
only for genuine state. There are no popular AI gradients, oversized marketing
headlines, decorative glass cards, or generic geometric blobs.

Archivo Variable remains the UI face and IBM Plex Mono remains the data face.
Typography is compact, left aligned, and designed for scanning. Operational
panels use hairline structure and a maximum 8px radius.

### Shared Application Shell

Create a responsive shell with:

- fixed 260px navigation rail on desktop;
- compact top context/status band;
- route-aware page context and breadcrumb treatment;
- fluid content stage with stable maximum reading widths where appropriate;
- mobile navigation control and non-overlapping workspace.

The prototype search field will not be implemented because search is a new
feature. The top band instead presents existing context and status.

### Shared Cinematic Layer

Evolve `ScanField` into a lazy-loaded, route-aware spatial field. It supports
three visual modes: Analysis Field, Configuration Lattice, and Evidence
Constellation. Each mode receives existing route data through small serializable
props. The canvas never becomes the source of truth and never hides essential
state from HTML.

The component must:

- lazy-load Three.js;
- use a single canvas and requestAnimationFrame loop;
- cap pixel ratio at 1.5 desktop and 1.0 on constrained devices;
- lower point and line counts below 768px;
- pause when hidden or offscreen;
- dispose all GPU and event resources on unmount;
- render a static frame for reduced motion;
- expose a no-WebGL visual fallback.

### Motion Choreography

GSAP coordinates route entry, wizard step changes, confidence score reveal, and
evidence-panel transitions. CSS handles direct hover, focus, and pressed states.
Three.js handles continuous spatial motion. The systems do not animate the same
property on the same element.

Motion timings:

- route transition: 420-620ms;
- first-viewport reveal: 300-480ms;
- row and control feedback: 120-180ms;
- wizard step transition: 360-520ms;
- confidence draw/count: 700-1100ms;
- stagger gap: 35-70ms.

All motion stops or simplifies under `prefers-reduced-motion`.

## Page Specifications

### Dashboard / Analysis Hub

Replace the current marketing-oriented opening with an operational first
viewport. The page title is `Analysis Hub`; supporting copy is limited to what
is needed to understand the current scan workspace.

The composition contains:

- existing primary New Scan action;
- existing demo/live repository choices expressed as source rows or panels;
- existing compliance statistics in a continuous instrument strip;
- existing recent scans in a dense repository inventory table/list;
- existing deployment proof and error state in operational status regions;
- Analysis Field spatial stage using existing project and analysis state.

Hovering or focusing a repository item may focus the corresponding visual node.
This is a presentation link, not a new action. No command search, new filter,
invented anomaly, or fabricated metric is allowed.

### New Scan / Configuration Hub

Preserve the current Industry, Geography, Codebase, and Launch state flow while
reorganizing it into:

- persistent progress/step rail;
- active configuration work surface;
- contextual Configuration Lattice stage;
- stable Back and Continue/Launch command area.

Selection changes update the lattice using existing state. Industry changes
affect geometry grouping; geography changes activate location markers;
codebase selection changes the focused source node. These are visual responses
only. There is no region sync, background fetch, or new configuration option.

Validation stays attached to the relevant step. The launch action keeps its
current behavior, loading state, and error handling.

### Scan / Confidence Workspace

The running and completed states share the Confidence Report anatomy:

- route context and current status in the top band;
- primary confidence instrument and scan context;
- stage progression and agent trace;
- regression or verification result when available;
- gaps and evidence workspace after completion;
- existing report and approval actions.

The Evidence Constellation uses existing stage and finding data. Running stages
animate propagation; completed stages settle; critical findings use sparse risk
markers. The HTML stage list and logs remain the authoritative content.

### Report / Confidence Report

Recompose the current report into:

- confidence summary with existing overall score;
- project, regulation, model, and review context;
- critical/high findings summary using existing gaps;
- synchronized findings and code inspector workspace;
- existing report, remediation, patch, and policy exports.

Selecting or expanding a finding may focus its existing code annotation and its
visual marker. No new export type, compliance score, model claim, or remediation
action will be created.

## Component Architecture

Expected production edits are scoped to the existing frontend and may introduce
small shared presentation components:

- `AppShell`: responsive rail, top context band, and route stage.
- `PageContext`: breadcrumb/title/status composition.
- `SpatialField`: shared Three.js runtime with route-specific modes.
- `ConfidenceInstrument`: score, progress, and semantic state composition.
- `OperationalPanel`: repeated border, header, and density behavior.

Existing page components continue to own data loading and route behavior.
Existing domain components continue to own gaps, requirements, code, gauge, and
agent timeline content. Shared components receive plain props and do not call
the API directly.

## Data Flow

1. Existing page components fetch data through the current API service.
2. Pages derive small display models from existing project, analysis, stage, and
   gap records.
3. HTML controls and evidence views render the authoritative state.
4. SpatialField receives a reduced visual model with IDs, statuses, severity,
   and selection only.
5. Hover/focus selection can flow back to the page to synchronize existing rows
   and visual nodes; it cannot create or mutate backend data.

## Error And Fallback Behavior

- Existing API error messages remain visible and actionable.
- When dashboard data is unavailable, the spatial field renders a quiet idle
  topology and does not invent repository nodes.
- When WebGL initialization fails, the interface retains a CSS scan grid and
  all functionality.
- Empty findings, projects, logs, and inspector states use honest empty-state
  copy based on existing application semantics.
- Download failures preserve the current user feedback until a separate error
  handling change is approved.

## Responsive Requirements

- Verify 1440x900 and the native Stitch reference dimensions where practical.
- Verify widths of 320, 375, 414, 768, 1024, and 1440px.
- Use `minmax(0, 1fr)` for fluid tracks and `overflow-x: clip` at the root.
- No page-level horizontal scrolling.
- Controls and navigation labels remain one line.
- The spatial field reduces density and height before content becomes cramped.
- Critical actions remain visible without canvas overlap.

## Accessibility Requirements

- Preserve semantic headings and landmark regions.
- Maintain visible keyboard focus and logical tab order.
- Provide selected and current states through native/ARIA attributes.
- Keep canvas supplementary and `aria-hidden` unless a meaningful accessible
  description is later approved.
- Meet WCAG AA contrast for text, controls, and status distinctions.
- Do not encode compliance state through color alone.

## Verification Plan

After implementation:

1. Run lint and production build.
2. Start the local app and exercise Dashboard -> New Scan -> Scan -> Report.
3. Verify existing selections, scan launch, report navigation, and exports.
4. Capture desktop and mobile screenshots for every route.
5. Compare each route against its corresponding Stitch reference for layout,
   density, typography, palette, borders, icon treatment, and hierarchy.
6. Verify WebGL output is nonblank and responsive with canvas-pixel checks.
7. Verify reduced motion, hidden-tab pause, resize behavior, and WebGL fallback.
8. Record a fidelity ledger with at least five concrete comparison points.
9. Run an above-the-fold copy diff to ensure no unapproved labels or features
   were introduced.

## Explicit Feature Gate

The following remain out of scope until the user separately approves them:

- global command search;
- a Reports navigation destination;
- region live sync;
- user/account controls;
- support or documentation destinations;
- scan comparison;
- new filters, actions, exports, metrics, or backend behavior.

## Definition Of Done

The redesign is complete when all four routes use the accepted operational
system, existing workflows remain functional, the cinematic layer performs
smoothly and degrades safely, mobile layouts have no overflow, and visual QA
shows no material drift from the approved Stitch-derived design language.

