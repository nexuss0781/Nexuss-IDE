# Stage 05 — Background Work, Connectors, and Replay

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S05`  
**Depends on:** Stage 00 — Stabilize and Secure the Foundation; Stage 02 — Task/session/event/approval primitives; Stage 04 — Isolated execution and artifact production  
**Enables:** Stage 06 — Evaluation, hardening, and controlled expansion  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 05 makes Nexuss persistent beyond the active browser tab. Users can leave a task, return later, approve a pending action, inspect notifications, revoke a capability, and replay the work from durable events. It introduces background execution, connector manifests, permission grants, browser-session adapters, resumability, and a user-visible audit/replay experience.

This stage is where the product approaches the observable behavior of a general work agent: it can continue a bounded task asynchronously, use explicitly connected capabilities, and present the path it took. It must not become an unattended side-effect engine. External communication, account actions, submissions, purchases, deletion, publication, and other consequential actions require exact approval at the time of action.

> **Transition principle:** Background execution increases the need for control, not the opposite. A task may continue without the page open only when its queue state, capability scope, cancellation path, approval status, and evidence remain durable and inspectable.

## Scope and non-goals

The implementation scope includes a durable worker/queue adapter, task resumption, notifications, connector registry and grants, browser-session adapter contracts, permission/revocation UI, replay controls, redacted audit views, scheduled/event-triggered task policy, and operational recovery.

The stage does not authorize a specific third-party provider, scrape authenticated services without permission, bypass CAPTCHA or access controls, send real external messages without confirmation, perform purchases, post content, modify accounts, or store broad credentials. A connector must be implemented only after its provider’s current API/webhook/session capabilities and terms are verified during implementation.

## Deployment route decision

The persistent route must be selected before implementation. The product should not silently assume that the current Flask process can provide durable background execution.

| Route | Suitable use | Tradeoffs | Gate |
|---|---|---|---|
| Active-session local worker | Private self-hosted use; tasks complete while service is running | Low setup; process restart and host shutdown require explicit recovery behavior | Must not claim 24/7 persistence |
| Managed durable worker service | Multi-user or always-on tasks with queue, worker, storage, notifications | More operational setup and security surface; requires persistent hosting | Must prove queue durability, isolation, kill switch, and recovery |
| Bounded lightweight mode | Notifications and resumable read-only tasks only | Lowest risk; no external side effects or long-running execution | Recommended fallback if durable worker guarantees are unavailable |

If a task is time-triggered and requires AI judgment only a few times per day, a scheduled execution path may be acceptable. Minute-level polling or always-on event reception requires a persistent process rather than repeated full-agent invocations. For any specific service, verify webhook/callback support before designing around webhooks; otherwise use a documented polling fallback with rate limits and a persistent host.

## Implementation architecture

```text
User UI
  ├─ Task inbox / status / approval / connector settings
  └─ Replay timeline / evidence inspector
        │
Task API and policy service
        ├─ Connector registry and grants
        ├─ Approval validation
        ├─ Cancellation/kill switch
        └─ Notification preferences
        │
Durable queue and scheduler
  ├─ Queue claim/lease/heartbeat
  ├─ Retry/dead-letter policy
  ├─ Scheduled trigger policy
  └─ Event-trigger adapter
        │
Workers and capability adapters
  ├─ Stage 04 isolated execution
  ├─ Read-only connector adapters
  ├─ Browser-session adapter
  └─ Artifact/evidence writer
        │
Persistence
  ├─ Task/event/approval records
  ├─ Connector/grant/revocation records
  ├─ Replay checkpoints
  ├─ Notification records
  └─ Redacted audit evidence
