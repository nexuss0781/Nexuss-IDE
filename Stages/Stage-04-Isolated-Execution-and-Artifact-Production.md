# Stage 04 — Isolated Execution and Artifact Production

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S04`  
**Depends on:** Stage 00 — Stabilize and Secure the Foundation; Stage 02 — Task/session/event/approval primitives; Stage 03 — Bounded coding-agent vertical slice  
**Enables:** Stage 05 — Background work, connectors, and replay  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 04 turns bounded tool intents into reliable, isolated, inspectable work products. It introduces an execution worker boundary for tests, linters, code generation helpers, and other approved local operations. The worker must have explicit command policy, finite lifetime, resource limits, narrow filesystem mounts, bounded output, cancellation, cleanup, and evidence capture.

This stage also introduces an artifact system that can store patches, reports, logs, images, previews, and generated documents with provenance. The system must make it possible to answer: which task created this artifact, which plan step and tool call produced it, which source revisions were used, which verification evidence supports it, and whether the artifact is safe to open or download.

> **Transition principle:** The worker is a disposable capability boundary, not a general-purpose server. Every process, file mount, network path, output stream, and artifact must be bounded, attributable, and removable.

## Scope and non-goals

The implementation scope includes worker lifecycle, job envelopes, command/profile allowlists, process isolation, resource quotas, network policy, filesystem mounts, output limits, cancellation, timeouts, cleanup, retry policy, artifact storage, content hashing, provenance, preview/download controls, and specialist-role orchestration hooks.

The stage does not add external connectors, authenticated browser automation, unattended schedules, cross-project memory, unrestricted shell access, privileged containers, or a promise of arbitrary code execution. Any worker implementation must be selected according to the deployment environment’s actual isolation guarantees and documented limitations.

## Execution architecture

```text
Stage 03 Tool Intent
        │
Policy/approval verification
        │
Execution job envelope
        │
Durable queue or local worker adapter
        │
Disposable worker
  ├─ command/profile allowlist
  ├─ read-only or scoped workspace mount
  ├─ resource limits
  ├─ network policy
  ├─ stdout/stderr capture
  ├─ timeout/cancellation watcher
  └─ cleanup/finalizer
        │
Execution result + evidence
        ├─ exit status and signal
        ├─ revision/hash set
        ├─ bounded logs
        ├─ metrics
        └─ artifact registrations
