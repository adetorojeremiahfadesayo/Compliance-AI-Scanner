<!-- Hallmark pre-emit critique: P5 H5 E4 S5 R5 V5 -->

# Compliance Autopilot: Secure Intelligence System

## Design Intent

Compliance Autopilot is an operational analysis instrument, not a marketing site.
Every screen should feel like a precise workspace for inspecting evidence,
configuring a scan, and acting on compliance findings.

The visual system is derived from the supplied Stitch Analysis Hub,
Configuration Hub, and Confidence Report references. The cinematic layer adds
spatial depth and responsive motion without adding product behavior.

## Scope Lock

- Preserve the existing routes: Dashboard, New Scan, Scan, and Report.
- Preserve existing scan, export, navigation, approval, and inspection actions.
- Use only metrics and statuses already returned by the application.
- Do not add global search, Reports navigation, region live sync, account
  controls, support links, comparison tools, or new scan actions without user
  approval.
- Do not delete production files or replace the application architecture.

## Character

The interface should feel forensic, calm, and consequential. It is dense enough
for repeated professional use, but never visually noisy. Cinematic moments come
from data-reactive spatial fields, controlled camera movement, and transitions
between operational states, not from decorative gradients or oversized copy.

## Color System

All implementation colors must be expressed through named CSS tokens.

- `--color-void`: near-black graphite page ground.
- `--color-rail`: colder navy-black navigation ground.
- `--color-surface-1`: primary workspace surface.
- `--color-surface-2`: raised inspection surface.
- `--color-border`: quiet steel hairline.
- `--color-border-active`: brighter steel for focus and selected rows.
- `--color-text`: cool white primary text.
- `--color-text-muted`: steel secondary text.
- `--color-text-faint`: tertiary labels and inactive metadata.
- `--color-signal`: operational green, used sparingly for active scanning and
  positive progress.
- `--color-signal-strong`: high-contrast green for primary actions.
- `--color-risk`, `--color-warning`, and `--color-ok`: semantic states only.

No purple-blue gradients, ambient gradient blobs, neon glows, warm cream
surfaces, or decorative color washes. Light should appear as narrow scan lines,
point intensity, edge reflections, and state-specific illumination.

## Typography

- UI and display: Archivo Variable.
- Data, identifiers, labels, and code: IBM Plex Mono.
- No additional font package.
- Headings are compact and left aligned. They do not scale with viewport width.
- Labels use uppercase mono sparingly and never substitute for useful hierarchy.
- Letter spacing is zero for headings and controls; compact mono labels may use
  modest positive tracking.

## Geometry

- Four-pixel spacing base with deliberate 8, 12, 16, 24, 32, and 48px steps.
- One-pixel borders define regions; shadows are rare.
- Controls use 6 to 8px radii. Operational panels use 8px maximum.
- Pills are limited to genuine statuses.
- The app shell uses a fixed left rail and a compact top command/status band.
- Tables, lists, bands, and rails take priority over decorative card grids.

## App Shell

The desktop shell uses a 260px navigation rail, a 64px top status band, and a
fluid workspace. The top band contains existing page context and live status,
not an inert search box. Mobile collapses the rail into an icon control and
keeps the active page context visible.

Navigation motion is a restrained lateral marker and label response. Route
changes use a short spatial handoff: current content recedes slightly while the
next operational layer resolves into focus.

## Spatial System

The Three.js layer is a reusable `SpatialField` with route-specific modes. It
must remain subordinate to text and controls and must never intercept pointer
events required by the UI.

### Analysis Field

The Dashboard displays a repository topology made from points, thin links, and
an active scan plane. Existing projects and analyses determine node count,
status color, and highlighted clusters. Pointer movement creates slight parallax;
hovering a repository row focuses the matching cluster.

### Configuration Lattice

New Scan uses a quieter spatial lattice behind the configuration stage. Existing
industry and jurisdiction selections alter the lattice orientation and active
nodes. This is visual feedback for current selections, not a live-sync feature.

### Evidence Constellation

Scan and Report views translate existing pipeline stages and findings into a
depth field. Completed stages settle into stable nodes; the active stage carries
a controlled pulse; critical findings create sparse risk markers. Selecting a
finding focuses its marker while the evidence panel remains the primary surface.

### Performance Contract

- Lazy-load Three.js after the first useful interface paint.
- Run one canvas and one animation loop per route.
- Cap device pixel ratio and reduce point density on smaller devices.
- Pause rendering when the document is hidden or the canvas is offscreen.
- Dispose geometry, materials, listeners, and renderers on route change.
- Provide a static CSS fallback if WebGL is unavailable.
- Under `prefers-reduced-motion`, render one stable frame with no camera drift.

## Motion Language

GSAP owns route and interface choreography; Three.js owns spatial motion.

- Route handoff: 420 to 620ms, subtle depth and opacity.
- Panel reveal: 280 to 460ms with short stagger intervals.
- Step changes: directional wipe and focus transfer, never a carousel slide.
- Gauge and confidence score: draw once when data arrives; no endless motion.
- Live scanning: controlled sweep, node propagation, and stage pulses.
- Hover: 1 to 3px translation or border response, no floating-card lift.
- Reduced motion removes transforms and continuous animation.

## Page Composition

### Dashboard: Analysis Hub

The first viewport is a command workspace. It contains the page identity,
existing scan status, repository/source selection, policy context, repository
inventory, recent scans, anomalies, and the Analysis Field. There is no hero
headline or sales copy. The main scan action remains visually dominant.

### New Scan: Configuration Hub

The existing wizard becomes a three-region workspace: persistent step rail,
active configuration surface, and spatial context panel. Industry, geography,
repository, and review data remain the same. The final launch action stays in a
stable command position so the layout does not jump between steps.

### Scan: Confidence Workspace

The scan view leads with current status, project context, and a confidence
instrument. Pipeline stages, logs, gaps, and remediation state follow in a dense
evidence layout. During a running scan, the Evidence Constellation reflects
existing pipeline progress. Completed scans settle into the report structure.

### Report: Confidence Report

The report leads with confidence score, regulation context, critical findings,
and review state. Existing exports remain grouped as report actions. Findings
and the code inspector form a synchronized evidence workspace. No new report
type or metric is introduced.

## Interaction And Accessibility

- All existing controls retain keyboard access and visible focus.
- Every selectable configuration item has default, hover, focus, selected,
  disabled, loading, error, and success treatment where applicable.
- Canvas content is decorative or supplementary and is hidden from assistive
  technology; equivalent state is present in the HTML interface.
- Contrast targets WCAG AA for text and controls.
- Mobile widths of 320, 375, 414, and 768px must have no horizontal page scroll.
- Buttons and navigation labels must not wrap to two lines.

## Responsive Behavior

At wide desktop, the spatial field can occupy a full-height right stage or a
background layer behind open workspace. At tablet widths it becomes a shallower
context band. At mobile widths it becomes a compact, low-density instrument and
never pushes required actions below inaccessible regions.

## Acceptance Standard

The result must preserve all existing workflows, show no invented content, and
match the supplied Stitch density and confidence-report hierarchy. It should
feel authored for compliance analysis: spatial, exact, and professional, with
motion that explains system state rather than decorating empty space.