```

## Implementation work packages

### Work package S05-01 — Durable queue and worker leases

Implement a queue abstraction with job ID, task/step reference, priority, availability time, retry count, lease owner, lease expiry, heartbeat, attempt ID, and dead-letter reason. A worker may claim a job only when the task, plan step, approval, policy version, and revision scope are still valid.

Use leases rather than an in-memory “running” flag. A worker must renew its lease at a documented interval and relinquish it on completion, failure, cancellation, or shutdown. If a lease expires, recovery must classify the job according to whether its operation was read-only, reversible, or side-effecting. Side-effecting jobs must not be automatically retried without a new authorization check.

Implement queue fairness and bounds so one user/project cannot starve others. Record queue wait, execution time, retry count, and worker failure reason.

### Work package S05-02 — Resumability and task continuation

When the user leaves the page, the task continues only if its current step is authorized and the connector/tool scope remains valid. On return, the UI requests the latest task snapshot and event cursor. The server must reconstruct pending approvals, active leases, latest plan version, worker health, and artifacts.

A resumed task must detect stale plans, revoked connectors, expired approvals, changed project revisions, and policy version changes. It must pause and ask for a new approval or re-plan rather than continuing under obsolete authority.

### Work package S05-03 — Notification and inbox service

Create durable notifications for completion, failure, needs-input, needs-approval, cancellation, connector revocation, worker recovery, and security events. Each notification must reference task/event IDs, priority, user scope, created/read state, and a safe summary.

Notifications must not include secrets, raw browser content, unredacted command output, or sensitive external data. User preferences may control channel and urgency, but preferences cannot suppress high-severity security/revocation notifications.

Implement in-app notifications first. External delivery should remain an adapter with exact destination, content preview, approval requirement, retry policy, and delivery evidence.

### Work package S05-04 — Connector registry and grants

Define a connector manifest containing connector ID/version, provider, capability list, data scopes, authentication method, network endpoints, webhook/polling support, retention policy, revocation behavior, and health status. A grant must bind a user/project/task scope to selected capabilities and expire or be revocable.

Connector permissions must be least-privilege and human-readable. “Connected” must not mean “all account access.” The UI should show what the connector can read, what it can change, what data is retained, when it was last used, and how to revoke it.

The connector service must prevent a model from requesting additional scopes by simply describing them in text. Scope changes require a new user-visible grant and, where appropriate, an authentication step.

### Work package S05-05 — Browser-session adapter

Implement a provider-neutral adapter interface for an explicitly connected browser/session capability. The adapter must expose only the active session/tab/page context granted by the user, and must return structured observations with URL/origin, title, screenshot or DOM reference where permitted, and redaction status.

Browser actions must be categorized:

| Action class | Default policy |
|---|---|
| Inspect permitted page | Allowed only within granted tab/session scope; log observation |
| Navigate within permitted scope | Approval or policy-controlled depending on connector |
| Fill non-sensitive draft fields | Preview-first; no submit |
| Read sensitive/account data | Explicit scope and approval; redact by default |
| Submit form, post, send, purchase, delete, change account | Exact confirmation immediately before action |
| Login, MFA, CAPTCHA, credential entry | User takeover/manual action; agent must not capture secrets |
| Download/upload file | Explicit scope, type/size checks, provenance |

The adapter must provide a stop/kill action that prevents subsequent browser steps. It must not claim that a browser action occurred unless the browser event confirms it.

### Work package S05-06 — Event triggers and schedules

Implement a trigger registry for manual, fixed-time, and provider-event triggers. Each trigger must specify owner/project, task template, data scope, schedule/timezone, maximum frequency, concurrency policy, enable/disable state, and delivery target. Triggered tasks must create normal Stage 02 tasks and events; they must not bypass approvals.

For provider event sources, verify current webhook/callback support during the provider implementation. If webhook support is absent, use bounded polling with explicit rate limits, deduplication keys, last-seen cursor, backoff, and a persistent host. Do not use a full AI session for deterministic minute-level polling.

Scheduled tasks that can create external side effects must either remain preview-only or request approval per run. “Approve this schedule forever” is not a substitute for scope-aware policy unless a separate high-trust policy is explicitly designed and reviewed.

### Work package S05-07 — Replay and audit interface

Build replay from immutable task events, checkpoints, tool evidence, approvals, connector grants, and artifact provenance. The replay view must show a timeline, plan revisions, worker/connector context, approval decisions, evidence links, and redaction notices.

Replay must support pause/scrub, step selection, event detail, diff/artifact inspection, and a “why did this happen?” explanation based on recorded event metadata. It must not regenerate history by re-running the model. A replay is an inspection of what happened, not a new execution.

Sensitive fields must be redacted according to the viewer’s authorization. Audit evidence must be protected from user edits; user-facing annotations may be stored separately.

### Work package S05-08 — Revocation and kill switch

Implement global and scoped kill switches. A user must be able to stop the current task, revoke a connector, disable a trigger, and disable all autonomous actions for the project. An administrator or operator, where applicable, must be able to disable a capability globally.

Revocation must invalidate future claims and approvals, stop or quarantine active workers where possible, prevent new browser actions, and generate a durable security event. The UI must show whether shutdown was confirmed, pending, or uncertain.

### Work package S05-09 — Background operational controls

Add queue metrics, worker heartbeats, dead-letter inspection, retry dashboards, task age, connector health, trigger failures, and storage usage. Provide safe maintenance operations for pausing new work, draining the queue, disabling a profile, and recovering orphaned jobs.

Operational controls must be authenticated and audited. A dashboard button must not silently delete evidence or user artifacts.

## Evaluation harness

The harness must validate durability, permission boundaries, connector revocation, replay fidelity, and recovery under process failures. Provider-specific adapters require contract tests against a mock provider; live provider tests must be isolated, read-only, and explicitly authorized.

### Harness layout

| Harness | Purpose |
|---|---|
| `tests/queue/test_leases.py` | Claim, renew, expire, duplicate claim, fairness |
| `tests/queue/test_retry_policy.py` | Retry classes, dead-letter, side-effect restrictions |
| `tests/background/test_resume.py` | Page leave/reconnect/restart/resume |
| `tests/notifications/test_inbox.py` | Durable notification states and redaction |
| `tests/connectors/test_manifest.py` | Manifest schema, scopes, health, versioning |
| `tests/connectors/test_grants.py` | Grant, expiry, scope reduction, revocation |
| `tests/browser/test_session_adapter.py` | Active tab/session scope, observation/action contract |
| `tests/browser/test_consequential_actions.py` | Confirm-before-submit/post/purchase/delete |
| `tests/triggers/test_schedule.py` | Timezone, frequency, dedupe, concurrency, disable |
| `tests/triggers/test_webhook_contract.py` | Signature verification and replay protection for mock provider |
| `tests/replay/test_replay_fidelity.py` | Replay state, artifacts, approvals, redaction |
| `tests/recovery/test_worker_restart.py` | Crash, lease expiry, recovery, no duplicate side effect |
| `tests/security/test_revocation.py` | Kill switch and connector revocation race conditions |
| `tests/ui/background.spec` | Inbox, task resume, approval, connector settings |
| `tests/ui/replay.spec` | Timeline scrub, detail, redaction, artifact provenance |
| `benchmarks/background_suite.yaml` | Durable task and permission scenarios |

### Required scenario matrix

| Scenario | Expected result |
|---|---|
| Leave page during read-only task | Task continues or pauses according to policy; return shows complete event history |
| Worker lease expires before result | Job is classified/recovered; no duplicate side-effecting action |
| Approval expires while queued | Claim is denied and task waits for new approval |
| Connector revoked while active | Future calls stop; active operation is terminated/quarantined where possible |
| Trigger disabled during schedule window | No new task is created after durable disable |
| Duplicate webhook/event | One task/event through dedupe key; duplicate is ignored and audited |
| Invalid webhook signature | Rejected without task creation |
| Replay after redaction | Viewer sees safe redaction marker and original event identity |
| Browser submit without approval | Adapter refuses before action; no page mutation |
| Browser stop during action sequence | No subsequent action is issued; status is honest |
| User leaves and returns after worker restart | Task snapshot, cursor, approvals, and artifacts remain consistent |
| High-priority security event | Notification cannot be suppressed by ordinary preferences |
| External delivery failure | Retry/dead-letter evidence appears; task result is not falsely delivered |

### Required commands

```bash
pytest -q tests/queue tests/background tests/notifications tests/connectors
pytest -q tests/browser tests/triggers tests/replay tests/recovery tests/security
pytest -q tests/ui/background.spec tests/ui/replay.spec
python benchmarks/run_background_suite.py --output artifacts/background.json
python benchmarks/report.py artifacts/background.json --fail-on-gate
```

## Pass/fail gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G05-01 Queue durability | Jobs survive page/process restart with leases, cursors, and state intact | In-memory-only state, duplicate claim, or lost task |
| G05-02 Retry safety | Retry/dead-letter policy distinguishes read-only/reversible/side-effecting work | Side-effecting job auto-retries without fresh authorization |
| G05-03 Resume correctness | Reconnect detects stale plans, revoked grants, expired approvals, and revision conflicts | Task resumes under obsolete authority |
| G05-04 Notification integrity | Notifications are durable, scoped, redacted, and actionable | Secrets leak, task scope leaks, or completion is not represented |
| G05-05 Connector least privilege | Manifest/grant exposes only selected scopes and revocation is effective | Broad implicit access, hidden scope, or ineffective revoke |
| G05-06 Browser safety | Sensitive login/submission/post/purchase/delete/account actions require exact confirmation | Any consequential action occurs without confirmation |
| G05-07 Trigger safety | Schedule/event triggers dedupe, respect disable/frequency/concurrency, and preserve approvals | Duplicate tasks, uncontrolled polling, or approval bypass |
| G05-08 Replay fidelity | Replay reconstructs actual events/artifacts/approvals without re-execution | Replay invents steps, hides failure, or reruns work |
| G05-09 Kill switch | User/project/global kill switch blocks future work and records result | Worker or connector continues after confirmed revocation |
| G05-10 Recovery | Worker/connector/provider failures produce bounded, visible recovery | Silent loss, duplicate side effect, or unbounded retry |
| G05-11 Audit integrity | Redacted audit evidence is immutable and viewer-scoped | User can rewrite or access another task’s evidence |
| G05-12 Operational readiness | Queue, worker, trigger, connector, storage, and failure metrics are observable | Operator cannot distinguish stuck, failed, revoked, or complete |

Any unauthorized external action, cross-user connector access, replay fabrication, or failure to honor a confirmed kill switch is a hard release failure. If the browser adapter cannot confirm an action, it must report uncertainty rather than success.

## Transition tests to Stage 06

| Transition ID | Procedure | Expected result |
|---|---|---|
| T05-01 Background coding task | Start a Stage 03/04 task, close UI, restart browser, return after worker progress | Task state, events, artifacts, and approvals reconcile correctly |
| T05-02 Approval after reconnect | Leave task at approval, reconnect as owner, approve exact action | Only exact authorized action proceeds and event links remain intact |
| T05-03 Revocation race | Revoke connector while a worker is preparing a call | Call is denied/terminated; no later call is issued |
| T05-04 Browser preview | Perform read/preview/draft browser workflow through mock adapter | No consequential action occurs; observations and scope are logged |
| T05-05 Browser confirmation | Attempt form submit/post/purchase/delete with and without confirmation | Without confirmation denied; with exact confirmation one action and evidence |
| T05-06 Trigger dedupe | Deliver duplicate provider event and schedule overlap | One deduplicated task with auditable duplicate handling |
| T05-07 Webhook authenticity | Send valid, invalid, replayed, and stale mock webhook signatures | Only valid fresh event accepted |
| T05-08 Replay verification | Replay a completed, failed, cancelled, and revoked task | Timeline matches durable events and redaction policy exactly |
| T05-09 Kill switch | Activate project/global kill during queued and active tasks | Future claims blocked, active status honest, security event durable |
| T05-10 Operator recovery | Kill worker and restart queue service with jobs in every state | Reconciliation produces no duplicate side effect and clear evidence |

## Rollback and stop conditions

Stop immediately if a background worker can execute after task cancellation/revocation, a connector can access a scope outside its grant, a browser adapter performs a consequential action without exact confirmation, a webhook can create duplicate tasks, or replay can fabricate or hide actions.

If provider integration is unreliable or its current webhook/session behavior cannot be verified, keep the adapter at mock/read-only status and do not ship the provider connector. If persistent hosting cannot guarantee the required queue/worker/kill-switch behavior, fall back to lightweight mode and explicitly disable unattended execution.

Rollback means disabling triggers and external connectors, draining/revoking workers, invalidating grants, returning tasks to manual/preview mode, and preserving audit evidence. Do not erase replay history to hide a connector failure.

## Evidence package required for approval

Provide the deployment route decision, queue/lease design, recovery report, connector manifests and scope matrix, mock-provider contract tests, browser action policy tests, trigger/webhook authenticity report, replay fidelity report, revocation/kill-switch report, notification redaction report, operational dashboard screenshots, and a list of any provider-specific capabilities not yet verified.

## Stage completion checklist

| Item | Required evidence | Status |
|---|---|---|
| Durable queue and leases implemented | Queue/recovery report | ☐ |
| Resume/reconnect behavior implemented | Background task report | ☐ |
| Notifications/inbox implemented | Notification/redaction report | ☐ |
| Connector registry/grants implemented | Scope/revocation report | ☐ |
| Browser adapter is mock/read-only or fully gated | Browser safety report | ☐ |
| Schedules/event triggers implemented safely | Trigger/webhook report | ☐ |
| Replay/audit interface implemented | Replay fidelity report | ☐ |
| Kill switch and operator controls verified | Revocation report | ☐ |
| Stage 04 handoff integrated | End-to-end background report | ☐ |
| All transition tests T05-01 through T05-10 pass | Transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../Stages/Stage-00-Stabilize-and-Secure-Foundation.md "Stage 00 specification"

[3]: ../Stages/Stage-02-Task-Session-Event-and-Approval-Primitives.md "Stage 02 specification"

[4]: ../Stages/Stage-04-Isolated-Execution-and-Artifact-Production.md "Stage 04 specification"

[5]: https://manus.im/features/manus-browser-operator "Public Browser Operator interaction reference"
