# Stage 01 — Visual System and Agent Shell

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S01`  
**Depends on:** Stage 00 — Stabilize and Secure the Foundation  
**Enables:** Stage 02 — Task, session, event, and approval primitives  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 01 changes Nexuss-IDE from an editor with two transient drawers into a task-centered workspace. The goal is a stable visual and interaction shell that can support real task events later without requiring another structural rewrite.

The shell must be useful even with mocked task data. A user should be able to sign in, choose a project, start a mocked task, inspect a plan, view activity, open a diff or artifact placeholder, and return to task history on desktop and mobile. The interface should make progress, permissions, and current scope legible without copying Manus branding or proprietary visual assets.

> **Transition principle:** Stage 01 is a product-shell release, not an intelligence release. Every agent-like behavior is mocked or locally simulated until Stage 02 supplies durable task/session/event contracts.

## Scope and non-goals

The implementation scope includes design tokens, component primitives, responsive information architecture, authenticated navigation, command center, task workspace, mocked plan/activity/result views, editor integration, artifact cards, settings navigation, accessibility, mobile behavior, loading/error/empty states, and visual regression testing.

The stage does not add real model calls, persistent task tables, terminal execution, browser connectors, background queues, external side effects, or production agent behavior. It may define TypeScript-like or JSON fixture shapes in JavaScript, but those shapes must be clearly marked as temporary view models and later replaced by Stage 02 API contracts.

## Target information architecture

| Surface | Desktop | Mobile | Required state |
|---|---|---|---|
| Global navigation | Persistent rail with project switcher, New task, Tasks, Files, Extensions, History, Settings | Bottom navigation plus overflow menu | Active route and unread/approval badge |
| Header | Workspace, branch/status, task state, share/export, profile | Compact title, status pill, overflow | Current project and task scope |
| Main canvas | Command center, task workspace, editor, or result surface | Full-screen mode with explicit surface switcher | Loading, empty, ready, error |
| Activity panel | Resizable right panel with timeline and computer context | Draggable bottom sheet | Open/closed, height, focused event |
| Composer | Large prompt input with attachments, project scope, suggested starters | Sticky keyboard-aware composer | Draft, submitting, disabled, error |
| Files/editor | Tabbed editor, tree, diff view | Editor-first view with file switcher | Selected file, dirty state, revision state |
| Notifications | Non-blocking status and approval inbox | Badge and high-priority banner | Unread, pending approval, failure |

## Design system implementation

### Work package S01-01 — Token foundation

Create a single source of truth for color, typography, spacing, elevation, radii, borders, focus rings, motion, z-index, breakpoints, and touch targets. CSS custom properties are acceptable for the current server-rendered stack. The token file must not require every component to know a raw hex value.

Define light and dark theme contracts, even if only dark mode is initially enabled. Theme tokens must preserve semantic roles such as `surface`, `surface-raised`, `text-primary`, `text-muted`, `accent`, `success`, `warning`, `danger`, `focus`, and `overlay`. Status must remain understandable through labels/icons, not color alone.

The minimum interactive target is 44 by 44 CSS pixels for touch-oriented controls. Focus indicators must remain visible against every surface. Motion must be disabled or reduced when `prefers-reduced-motion: reduce` is active.

### Work package S01-02 — Component primitives

Implement or standardize primitives for buttons, icon buttons, text inputs, text areas, badges, status pills, tabs, panels, dialogs, drawers, bottom sheets, tooltips, menus, command chips, timeline events, diff blocks, artifact cards, empty states, skeletons, banners, and confirmation/approval surfaces.

Every primitive must define its semantic HTML, keyboard behavior, accessible name, focus behavior, disabled behavior, error state, and mobile layout. Do not use a clickable `div` where a button, link, input, or dialog element is appropriate. The icon layer must provide consistent icon size/weight and accessible labels; the current Font Awesome dependency should be isolated behind this layer or replaced with a project-controlled asset set.

### Work package S01-03 — Application shell

Replace the current two-drawer hierarchy with a shell that has stable navigation regions. The existing editor route may remain the initial authenticated route, but it should render the new shell and route the user to Command Center by default when no file/task is selected.

The shell must maintain these client states: active project, active task, active surface, navigation visibility, activity panel visibility, composer draft, selected file, and notification count. State may be held in a small client store or a disciplined module until a framework migration is approved. Avoid introducing a second state management system merely for convenience.

The shell must support deep links for at least `/`, `/tasks`, `/tasks/:id` or an equivalent server-rendered route shape, `/files`, `/history`, and `/settings`. If the current Flask application cannot safely support client-side routing, use server routes plus URL state and document the boundary.

### Work package S01-04 — Command Center

Create the authenticated landing surface with a calm header, active project selector, prominent task composer, suggested starters, recent tasks, and capability summary. Suggested starters must be repository-relevant: explain this codebase, inspect the file tree, write a test, create an extension scaffold, or run a safe local check.

The composer must support draft text, project scope, attachment placeholders, disabled/submitting states, inline validation, keyboard submission, and a visible indication that the current stage uses mocked task execution. The UI must not imply that an agent has executed real actions when it has not.

### Work package S01-05 — Mock Task Workspace

Implement a fixture-backed task workspace that includes the user request, an editable-looking but non-persistent plan, a step status, a mocked activity timeline, a computer-context placeholder, files/artifacts, and a follow-up composer. The fixture must include success, warning, failure, paused, and needs-input examples.

Every activity event should show a concise action label, status, timestamp or relative order, and an expandable detail area. The panel must expose a visible stop/pause affordance, but in Stage 01 it should clearly state that the action is simulated. Do not render fake terminal commands or browser actions as if they really occurred; label them as preview fixtures.

### Work package S01-06 — Editor and artifact surfaces

Preserve Monaco as the code editor, but wrap it in the new shell. Add file tabs, dirty-state indicator, save state, diff preview, read-only result mode, and a mobile file switcher. The editor adapter must continue to support the existing touch selection behavior after the shell is introduced.

Implement artifact cards for patch, test report, log, image, and document placeholders. Each card must show type, name, size or status when available, provenance placeholder, open/download action state, and failure state. Stage 01 may use fixture content, but the component contract must not imply that artifacts are already persisted.

### Work package S01-07 — Responsive and accessible behavior

Define breakpoints based on layout behavior, not device names. Desktop should support a persistent rail and resizable activity panel. Tablet should allow a collapsible rail. Mobile should provide bottom navigation, a keyboard-aware composer, a bottom-sheet activity panel, safe-area padding, and touch-friendly controls.

Test zoom at 200%, keyboard-only use, reduced motion, high contrast where supported, portrait/landscape mobile widths, long task names, long filenames, large activity details, empty workspaces, offline/failure states, and screen-reader landmarks. Ensure the UI never traps focus in a non-modal panel and that modal dialogs restore focus to the invoking control.

## Temporary fixture contracts

The fixture layer should use explicit schemas even before real APIs exist. A representative task fixture includes:

```json
{
  "id": "mock-task-001",
  "title": "Add authentication tests",
  "status": "needs_input",
  "project": {"id": "demo-project", "name": "Nexuss-IDE"},
  "request": "Add authentication tests and show me the diff.",
  "plan": [
    {"id": "step-1", "title": "Inspect authentication routes", "status": "complete"},
    {"id": "step-2", "title": "Draft tests", "status": "needs_input"},
    {"id": "step-3", "title": "Run verification", "status": "pending"}
  ],
  "events": [],
  "artifacts": [],
  "simulation": true
}
```

The `simulation: true` marker is mandatory for all Stage 01 fixtures. The UI must not show “completed” for a simulated action without a fixture-level label such as “Preview.”

## Evaluation harness

The stage requires a browser-level test harness capable of rendering the app at deterministic viewport sizes and capturing screenshots. Playwright is recommended, but an equivalent tool is acceptable. Use seeded fixtures, a test authentication shortcut isolated to test mode, disabled network calls, and a stable font strategy.

### Harness layout

| Harness | Tests |
|---|---|
| `tests/ui/shell.spec` | Sign-in shell, navigation, project selection, task start, history return |
| `tests/ui/task-workspace.spec` | Plan, timeline, activity panel, fixture statuses, mock stop behavior |
| `tests/ui/editor.spec` | File tabs, Monaco mount, dirty state, diff/read-only fixture, touch adapter smoke |
| `tests/ui/artifacts.spec` | Artifact cards, open/download disabled state, failure state |
| `tests/ui/responsive.spec` | Desktop, tablet, mobile portrait/landscape, panel transitions |
| `tests/a11y/shell.spec` | Landmarks, names, keyboard order, focus restoration, dialog semantics |
| `tests/visual/*.spec` | Screenshot baselines for all canonical states |
| `tests/ui/error-states.spec` | Empty, loading, offline, failed, needs-input, long-content states |

### Canonical viewport matrix

| ID | Width | Height | Purpose |
|---|---:|---:|---|
| V01 | 1440 | 900 | Wide desktop with persistent rail and activity panel |
| V02 | 1024 | 768 | Compact desktop/tablet boundary |
| V03 | 768 | 1024 | Tablet portrait |
| V04 | 390 | 844 | Mobile portrait |
| V05 | 844 | 390 | Mobile landscape |
| V06 | 320 | 568 | Narrow minimum support check |

### Behavioral test cases

| Test ID | Scenario | Expected result |
|---|---|---|
| S01-T01 | Open authenticated home with no project | Command Center loads an explicit project-empty state and no fake task activity |
| S01-T02 | Select project and submit mock task | Task Workspace opens with `simulation: true` visible and deterministic fixture data |
| S01-T03 | Open activity panel, resize or drag sheet, close and reopen | State is preserved without content loss or scroll jump beyond documented behavior |
| S01-T04 | Navigate from task to files/editor and back | Active task context remains visible and URL/deep link is stable |
| S01-T05 | Render success, warning, failure, paused, needs-input fixtures | Each status has text, icon/label, color-independent meaning, and correct actions |
| S01-T06 | Press Tab through the shell | Focus order follows visual/semantic order and never disappears |
| S01-T07 | Open modal/approval preview, press Escape, reopen | Focus is trapped only while modal is open and returns to invoking control |
| S01-T08 | Use keyboard to submit and cancel composer | No mouse-only action is required; disabled/submitting states are announced |
| S01-T09 | Load long filenames, long prompt, large event detail | Text wraps or truncates safely; no horizontal page overflow |
| S01-T10 | Simulate offline asset/API failure | A clear retry/error state appears; no silent blank panel |
| S01-T11 | Mobile keyboard opens over composer | Composer remains usable and content is not hidden behind the keyboard or safe area |
| S01-T12 | Use reduced motion | Non-essential transitions are removed or shortened without breaking state changes |

### Visual regression protocol

Freeze fixture data, browser version, viewport, timezone, locale, font loading, and color scheme. Capture screenshots only after a readiness marker such as `data-ui-ready="true"` is present. Compare screenshots with a documented pixel-diff threshold; a threshold must not hide layout shifts, clipped text, missing controls, or contrast failures.

Every intentional visual change must update the baseline with a written reason. A screenshot diff is an automatic failure when it removes a required control, changes a semantic status, clips content, creates unexpected scroll, or changes the task/project context. Small anti-aliasing differences may be tolerated only when the diff tool and reviewer record the reason.

### Accessibility protocol

Run automated accessibility checks on Command Center, Task Workspace, editor shell, activity panel, modal/approval preview, and settings. Automated checks are necessary but not sufficient. Add a keyboard-only walkthrough and a screen-reader landmark/name review for the canonical flows.

The stage fails if any critical or serious accessibility issue blocks task start, navigation, status interpretation, editor access, or error recovery. Color contrast, focus visibility, semantics, labels, keyboard operation, dialog focus, and reduced-motion behavior must be reviewed together.

## Pass/fail gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G01-01 Shell integrity | All required surfaces render from a clean authenticated test session | Missing route, blank surface, uncaught client exception, or fake live behavior |
| G01-02 Visual system | Components consume tokens and meet the documented spacing, focus, touch, and status rules | Raw untracked styling, inaccessible icon-only controls, or inconsistent status semantics |
| G01-03 Core journey | New test user can choose project, start mock task, inspect plan/activity, open artifact, and return to history | Any core journey requires undocumented manual recovery |
| G01-04 Responsive behavior | V01–V06 pass without clipped controls, unusable composer, or unexpected horizontal scroll | Any supported viewport blocks task start, approval preview, or navigation |
| G01-05 Accessibility | Automated and manual checks show no blocking issue in core flows | Keyboard trap, missing names, invisible focus, or status understandable only by color |
| G01-06 Mock honesty | Every simulated action is explicitly marked and no fixture claims real execution | User could reasonably believe a simulated tool call actually ran |
| G01-07 Visual regression | Canonical screenshots match approved baselines or have reviewed diffs | Unreviewed baseline drift, missing panel, layout shift, or content clipping |
| G01-08 Error resilience | Loading, empty, offline, failed, paused, and needs-input states are actionable | Blank, misleading, or unrecoverable state |
| G01-09 Existing editor regression | Monaco mounts, file tree and file routes remain usable, touch smoke passes | Existing editor workflow breaks without a documented replacement |
| G01-10 Performance budget | First meaningful shell render and interaction remain within the agreed test budget on the CI profile | Excessive blocking asset, repeated layout thrash, or unusable mobile load |

The exact performance budget must be recorded in the evidence package using the CI profile. A reasonable initial rule is that the shell becomes interactive before the editor or non-critical activity details finish loading, but the team must measure and approve the numeric threshold rather than hiding a slow page behind a spinner.

## Transition tests to Stage 02

| Transition ID | Procedure | Expected result |
|---|---|---|
| T01-01 Fixture-to-API seam | Replace fixture provider with a test provider returning the same task view model | UI renders without component rewrites or undocumented assumptions |
| T01-02 Event seam | Feed ordered, duplicated, delayed, and out-of-order mock activity events | UI handles idempotency/order markers or displays a safe resync state |
| T01-03 Persistent URL | Refresh a deep-linked mock task and reopen it in a new test session | Route identifies task/project context without relying only on in-memory state |
| T01-04 Approval placeholder | Render a pending approval fixture with exact scope and deny/approve preview actions | UI supports the future Stage 02 approval record without fake side effects |
| T01-05 Error contract | Return stable API-shaped errors for task load, event load, and artifact load | UI renders recoverable errors and correlation IDs without changing layout contract |
| T01-06 Editor revision seam | Provide a file revision and stale-revision error fixture | Editor displays dirty/conflict state without silently overwriting content |
| T01-07 Mobile continuity | Start a mock task on mobile, rotate viewport, close/reopen activity, and return to task | Task context and draft state survive documented layout changes |
| T01-08 Release repeatability | Run UI, a11y, responsive, and visual suites twice from a clean checkout | Results are stable and screenshot baselines are versioned |

## Rollback and stop conditions

Stop the stage if the shell makes it possible to mistake simulated activity for real execution, if a user loses the active project/task context, or if a navigation change breaks authenticated access to files/settings. Stop and revert any visual change that introduces a keyboard trap, inaccessible status, or mobile task-start failure.

Rollback should be a versioned frontend release that restores the previous shell while preserving Stage 00 backend behavior. Do not delete user files or mutate server-side data as part of a UI rollback. If a component migration is incomplete, isolate it behind a route or feature flag rather than shipping mixed semantics that make test evidence ambiguous.

## Evidence package required for approval

The evidence package must include the component/token inventory, route map, fixture schemas, screenshot baseline manifest, visual diff report, viewport test report, accessibility report, keyboard walkthrough notes, performance measurements, regression report for existing editor workflows, and a list of known deviations. It must state which controls are simulated and identify the exact browser/test versions.

## Stage completion checklist

| Item | Required evidence | Status |
|---|---|---|
| Tokens and component primitives implemented | Token/component inventory | ☐ |
| Command Center implemented | UI test and screenshots | ☐ |
| Mock Task Workspace implemented | Fixture and behavioral tests | ☐ |
| Activity/computer panel implemented | Responsive tests and screenshots | ☐ |
| Editor/diff/artifact surfaces integrated | Editor regression report | ☐ |
| Mobile layout and safe-area behavior verified | V03–V06 report | ☐ |
| Accessibility and keyboard flows verified | A11y report and walkthrough | ☐ |
| Visual regression baselines approved | Diff report and reviewer decision | ☐ |
| All transition tests T01-01 through T01-08 pass | Transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../README.md "Nexuss-IDE repository README"
