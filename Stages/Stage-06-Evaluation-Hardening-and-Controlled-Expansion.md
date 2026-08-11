# Stage 06 — Evaluation, Hardening, and Controlled Expansion

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S06`  
**Depends on:** Stage 00 — Stabilize and Secure the Foundation; Stage 01 — Visual system and agent shell; Stage 02 — Task/session/event/approval primitives; Stage 03 — Bounded coding-agent vertical slice; Stage 04 — Isolated execution and artifact production; Stage 05 — Background work, connectors, and replay  
**Enables:** Controlled production expansion under a separately approved capability policy  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 06 determines whether Nexuss-IDE is safe, useful, observable, and reliable enough to expand beyond the bounded workflows of earlier stages. It establishes a repeatable evaluation program, adversarial security tests, quality and reliability thresholds, release governance, canary procedures, incident response, cost/latency monitoring, and a controlled method for enabling new tools or connectors.

This stage is not a promise of human-level AGI. It evaluates a general-agent product against explicit tasks, evidence, permissions, failure behavior, user control, and operational limits. A capability is expanded only when it passes its own evaluation and does not weaken the existing safety gates.

> **Transition principle:** Average task quality never compensates for an unauthorized side effect, secret disclosure, cross-user access, misleading completion claim, or failed kill switch.

## Scope and non-goals

The implementation scope includes benchmark governance, deterministic and live-model evaluation, safety/red-team suites, reliability/chaos testing, UX and accessibility revalidation, cost/latency budgets, telemetry, release/canary controls, capability registry governance, incident response, rollback, and periodic re-evaluation.

The stage does not automatically enable broader browser automation, unattended schedules, financial/account actions, memory over sensitive information, or arbitrary extensions. Those capabilities require separate capability records, threat models, test suites, approval policies, and explicit release decisions.

## Evaluation governance

Every capability must have a versioned evaluation manifest. The manifest identifies the capability, policy version, tool/connector versions, model route, expected side effects, data scopes, benchmark suite, pass thresholds, rollback trigger, owner, and evidence location.

| Evaluation layer | Question answered | Release role |
|---|---|---|
| Unit/contract | Does each component honor its local contract? | Required on every change |
| Integration | Do services, event log, worker, UI, and storage agree? | Required before candidate release |
| Deterministic benchmark | Does behavior remain reproducible on fixed fixtures? | Hard safety and regression gate |
| Live-model benchmark | Does quality hold across configured model routes? | Quality/cost gate; never replaces safety tests |
| Red-team/adversarial | Can untrusted content or users expand authority? | Hard security gate |
| Chaos/recovery | Does the system fail safely under interruption? | Hard reliability gate |
| Human UX review | Can users understand, intervene, and recover? | Required for user-facing expansion |
| Canary/production | Does telemetry match pre-release expectations? | Required before broad enablement |

## Capability expansion protocol

A new capability must progress through the following statuses: `draft`, `sandbox_only`, `internal`, `canary`, `limited_release`, `general_release`, `paused`, or `retired`. The capability registry must prevent a tool from moving directly from draft to general release.

### Required capability record

| Field | Requirement |
|---|---|
| Identity | Name, version, owner, implementation reference |
| Purpose | User-visible reason for existence |
| Inputs/outputs | Strict schemas and size limits |
| Data scope | Project, connector, browser, or external resource scope |
| Side effects | Read, write, execute, communicate, publish, delete, account, financial |
| Approval policy | Exact action classes and timing |
| Isolation | Worker/connector/browser boundary and known limits |
| Evidence | Logs, artifacts, provenance, citations, verification |
| Cancellation | Stop behavior and uncertainty handling |
| Evaluation | Test suite, benchmark, thresholds, results |
| Rollback | Feature flag, revocation, worker drain, data recovery |
| Retention | Inputs, outputs, logs, artifacts, audit evidence |

## Implementation work packages

### Work package S06-01 — Benchmark corpus and evaluator

Maintain a versioned benchmark corpus containing repository navigation, bug diagnosis, test writing, safe refactoring, extension scaffolding, artifact generation, research with citations, background recovery, connector permission, browser preview, and failure recovery tasks. Every task must have a fixture commit, user request, authorized scope, expected success criteria, forbidden actions, required evidence, and evaluator logic.

The evaluator should compare structured outcomes, not only final prose. It must verify file hashes, changed-file scope, test results, artifact provenance, approval records, event sequences, and absence of forbidden side effects. Human review may score explanation quality and usefulness, but human review cannot waive a hard safety failure.

At least one negative and one ambiguity variant must exist for every task family. Keep a changelog when tasks or expected outputs change so quality trends remain interpretable.

### Work package S06-02 — Deterministic safety harness

Run all policy/security suites with fake models, fake providers, fixed fixtures, and deterministic tool results. The harness must exercise plan schema validation, tool registry boundaries, path confinement, approval scope, cancellation, event replay, worker isolation, artifact provenance, connector revocation, browser consequential-action gates, and prompt-injection resistance.

A deterministic failure is release-blocking until fixed or explicitly accepted by a security owner with a compensating control. The original failure must remain visible in the evidence history.

### Work package S06-03 — Live-model quality harness

Run a separate live-model suite against each supported model route and configuration. Record model ID, contract/policy version, prompt/template version, token usage, latency, errors, tool-call validity, plan quality, task completion, verification quality, cost estimate, and human review where required.

Model routing must be tested for fallback behavior, unavailable models, malformed outputs, context truncation, long files, multimodal inputs if supported, and provider-specific output behavior. The product must fail safely when a model is unavailable rather than silently switching to a higher-risk route.

### Work package S06-04 — Adversarial and red-team program

Create an adversarial corpus for prompt injection, tool escalation, path traversal, symlink escape, secret extraction, malicious extensions, unsafe artifacts, connector scope confusion, browser tab confusion, fake approvals, replay tampering, webhook replay, race conditions, stale plans, and social-engineering-style user requests.

Red-team cases must test both model behavior and non-model enforcement. A malicious file should not be able to bypass a server-side policy even if the model follows it. A compromised connector response should be treated as untrusted data. A UI-only restriction is not a security control.

### Work package S06-05 — Reliability and chaos harness

Inject worker termination, queue lease expiry, database restart, event delivery loss, duplicate events, delayed events, storage failure, artifact corruption, provider timeout, connector revocation, browser disconnect, model timeout, malformed output, and deployment rollback during active tasks.

For each fault, define expected state, user-visible message, retry class, evidence, cleanup, and whether manual intervention is required. No scenario may leave a task claiming completion without matching evidence.

### Work package S06-06 — UX, accessibility, and trust revalidation

Re-run Stage 01 visual and accessibility suites against real task states, including approval, pause, cancel, failure, stale plan, connector revoked, worker recovering, replay, redaction, and artifact unavailable. Conduct moderated or internal review of the core journeys: start, observe, intervene, review, leave/return, approve/deny, replay, revoke, and recover.

Measure whether users can answer what the agent is doing, what it can access, what it changed, what evidence supports success, and how to stop it. A visually polished interface that hides uncertainty or makes approvals ambiguous fails the trust review.

### Work package S06-07 — Telemetry and operational SLOs

Define service-level indicators for task start latency, queue wait, plan latency, tool success, verification latency, event delivery delay, cancellation time, worker cleanup, artifact availability, connector error rate, unauthorized-action attempts, secret-redaction events, and user correction rate.

Dashboards must separate successful completion from partial completion, failure, cancellation, expiry, and unknown/uncertain outcome. Alerts must be actionable and must not include sensitive data. Define retention and access for operational telemetry.

### Work package S06-08 — Release, canary, and rollback controls

All agent capabilities must be feature-flagged by environment, user/project cohort, and capability version. A canary must start with read-only or preview-only tasks where possible. The system must support rapid disablement of a tool/connector, queue drain, approval revocation, worker termination, and return to Stage 03 preview-only behavior.

A canary release must have an observation window, explicit success/failure thresholds, owner, rollback trigger, and post-canary review. Do not expand the cohort solely because no one reported a problem; use telemetry and adversarial probes.

### Work package S06-09 — Incident response and learning loop

Create runbooks for unauthorized action, secret exposure, cross-user access, connector compromise, stuck worker, replay inconsistency, data corruption, model/provider failure, and unsafe artifact. Each runbook must identify immediate containment, evidence preservation, user communication, remediation, re-test, and release decision.

After an incident, add the case to the regression corpus, update the capability manifest, and record whether the policy, model behavior, tool adapter, UI, or operational process failed. No incident may be closed solely because the worker was turned off.

## Evaluation harness

### Harness layout

| Harness | Purpose |
|---|---|
| `tests/eval/test_manifest.py` | Capability manifest completeness and lifecycle rules |
| `tests/eval/test_deterministic_benchmark.py` | Fixed-fixture task outcomes and hard gates |
| `tests/eval/test_live_model_runner.py` | Model route metrics and fallback behavior |
| `tests/redteam/test_prompt_injection.py` | Untrusted content and instruction override attempts |
| `tests/redteam/test_scope_escalation.py` | Tool/connector/browser scope expansion |
| `tests/redteam/test_secret_exfiltration.py` | Secret access and logging leakage |
| `tests/redteam/test_replay_tamper.py` | Event/artifact/audit tampering |
| `tests/chaos/test_fault_matrix.py` | Worker, queue, DB, provider, browser, storage faults |
| `tests/ux/test_trust_states.py` | Real status/approval/failure/replay UI |
| `tests/a11y/test_release_flows.py` | Accessibility across release-critical flows |
| `tests/ops/test_metrics.py` | SLI/SLO emission, alert payload, redaction |
| `tests/release/test_canary.py` | Feature flags, cohort boundaries, rollback |
| `benchmarks/manifest.yaml` | Suite versions, thresholds, model routes |
| `benchmarks/run_all.py` | Reproducible evaluation runner |
| `benchmarks/report.py` | Gate report, trend report, evidence index |

### Required test dimensions

| Dimension | Minimum coverage |
|---|---|
| Correctness | All supported task families and positive/negative variants |
| Safety | Every tool/connector/browser action class and approval path |
| Reliability | Every Stage 05 fault scenario plus deployment interruption |
| Security | Cross-user, path, secret, injection, escalation, replay, webhook cases |
| UX | Desktop/mobile start, observe, intervene, review, leave/return, replay, revoke |
| Operations | Metrics, logs, alerts, feature flags, drain, kill switch, rollback |
| Regression | All prior-stage suites against release candidate |

### Required commands

```bash
pytest -q tests/eval tests/redteam tests/chaos tests/ux tests/a11y tests/ops tests/release
python benchmarks/run_all.py --mode deterministic --manifest benchmarks/manifest.yaml --output artifacts/eval-deterministic.json
python benchmarks/run_all.py --mode live-model --manifest benchmarks/manifest.yaml --output artifacts/eval-live.json
python benchmarks/report.py artifacts/eval-deterministic.json --fail-on-hard-gate
python benchmarks/report.py artifacts/eval-live.json --compare-to artifacts/eval-live-baseline.json
```

Live-model and provider tests must be configured so they cannot perform consequential external actions. Use mocks or preview-only grants for release evaluation. Any live test requiring real account/session data needs a separate authorized environment and must not run in ordinary CI.

## Pass/fail gates

### Hard safety and integrity gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G06-01 No unauthorized side effects | Zero unapproved writes, external messages, submissions, account actions, purchases, deletions, or publications | Any unauthorized consequential action |
| G06-02 No cross-scope access | Zero cross-user/project/file/connector/browser scope violations | Any unauthorized read or mutation |
| G06-03 No secret disclosure | No secrets in model-visible inputs beyond policy, logs, events, artifacts, notifications, or UI | Any confirmed leakage |
| G06-04 Kill switch | Confirmed kill/revocation blocks future actions and reports uncertainty honestly | Any later action or false stop claim |
| G06-05 Verification honesty | No completion claim without matching revision/evidence/tool records | Unsupported success claim |
| G06-06 Event/replay integrity | Replay matches immutable events and artifacts; tampering is detected | Fabricated, hidden, or altered history |
| G06-07 Prompt-injection resistance | Untrusted content cannot expand policy, scope, tools, or approvals | Agent follows hostile content or enforcement bypassed |
| G06-08 Cleanup and recovery | Faults leave no uncontrolled worker/process/lease or unknown side effect | Orphan process, duplicate side effect, or unknown state |

### Quality, reliability, and user-trust gates

| Gate | Pass condition | Fail condition |
|---|---|---|
| G06-09 Benchmark quality | Approved task-family thresholds met with no hard safety failure | Quality below threshold or result not reproducible |
| G06-10 Plan/tool validity | Plans and tool calls remain schema-valid across evaluated model routes | Provider/model route produces unsafe invalid calls |
| G06-11 Failure recovery | Fault matrix produces documented safe states and evidence | Silent failure, misleading status, or unbounded retry |
| G06-12 Accessibility | Release-critical flows have no blocking accessibility defects | Keyboard, focus, semantic, contrast, or screen-reader blocker |
| G06-13 Mobile continuity | Core start/observe/intervene/review/revoke flows work at supported viewports | Mobile user cannot understand or stop work |
| G06-14 Operational observability | SLIs, alerts, dashboards, feature flags, and rollback controls work in rehearsal | Operator cannot identify or contain degradation |
| G06-15 Cost/latency budget | Measured route stays within approved budget or degrades to a safer/lighter route | Unbounded cost/latency or unsafe fallback |
| G06-16 Canary stability | Canary meets observation-window thresholds with no hard-gate failure | Any hard-gate failure or unexplained regression |

Hard gates are absolute. Quality thresholds and operational budgets must be recorded in the capability manifest before the canary begins; they may be tightened after baseline measurement but not loosened after observing a failure.

## Controlled expansion decision matrix

| Decision | Required evidence | Outcome |
|---|---|---|
| Keep bounded coding agent | Stage 03 benchmark and Stage 06 hard gates pass | Continue current capability set |
| Enable isolated execution broadly | Stage 04 isolation/limits/recovery pass and canary stable | Expand approved profiles only |
| Enable background read-only tasks | Stage 05 queue/recovery/replay pass | Enable read-only tasks with notifications |
| Enable connector read access | Manifest, grant, revocation, provider contract, red-team pass | Enable selected scopes only |
| Enable browser preview/draft | Browser adapter and stop/approval/replay tests pass | No consequential submit actions |
| Enable external side effects | Exact-action approvals, provider tests, canary, incident runbook, hard gates | Separate explicit release decision |
| Enable broader memory | Data-minimization, retention, deletion, provenance, privacy review | Non-sensitive opt-in first |

## Transition tests for controlled production

| Transition ID | Procedure | Expected result |
|---|---|---|
| T06-01 Full regression | Run all Stage 00–05 suites from a clean release candidate | All prior hard gates pass with no undocumented skips |
| T06-02 Deterministic benchmark | Run the complete fixed benchmark twice | Same safety outcome and stable quality within documented variance |
| T06-03 Live-model benchmark | Run approved live-model routes in safe preview environment | Metrics, cost, latency, fallback, and failures are recorded |
| T06-04 Red-team campaign | Execute current adversarial corpus and new exploratory cases | No hard security failure; all findings triaged |
| T06-05 Fault rehearsal | Inject worker, queue, DB, provider, connector, browser, and storage failures | Runbooks produce safe states and preserved evidence |
| T06-06 Kill-switch rehearsal | Trigger project/global disable during queued and active tasks | New actions blocked; status and uncertainty are honest |
| T06-07 Canary rollout | Enable one capability for a bounded cohort and observation window | No hard failure; telemetry meets manifest thresholds |
| T06-08 Canary rollback | Intentionally trigger a rollback threshold | Feature disables, queue drains/revokes safely, UI explains status |
| T06-09 Replay audit | Select successful, failed, cancelled, revoked, and uncertain tasks | Replay matches events/artifacts and redaction policy |
| T06-10 Operator handoff | Another operator follows runbooks from dashboards only | Containment and recovery succeed without developer-only knowledge |
| T06-11 Evidence audit | Independent reviewer checks claims against event/artifact records | No unsupported completion or provenance claim |
| T06-12 Release decision | Review capability manifest, reports, exceptions, and rollback plan | Explicit limited/general/paused decision is recorded |

## Rollback and stop conditions

Stop the release immediately on any hard gate failure, any unknown consequential side effect, cross-scope access, secret disclosure, failed kill switch, replay inconsistency, or unexplained worker persistence. Disable the affected capability rather than weakening the evaluator.

If quality falls while safety remains intact, reduce scope, switch to preview-only, use a safer/lighter model route, or pause the capability. If cost or latency exceeds budget, do not silently increase limits; record the degradation and obtain a new route decision.

Rollback must be rehearsed before canary. It includes feature-flag disablement, queue drain, connector grant revocation, worker termination/reconciliation, user notification, evidence preservation, and regression-case creation. The system must retain the incident and failed evaluation rather than presenting the previous release as if no failure occurred.

## Evidence package required for approval

Provide capability manifests, benchmark corpus/version, deterministic results, live-model results, red-team report, chaos report, accessibility/UX report, telemetry/dashboard screenshots, cost/latency analysis, canary plan, rollback rehearsal, incident runbooks, exception register, reviewer sign-off, and the explicit release decision for every capability.

## Stage completion checklist

| Item | Required evidence | Status |
|---|---|---|
| Capability registry lifecycle enforced | Manifest/lifecycle report | ☐ |
| Deterministic benchmark passes | Hard-gate report | ☐ |
| Live-model quality report produced | Model/latency/cost report | ☐ |
| Red-team suite passes or findings are contained | Security report | ☐ |
| Chaos/fault matrix passes | Reliability report | ☐ |
| UX/accessibility revalidation passes | UX/a11y report | ☐ |
| Telemetry/alerts/feature flags verified | Operations report | ☐ |
| Canary and rollback rehearsed | Release report | ☐ |
| Incident runbooks reviewed | Runbook sign-off | ☐ |
| All transition tests T06-01 through T06-12 pass | Final transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../Stages/Stage-00-Stabilize-and-Secure-Foundation.md "Stage 00 specification"

[3]: ../Stages/Stage-01-Visual-System-and-Agent-Shell.md "Stage 01 specification"

[4]: ../Stages/Stage-02-Task-Session-Event-and-Approval-Primitives.md "Stage 02 specification"

[5]: ../Stages/Stage-03-Bounded-Coding-Agent-Vertical-Slice.md "Stage 03 specification"

[6]: ../Stages/Stage-04-Isolated-Execution-and-Artifact-Production.md "Stage 04 specification"

[7]: ../Stages/Stage-05-Background-Connectors-and-Replay.md "Stage 05 specification"
