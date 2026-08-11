# Stage 02 — Task, Session, Event, and Approval Primitives

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S02`  
**Depends on:** Stage 00 — Stabilize and Secure the Foundation; Stage 01 — Visual system and agent shell  
**Enables:** Stage 03 — Bounded coding-agent vertical slice  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 02 gives Nexuss-IDE a durable and auditable unit of work. A task must survive page refresh, reconnect, process restart, and ordinary delivery delays. Its plan, messages, approvals, tool-intent records, status transitions, and event history must be stored as explicit records rather than inferred from transient UI state.

This stage does not execute real agent tools. It provides the lifecycle and authorization substrate that Stage 03 will use. The system must be able to represent work that is queued, running, paused, waiting for input, waiting for approval, completed, failed, cancelled, or expired, and it must prevent invalid transitions.

> **Transition principle:** A task is not “real” because the UI displays it. It is real only when the server has a durable record, a monotonic event history, explicit ownership, and a state transition that can be replayed and audited.

## Scope and non-goals

The implementation scope includes database models/migrations, task and session APIs, append-only events, plan versions, approval records, cancellation and pause semantics, idempotency, event delivery, replay reconstruction, optimistic concurrency, redaction, retention, and UI integration with the Stage 01 shell.

The stage does not call an LLM, write project files, run terminal commands, browse, send external messages, or create unattended jobs. Tool calls may be recorded as planned or denied records for testing, but no production side effect is allowed until Stage 03 introduces the bounded coding tools.

## Domain model and invariants

### Required entities

| Entity | Required fields | Invariants |
|---|---|---|
| `Project` | `id`, `owner_id`, `name`, `root_ref`, `status`, timestamps | Owner scope is immutable; inactive projects cannot accept new tasks |
| `Task` | `id`, `project_id`, `owner_id`, `request`, `status`, `risk_class`, `version`, timestamps | Owner/project scope is enforced; status changes are event-backed |
| `TaskMessage` | `id`, `task_id`, `role`, `content_ref`, `redaction_status`, timestamp | Messages cannot cross task scope; secrets are redacted before persistence where required |
| `Plan` | `id`, `task_id`, `version`, `goal`, `success_criteria`, `status`, timestamp | Versions are immutable after publication; revisions reference parent version |
| `PlanStep` | `id`, `plan_id`, `ordinal`, `objective`, `status`, dependencies, approval class | Ordinal/dependency graph is acyclic and deterministically ordered |
| `Approval` | `id`, `task_id`, `scope`, `risk`, `status`, `decided_by`, timestamp | Approval is bound to exact scope and plan/tool intent; no broad implicit approval |
| `TaskEvent` | `id`, `task_id`, `sequence`, `type`, `payload_ref`, timestamp | Sequence is monotonic per task; append-only; duplicate client keys are idempotent |
| `ToolIntent` | `id`, `task_id`, `step_id`, `tool_name`, `arguments_ref`, side-effect class, status | Intent is not execution; denied/expired intent cannot execute later |
| `ArtifactRef` | `id`, `task_id`, `kind`, `uri/ref`, provenance, status | Artifact belongs to task/project scope and has provenance metadata |
| `TaskCheckpoint` | `id`, `task_id`, `last_event_sequence`, `state_snapshot`, timestamp | Snapshot can reconstruct state up to its recorded sequence |

### State machine

The canonical task states are `draft`, `queued`, `planning`, `awaiting_input`, `awaiting_approval`, `executing`, `verifying`, `paused`, `completed`, `failed`, `cancel_requested`, `cancelled`, and `expired`.

| From | Allowed next states | Required reason/event |
|---|---|---|
| `draft` | `queued`, `cancelled` | Submission or user cancellation |
| `queued` | `planning`, `cancel_requested`, `expired` | Worker claim, cancellation, TTL expiry |
| `planning` | `awaiting_input`, `awaiting_approval`, `executing`, `failed`, `cancel_requested` | Plan result or failure |
| `awaiting_input` | `planning`, `cancel_requested`, `expired` | User response, cancellation, TTL expiry |
| `awaiting_approval` | `executing`, `cancel_requested`, `failed`, `expired` | Explicit approval/denial or TTL expiry |
| `executing` | `verifying`, `paused`, `cancel_requested`, `failed` | Tool result, pause, cancellation, failure |
| `verifying` | `completed`, `planning`, `failed`, `cancel_requested` | Verification result, replan, failure |
| `paused` | `executing`, `planning`, `cancel_requested`, `expired` | Resume, replan, cancellation, TTL expiry |
| `cancel_requested` | `cancelled`, `failed` | Confirmed cancellation or cancellation failure |
| `completed` | None | Terminal state |
| `failed` | None or explicitly `reopened` only if a later stage approves it | Terminal by default |
| `cancelled` | None | Terminal state |
| `expired` | None | Terminal state |

The service must reject every transition not in the table, including client attempts to jump directly from `draft` to `completed`. Every accepted transition must append a durable event in the same transaction as the state mutation.

## Implementation contract

### Work package S02-01 — Schema and migration

Add migrations for the entities above, using foreign keys, ownership indexes, task status indexes, event sequence constraints, and uniqueness constraints for idempotency keys. Use a database transaction for state mutation plus event append. If the selected database cannot enforce a per-task monotonic sequence with a simple constraint, implement a transaction-safe allocator and test concurrent writers.

Content that may contain secrets or large outputs must be stored through a redaction/content-reference layer rather than embedded unbounded in event rows. The event payload should contain a typed summary, content reference, redaction status, and schema version.

### Work package S02-02 — Task service and API

Implement service methods such as `create_task`, `get_task`, `list_tasks`, `submit_task`, `transition_task`, `append_event`, `request_cancel`, `pause_task`, `resume_task`, `create_plan_version`, `create_approval`, `decide_approval`, and `replay_task`.

API requests must include an idempotency key for task creation and state-changing operations. The server must return the original result when it receives a duplicate key with the same request hash and reject reuse with a different request body. All resource reads and mutations must enforce project/owner scope.

The API should return stable JSON shapes. A task response must contain task metadata, current status, current plan version, latest event sequence, pending approvals, and a replay cursor. A transition response must contain previous status, next status, event sequence, and correlation ID.

### Work package S02-03 — Event log and replay

Define versioned event types such as `task.created`, `task.submitted`, `plan.created`, `plan.revised`, `task.status_changed`, `approval.requested`, `approval.decided`, `task.paused`, `task.resume_requested`, `task.cancel_requested`, `task.cancelled`, `task.failed`, `task.completed`, `artifact.registered`, and `task.expired`.

Events are append-only and must never be edited to correct a display issue. Corrections are new events. The replay service must reconstruct the task state by applying events in sequence and must detect gaps, duplicate sequences, invalid event schemas, and an event whose payload contradicts the state machine.

Create checkpoints at a documented cadence for large histories, but always verify that replaying from the last checkpoint plus subsequent events yields the same state as a full replay. User-facing replay should support pagination and a bounded detail view; never load unbounded event payloads into the browser.

### Work package S02-04 — Approval service

An approval must state the exact capability, resource scope, arguments or content preview, side-effect class, expiry, requesting plan step, and decision. Approval classes should at least distinguish read-only, reversible local write, code execution, external data access, external communication, account-sensitive action, and irreversible/destructive action.

The decision endpoint must verify that the task is still in the same plan/tool scope, the approval has not expired, the approver owns the task or has an authorized role, and the request is not already decided. Approval must not be inferred from the user having approved an earlier unrelated task.

Stage 02 can render an approval preview in the UI, but the action behind an “approve” button must only authorize a future intent record. It must not execute a tool.

### Work package S02-05 — Cancellation, pause, and concurrency

Implement cooperative cancellation tokens and task-level cancellation state. A cancellation request should append an event immediately, prevent new work from being claimed, and allow a later worker acknowledgment. If cancellation cannot stop an already-running operation, the task must show `cancel_requested` and retain the operation’s evidence rather than falsely claiming instant cancellation.

Pause must prevent new execution steps but must not delete the plan or history. Resume must require the task to remain within its TTL and policy scope. Use optimistic version checks or row locks to prevent two browser tabs from making conflicting transitions.

### Work package S02-06 — Live event delivery

Feed the Stage 01 activity panel from persisted events through Socket.IO or an equivalent stream. Delivery is an optimization; the database remains the source of truth. On reconnect, the client must send its last seen sequence and receive missing events or a resync instruction.

Client rendering must be idempotent. Receiving the same event twice must not duplicate a timeline row, double-increment a badge, or apply a status transition twice. Out-of-order events must be buffered or trigger a resync rather than silently reordering history.

### Work package S02-07 — Retention and redaction

Define retention classes for task metadata, event summaries, content payloads, artifacts, and audit evidence. Redact secrets before persistence or before user-facing rendering, and record that redaction occurred. Provide a test-only purge command that deletes temporary task data without altering immutable audit evidence rules.

## Evaluation harness

The harness must test the domain service independently from Flask routes and then test the full API/UI seam. Use a transaction-capable test database. The concurrency suite should use multiple workers or threads against the same database rather than mocked single-thread behavior.

### Harness layout

| Harness | Purpose |
|---|---|
| `tests/domain/test_task_state_machine.py` | Exhaustive valid/invalid transition checks |
| `tests/domain/test_event_log.py` | Append-only events, sequence allocation, schema versions |
| `tests/domain/test_replay.py` | Full replay, checkpoint replay, gap/duplicate detection |
| `tests/domain/test_approval.py` | Exact scope, expiry, idempotency, denial, race conditions |
| `tests/domain/test_cancellation.py` | Pause, cancel request, worker acknowledgment, terminal behavior |
| `tests/api/test_task_api.py` | Authentication, authorization, idempotency, JSON contracts |
| `tests/api/test_event_stream.py` | Reconnect cursor, duplicate/out-of-order delivery, resync |
| `tests/concurrency/test_task_races.py` | Two tabs/workers racing transitions and approvals |
| `tests/security/test_task_scope.py` | Cross-user/project enumeration and mutation attempts |
| `tests/ui/task-persistence.spec` | Refresh, reconnect, replay, pending approval rendering |
| `tests/contract/test_task_schemas.py` | JSON schema validation and backward-compatible versions |

### Property and mutation tests

Use property-based generation for transition sequences. Generate random valid paths through the state machine and assert that replay produces the same terminal/current state. Generate invalid insertions and assert rejection without partial event append. Mutate event order, remove an event, duplicate an event, change a payload schema version, and alter an ownership field; the replay or authorization gate must fail closed.

Use mutation testing on the transition guard, approval scope comparison, idempotency comparison, and sequence allocator. The stage should record the mutation score for these security-critical modules and fail if a mutation that removes a required guard survives.

### Required commands

```bash
pytest -q tests/domain tests/api tests/concurrency tests/security
pytest -q tests/contract
pytest -q tests/ui/task-persistence.spec
python -m flask --app app:create_app db upgrade
```

If the project adopts a schema validation tool, run its contract-generation and validation command in CI. If Socket.IO is retained, include a real test client or a protocol-compatible mock that exercises reconnect cursors; do not test only a direct function call.

## Pass/fail gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G02-01 Schema integrity | Empty and legacy migrations apply; all ownership/FK/index constraints are present | Migration failure, missing owner scope, or unconstrained task/event data |
| G02-02 State-machine integrity | Every valid transition passes and every invalid transition is rejected with no partial mutation | Illegal transition succeeds or status/event diverge |
| G02-03 Event immutability | Events are append-only, versioned, ordered, and replayable | Event can be edited/deleted or replay state differs from stored state |
| G02-04 Replay correctness | Full and checkpoint replay produce identical state across generated valid histories | Gap, duplicate, or schema corruption is silently accepted |
| G02-05 Approval correctness | Approval is exact-scope, expiring, idempotent, and cannot authorize a changed intent | Broad/stale/duplicated approval authorizes a different action |
| G02-06 Idempotency | Duplicate request with same key/body returns same result; key/body mismatch is rejected | Duplicate creates tasks, events, approvals, or transitions |
| G02-07 Concurrency | Competing writers produce one valid outcome and no duplicate transition | Lost update, double approval, duplicate sequence, or split-brain status |
| G02-08 Cancellation/pause | Requests are durable, prevent future work, and represent delayed acknowledgment honestly | Task continues to accept new work after cancellation or falsely reports stopped |
| G02-09 Stream recovery | Refresh/reconnect resumes from cursor without duplicates or missing events | UI silently loses history or duplicates timeline/badges |
| G02-10 Scope and redaction | Cross-user access is denied; secret fixtures are not exposed in event/UI payloads | Enumeration, leakage, or raw sensitive payload exposure |
| G02-11 Contract stability | API schemas validate and documented errors are stable | UI must guess response shape or breaks on versioned payload |
| G02-12 UI integration | Stage 01 activity panel renders real persisted fixture/task events | UI remains dependent on in-memory mock state |

Any failure in G02-01 through G02-10 is blocking. G02-11 and G02-12 must pass before Stage 03 begins because the coding agent cannot be evaluated against an unstable lifecycle.

## Transition tests to Stage 03

| Transition ID | Procedure | Expected result |
|---|---|---|
| T02-01 Task round trip | Create, submit, refresh, reconnect, and replay a task | Same task state and ordered events are visible from API and UI |
| T02-02 Plan publication | Create plan v1, revise to v2, and inspect history | v1 remains immutable; v2 references v1; UI shows current plan and revision history |
| T02-03 Approval denial | Create a tool-intent placeholder, request approval, deny it, then attempt execution claim | Claim is rejected and denial event remains durable |
| T02-04 Approval expiry | Let an approval expire and attempt to use it | Request is denied with explicit expiry reason; no status corruption |
| T02-05 Cancellation race | Race cancellation against a queued transition and a simulated running worker | No new step starts after durable cancellation request; acknowledgment state is honest |
| T02-06 Event reconnect | Deliver events through sequence N, disconnect, then reconnect with cursor N | Only N+1 onward is delivered, or a documented resync occurs |
| T02-07 Scope attack | Use task/project IDs from a second user in every API route | All reads/mutations return safe authorization errors |
| T02-08 Tool-intent handoff | Register a read-only tool intent fixture with schema-valid arguments | Stage 03 can claim the intent through a documented service interface, but no tool runs in Stage 02 |
| T02-09 Failure finalization | Inject malformed event, worker error, and verification failure fixture | Task enters a valid failure path with evidence and no misleading completion |
| T02-10 Clean replay release | Export a task event fixture and replay it in a clean environment | Reconstructed result is deterministic and version-compatible |

## Rollback and stop conditions

Stop immediately if a task can transition to a terminal success state without a valid plan/event path, if an approval can be reused for changed arguments, if a user can access another user’s task, or if an event log can be altered to erase evidence. Preserve the failing event sequence as a permanent regression fixture.

If a migration fails after deployment, stop new task creation, put the system into read-only maintenance mode, preserve the database, and execute the verified rollback/restore procedure from Stage 00. Do not repair state by directly editing event rows. Corrective state changes must be represented as new, audited events.

If live delivery is unreliable, disable the live stream and fall back to cursor-based polling/replay rather than presenting incomplete activity as complete. The task service and database remain authoritative.

## Evidence package required for approval

Provide migration files and schema inspection output, state-machine transition table, API/OpenAPI or JSON schema contracts, event type registry, replay determinism report, concurrency test report, property/mutation test report, approval race report, redaction report, stream reconnect report, UI integration screenshots, and the exact database/runtime configuration used.

## Stage completion checklist

| Item | Required evidence | Status |
|---|---|---|
| Task/session/project schema migrated | Migration and schema report | ☐ |
| State machine implemented and guarded | Exhaustive transition report | ☐ |
| Append-only event log implemented | Event registry and replay report | ☐ |
| Plan versioning implemented | Plan revision fixtures | ☐ |
| Approval scope/expiry/idempotency implemented | Approval race report | ☐ |
| Pause/cancel/reconnect implemented | Lifecycle report | ☐ |
| API contracts validated | Contract test report | ☐ |
| Stage 01 shell uses persisted events | UI integration report | ☐ |
| Security/concurrency gates pass | Security and race reports | ☐ |
| All transition tests T02-01 through T02-10 pass | Transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../Stages/Stage-00-Stabilize-and-Secure-Foundation.md "Stage 00 specification"

[3]: ../Stages/Stage-01-Visual-System-and-Agent-Shell.md "Stage 01 specification"
