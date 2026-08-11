# Nexuss-IDE Stage Specifications

This directory contains the independent implementation and evaluation specifications for the Nexuss Agent Workspace roadmap. Each stage is a release-sized boundary with implementation work packages, a test/evaluation harness, explicit pass/fail gates, transition tests, rollback conditions, and an evidence checklist.

## Execution order

Stages must be completed in order. A later stage may consume a documented interface from an earlier stage, but it may not bypass an earlier hard gate.

| Stage | File | Purpose | Enables |
|---|---|---|---|
| S00 | [Stage 00 — Stabilize and Secure the Foundation](./Stage-00-Stabilize-and-Secure-Foundation.md) | Correct runtime defects, secure configuration, isolate workspaces, establish testing and observability | S01 |
| S01 | [Stage 01 — Visual System and Agent Shell](./Stage-01-Visual-System-and-Agent-Shell.md) | Replace drawer-centric UI with an original task-centered responsive shell | S02 |
| S02 | [Stage 02 — Task, Session, Event, and Approval Primitives](./Stage-02-Task-Session-Event-and-Approval-Primitives.md) | Add durable tasks, plans, events, approvals, cancellation, replay, and live event delivery | S03 |
| S03 | [Stage 03 — Bounded Coding-Agent Vertical Slice](./Stage-03-Bounded-Coding-Agent-Vertical-Slice.md) | Prove safe plan/read/diff/write/verify/result workflows | S04 |
| S04 | [Stage 04 — Isolated Execution and Artifact Production](./Stage-04-Isolated-Execution-and-Artifact-Production.md) | Add bounded workers, isolation, resource limits, cancellation, artifacts, and provenance | S05 |
| S05 | [Stage 05 — Background Work, Connectors, and Replay](./Stage-05-Background-Connectors-and-Replay.md) | Add durable background work, connector grants, browser-session boundaries, notifications, and replay | S06 |
| S06 | [Stage 06 — Evaluation, Hardening, and Controlled Expansion](./Stage-06-Evaluation-Hardening-and-Controlled-Expansion.md) | Govern benchmarks, red-team testing, canaries, rollback, and capability expansion | Approved capability releases |

## Required file contract

Every stage file must independently document the following:

| Required section | Meaning |
|---|---|
| Stage purpose | What the stage proves and why it exists |
| Scope and non-goals | What is and is not allowed in the stage |
| Implementation work packages | Concrete implementation obligations |
| Evaluation harness | Tests, fixtures, benchmark data, and commands |
| Pass/fail gates | Release-blocking conditions and quality gates |
| Transition tests | Tests that must pass before the next stage |
| Rollback and stop conditions | How to disable or revert safely |
| Evidence package | What must be attached for approval |
| Completion checklist | Human-readable release status |

## Gate policy

A stage is complete only when its blocking gates pass from a clean release candidate and its evidence package is reviewed. A later stage cannot compensate for a failed security, authorization, provenance, cancellation, or replay gate in an earlier stage.

The implementation roadmap remains at [the parent roadmap](../MANUS_INSPIRED_NEXUSS_ROADMAP.md). These files expand that roadmap into execution-grade specifications; they do not authorize code changes by themselves.

## Suggested repository layout for future implementation

The documentation intentionally does not force a framework migration. A future implementation may retain Flask/vanilla JavaScript or introduce a frontend component system, provided the stage contracts remain testable.

```text
Nexuss-IDE/
├── app.py or application factory
├── extensions/
├── migrations/
├── static/
├── templates/
├── tests/
│   ├── domain/
│   ├── security/
│   ├── ui/
│   ├── agent/
│   ├── executor/
│   ├── connectors/
│   ├── replay/
│   ├── chaos/
│   └── release/
├── benchmarks/
├── artifacts/
└── Stages/
```

## Approval workflow

For each stage, the implementation owner should attach the required evidence, mark every checklist item, record exceptions, and request approval to advance. A transition approval should identify the exact commit or release candidate, test commands, skipped tests, known limitations, and rollback target.