```

The API/orchestrator must not pass an arbitrary command string from the model directly to a shell. A verification or execution profile maps to a known command template, expected inputs, allowed environment variables, filesystem scope, resource limits, and output parser. Profile arguments are schema-validated and escaped by the worker adapter.

## Implementation work packages

### Work package S04-01 — Job envelope and worker contract

Define a versioned `ExecutionJob` envelope containing job ID, task ID, plan step ID, tool intent ID, project scope, base revision set, profile ID, validated arguments, approval reference, timeout, CPU/memory/output limits, network policy, filesystem mounts, cancellation token, and retention class.

Define an `ExecutionResult` containing job ID, worker ID, started/finished timestamps, exit status, signal/timeout status, profile ID, revision/hash set, stdout/stderr references, resource metrics, artifact references, cleanup status, and failure classification. The result must distinguish profile failure, process failure, timeout, cancellation, policy denial, infrastructure failure, and verification failure.

The worker must reject an envelope whose approval, task state, revision, scope, profile, or policy version no longer matches the current authoritative record.

### Work package S04-02 — Profile and command policy

Create a registry of execution profiles rather than exposing shell access. A profile must declare:

| Field | Requirement |
|---|---|
| `profile_id` and version | Immutable identifier used in evidence |
| Purpose | Human-readable reason for execution |
| Input schema | Strict allowed arguments |
| Command template | Fixed executable/arguments or safe builder; no raw model shell string |
| Workspace access | Read-only or declared writable paths |
| Network | Denied, allowlisted hosts, or controlled proxy |
| Environment | Explicit variable allowlist; no secret passthrough by default |
| Limits | Timeout, CPU, memory, process count, output bytes, artifact bytes |
| Approval class | Required decision and exact scope binding |
| Parser | Structured test/lint/result parser version |
| Cancellation | Signal/termination behavior and cleanup policy |

Initial profiles should be limited to repository-specific safe checks such as syntax validation, unit tests from a project-owned allowlist, formatting/lint checks, and static inspection. Each profile must be opt-in and health-checked.

Deny shell metacharacters, command substitution, redirection, pipelines, uncontrolled globbing, privilege escalation, device access, host filesystem paths, environment dumping, and network access not explicitly declared by the profile. A profile that needs one of these must be redesigned or escalated to a separate security review.

### Work package S04-03 — Isolation boundary

Choose and document the isolation mechanism for the deployment target. Acceptable mechanisms depend on the hosting environment and may include a dedicated process with OS limits, a container with a read-only root and constrained mounts, or a stronger sandbox. The implementation must not describe a normal subprocess as a security sandbox unless the actual host policy supports that claim.

At minimum, a worker must have a unique temporary directory, a narrow project mount, no access to application secrets, no access to the host’s credential stores, a controlled working directory, a finite process tree, and a cleanup path. The worker must run as a non-privileged identity where supported. Network access must be denied by default.

If the selected environment cannot provide the required isolation, the feature must remain disabled or be limited to a local developer-only mode with a prominent warning. Do not compensate for missing isolation by hiding the terminal panel.

### Work package S04-04 — Resource limits and cancellation

Implement hard timeouts with a warning phase followed by termination. Apply CPU, memory, process count, open-file, output, artifact, and temporary-storage limits appropriate to the host. Capture limit violations as structured results rather than allowing a worker to hang or exhaust the host.

Cancellation must be cooperative first and forceful after a bounded grace period. Terminate the entire process tree, not only the parent process. A cancelled job must not publish a successful artifact or verification result. If termination cannot be confirmed, mark cleanup uncertain and prevent the task from claiming completion.

### Work package S04-05 — Workspace snapshot and revision binding

A job must run against an explicit revision/hash set or a disposable snapshot. The worker must not silently observe changes made after the plan step was authorized. For read-only verification, mount the snapshot read-only. For generated patches or build outputs, use a disposable writable work directory and register only declared outputs.

The executor must verify the base revision before starting and report a conflict if the workspace has changed. If a job produces a patch, the patch must be checked against the declared scope before it can be returned to Stage 03.

### Work package S04-06 — Output capture and redaction

Capture stdout/stderr with byte limits, line or chunk boundaries, encoding handling, and truncation markers. Redact configured secret patterns before persistence and before rendering. Do not rely on the model to redact output. Output logs must carry job/profile/revision identifiers.

Structured parsers may extract test counts, failures, warnings, coverage, and diagnostics. Parser output must reference the raw bounded evidence and must be treated as untrusted until verified by the evaluator.

### Work package S04-07 — Artifact store and provenance

Implement an artifact service with content hashing, MIME/type detection, size limits, retention class, access scope, safe preview rules, and download authorization. Store metadata separately from content when possible. Artifact names must not permit path traversal or overwrite another artifact.

Every artifact must include:

| Provenance field | Meaning |
|---|---|
| Task/run/step/tool IDs | Causal origin |
| Source revision set | Inputs observed |
| Profile/model/policy versions | Production configuration |
| Created timestamp and hash | Integrity and chronology |
| Artifact kind | Patch, report, log, image, document, preview |
| Verification references | Evidence supporting claims |
| Redaction/safety status | Whether content was sanitized and reviewed |
| Retention and access scope | Lifecycle and authorization |

Generated HTML, SVG, Markdown, notebooks, and other active formats must have safe preview handling. The preview service must not execute embedded scripts or fetch arbitrary remote resources. Downloads require task/project authorization.

### Work package S04-08 — Cleanup and recovery

Make cleanup idempotent. On success, failure, timeout, cancellation, worker crash, host restart, and duplicate result delivery, the cleanup routine must remove temporary process/workspace state without deleting user files or durable evidence. Track cleanup status and reconcile orphaned jobs on startup.

A recovery scanner should find jobs in non-terminal states whose worker disappeared. It must classify them as retryable or failed according to profile policy and never re-run a side-effecting job without a new authorization check.

### Work package S04-09 — Specialist role hooks

Add internal interfaces for optional planner, executor, verifier, researcher, reviewer, and formatter roles without requiring every task to use multiple model calls. Each role must communicate through typed inputs/outputs and event references. The role graph must have depth, fan-out, token, time, and retry limits.

A specialist may propose a result, but the policy and verifier services remain authoritative. Do not expose an internal role’s unverified conclusion as final truth.

## Evaluation harness

The harness must test execution policy in a controlled environment and must include negative tests that attempt to escape the declared boundary. It must never run the escape corpus against a production host. Use a dedicated CI runner or disposable test environment with known capabilities.

### Harness layout

| Harness | Purpose |
|---|---|
| `tests/executor/test_job_schema.py` | Envelope/result validation and versioning |
| `tests/executor/test_profile_policy.py` | Profile allowlist and argument rejection |
| `tests/executor/test_isolation.py` | Filesystem, environment, user, process, and network boundaries |
| `tests/executor/test_limits.py` | Timeout, memory, CPU, process, output, artifact limits |
| `tests/executor/test_cancellation.py` | Cooperative/forceful cancellation and process-tree cleanup |
| `tests/executor/test_revision_binding.py` | Snapshot/hash conflict behavior |
| `tests/executor/test_output_redaction.py` | Secrets, encoding, truncation, parser safety |
| `tests/artifacts/test_store.py` | Hashing, type detection, authorization, safe preview, retention |
| `tests/artifacts/test_provenance.py` | Complete causal references and integrity |
| `tests/recovery/test_orphan_jobs.py` | Worker crash, restart, retry classification, no duplicate side effect |
| `tests/chaos/test_worker_failures.py` | Kill, timeout, disk-full, malformed result, duplicate delivery |
| `tests/ui/execution-panel.spec` | Job status, logs, artifacts, cancel, cleanup messages |
| `benchmarks/execution_suite.yaml` | Reproducible profiles and adversarial workload cases |

### Isolation test corpus

The corpus must attempt to read outside the project mount, enumerate environment variables, access application secrets, follow symlinks, create child processes, exceed process count, open network sockets, connect to denied hosts, write outside the output directory, fill temporary storage, emit oversized output, fork after cancellation, and return a malicious artifact. Each case must have an expected policy result.

### Required execution cases

| Case | Expected outcome |
|---|---|
| Safe syntax profile | Completes with bounded structured result and provenance |
| Profile argument injection | Rejected before process start |
| Unauthorized profile | Rejected by policy with approval event reference |
| Workspace escape | Process blocked or result marked failure; no outside read/write |
| Secret environment access | Secret absent; attempted access recorded without leakage |
| Timeout | Process tree terminated, job marked timeout, cleanup verified |
| Cancellation | No success publication; cleanup and event sequence complete |
| Output overflow | Output truncated with marker; worker remains healthy |
| Memory/CPU limit | Limit event captured; host remains responsive |
| Network denied | Connection fails or is blocked; no silent egress |
| Revision conflict | Job does not run against stale/changed inputs |
| Malicious artifact | Preview quarantined or rejected; no active content executes |
| Worker crash | Job recovered/classified; no duplicate side effect |

### Required commands

```bash
pytest -q tests/executor tests/artifacts tests/recovery tests/chaos
pytest -q tests/ui/execution-panel.spec
python benchmarks/run_execution_suite.py --mode isolated --output artifacts/execution.json
python benchmarks/report.py artifacts/execution.json --fail-on-gate
```

The evidence must identify the host/isolation mechanism, kernel/container/runtime details relevant to the guarantees, effective limits, and any tests that were skipped because the environment could not enforce them.

## Pass/fail gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G04-01 Job contract | Envelopes/results are schema-valid, versioned, scope-bound, and approval-bound | Missing scope/approval/revision or untyped result |
| G04-02 Profile policy | Only registered profiles with fixed safe argument builders can start | Raw model command or unknown profile executes |
| G04-03 Filesystem isolation | Worker cannot read/write outside declared mount/output scope | Any escape succeeds or cannot be determined |
| G04-04 Secret isolation | Application secrets and credential stores are unavailable to worker | Secret is readable or appears in logs/artifacts |
| G04-05 Network policy | Default-deny and allowlist behavior are proven | Undeclared egress succeeds or policy is unknown |
| G04-06 Resource limits | Time, CPU, memory, process, output, artifact, and storage bounds are enforced | Host exhaustion, unbounded output, or hanging process |
| G04-07 Cancellation | Process tree stops within documented bound and no success is published | Child survives, success appears after cancel, or cleanup unknown |
| G04-08 Revision binding | Job uses exact authorized snapshot/revision and rejects conflicts | Stale or changed workspace is silently used |
| G04-09 Output integrity | Truncation, encoding, redaction, and parser behavior are explicit and tested | Secret leakage, parser confusion, or unbounded capture |
| G04-10 Artifact provenance | Every artifact is hashed, authorized, typed, preview-safe, and causally linked | Orphan artifact, unsafe preview, missing origin, or unauthorized download |
| G04-11 Recovery | Worker crash/restart produces a safe retry/failure path without duplicate side effect | Duplicate run, lost evidence, or unsafe auto-retry |
| G04-12 UI truthfulness | Execution panel exposes real job state, limits, logs, cancellation, and cleanup status | UI claims success while worker/evidence is incomplete |

Any failure in G04-02 through G04-08 is a hard release failure. If isolation cannot be proven in the deployment environment, only a disabled or explicitly developer-local mode may exist; the persistent agent route may not be enabled.

## Transition tests to Stage 05

| Transition ID | Procedure | Expected result |
|---|---|---|
| T04-01 Approved verification | Create Stage 03 verification intent, approve exact profile/scope, execute job | Result is linked to task/step/approval/revision and appears in UI |
| T04-02 Denied execution | Deny the approval and attempt a worker claim | No process starts; denial is durable and visible |
| T04-03 Timeout recovery | Run a workload beyond timeout | Process tree is terminated, cleanup verified, task is not complete |
| T04-04 Cancellation recovery | Cancel during active execution | No success artifact; cancellation and cleanup evidence are complete |
| T04-05 Snapshot conflict | Modify project after job authorization, before start | Job is rejected or re-planned; no stale verification claim |
| T04-06 Artifact round trip | Produce patch/report/log artifact, reload after restart, download with authorized user | Hash/provenance and access scope remain intact |
| T04-07 Unauthorized download | Attempt artifact access from another user/project | Access denied without existence leakage |
| T04-08 Worker crash | Kill worker after process start and before result commit | Recovery classifies job; no duplicate side-effecting rerun |
| T04-09 Connector-ready envelope | Create a future browser/connector job envelope without executing it | Envelope carries scope, approval, limits, redaction, cancellation, and provenance fields |
| T04-10 Persistent handoff | Restart orchestrator with queued/running/terminal jobs | Durable queue/event state reconciles deterministically |

## Rollback and stop conditions

Stop the stage if any worker can access host secrets, escape filesystem scope, create undeclared egress, survive cancellation, or publish an artifact without provenance. Stop if the selected environment cannot substantiate the claimed isolation guarantee.

If artifact preview behavior is unsafe, disable preview and allow only download of safe, authorized types after content inspection. If background worker recovery is not correct, disable automatic retries and require manual review. If output redaction is incomplete, retain only metadata and discard raw output for the affected profile until fixed.

Rollback means disabling execution profiles, revoking worker claims, draining/terminating workers, and returning Stage 03 to preview-only or deterministic verification mode. Preserve task/event/artifact metadata and do not delete user workspace files as a cleanup shortcut.

## Evidence package required for approval

Provide the job/profile schemas, isolation design and effective runtime evidence, policy test report, escape corpus results, resource-limit report, cancellation/process-tree report, revision-binding report, redaction report, artifact/provenance report, chaos/recovery report, UI execution screenshots, and a list of deployment-specific limitations.

## Stage completion checklist

| Item | Required evidence | Status |
|---|---|---|
| Job envelope/result contract implemented | Schema and compatibility report | ☐ |
| Profile registry and command policy implemented | Profile policy report | ☐ |
| Worker isolation verified | Isolation/escape report | ☐ |
| Resource limits and cancellation verified | Limits and cancellation report | ☐ |
| Snapshot/revision binding verified | Conflict report | ☐ |
| Output capture/redaction verified | Redaction and parser report | ☐ |
| Artifact store/provenance implemented | Artifact integrity report | ☐ |
| Recovery and cleanup verified | Chaos/recovery report | ☐ |
| Stage 03 handoff integrated | End-to-end execution report | ☐ |
| All transition tests T04-01 through T04-10 pass | Transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../Stages/Stage-00-Stabilize-and-Secure-Foundation.md "Stage 00 specification"

[3]: ../Stages/Stage-02-Task-Session-Event-and-Approval-Primitives.md "Stage 02 specification"

[4]: ../Stages/Stage-03-Bounded-Coding-Agent-Vertical-Slice.md "Stage 03 specification"
