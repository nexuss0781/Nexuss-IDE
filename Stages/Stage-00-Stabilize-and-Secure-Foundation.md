# Stage 00 — Stabilize and Secure the Foundation

**Repository:** `nexuss0781/Nexuss-IDE`  
**Stage ID:** `S00`  
**Depends on:** Existing repository state  
**Enables:** Stage 01 — Nexuss visual system and shell  
**Implementation status:** Specification only; no code changes authorized by this document.

## Stage purpose

Stage 00 makes Nexuss-IDE a trustworthy platform for later UI and agent work. It does not add autonomous intelligence. It removes known startup defects, establishes a reproducible application boundary, prevents cross-user workspace access, moves secrets out of source code, and defines the security and observability contracts that every later stage must consume.

The stage is complete only when the existing IDE can start cleanly from a fresh environment, authentication and workspace operations are covered by automated tests, extensions are treated as explicitly scoped capabilities, and the project has a repeatable evidence package proving that the release gates passed.

> **Transition principle:** No task composer, LLM integration, autonomous tool, terminal worker, browser connector, or background agent may be introduced until the foundation gates in this file pass.

## Scope and non-goals

The implementation scope includes the Flask application boundary, configuration, authentication/session security, database initialization, per-user workspace policy, safe file handling, extension loading, terminal-extension risk containment, structured logging, health checks, dependency reproducibility, and automated testing.

The stage does not redesign the UI, add task/session tables, add model calls, add browser automation, add background queues, or claim that the system is an agent. A minimal test-only harness may create temporary task-like fixtures, but production task orchestration belongs to Stage 02 or later.

## Baseline risks to close

| Risk ID | Baseline condition | Required correction | Blocking? |
|---|---|---|---|
| S00-R01 | `app.py` references `os` without an observed import | Add explicit imports and a startup test that imports the app from a clean process | Yes |
| S00-R02 | Terminal extension references `asyncio` without an observed import and performs cross-loop operations | Fix imports and isolate or disable unsafe proxy behavior behind a capability policy | Yes |
| S00-R03 | Secret key is hard-coded in source | Require environment-provided secret in production and fail closed when missing | Yes |
| S00-R04 | Workspace path is global and not clearly user-scoped | Introduce canonical per-user/project roots and authorization checks | Yes |
| S00-R05 | File APIs validate strings but do not establish a complete canonical-path policy | Resolve paths, reject escapes, enforce limits, and use atomic writes | Yes |
| S00-R06 | Dynamic Python extensions execute in the main process | Add manifest validation, allowlists, health reporting, and an explicit trust policy | Yes |
| S00-R07 | Autosave and errors are mostly transient toasts | Add structured server events and durable revision/error records where applicable | No, but required before agent writes |
| S00-R08 | Dependencies are unconstrained | Pin or lock compatible versions and document the supported Python/runtime matrix | Yes |

## Implementation contract

### Work package S00-01 — Reproducible application bootstrap

Refactor startup so the application can be created through an app factory such as `create_app(config=None)`. The factory must load a typed configuration object, initialize database/login/migration/socket services, register routes and extensions, and avoid performing irreversible work at module import time. The existing command-line entry point may remain, but it must call the factory.

Add explicit imports and startup checks for all modules used at runtime. Use a clean-process smoke test that runs the application’s import path from a temporary working directory. The test must fail if initialization depends on an undeclared current directory, an absent environment variable with a safe development default, or an undeclared package.

Configuration must distinguish development, test, and production. Production must require a strong secret key, a non-debug setting, a configured database URL, and a configured workspace root. Test configuration must use temporary directories and an isolated database. No secret value may be committed to tracked files.

### Work package S00-02 — Authentication and session boundary

Retain Flask-Login only if its behavior can be made explicit and tested. Add password length and input validation, generic login errors, session cookie flags, CSRF protection for state-changing form routes, logout method policy, and rate limiting or a documented deployment-level equivalent. Do not log passwords, session identifiers, or raw authorization headers.

Every protected route must have an authorization test. The test suite must include an authenticated user, an unauthenticated user, a second user, and a session with a stale or invalid user ID. Route responses must not reveal whether another user’s resource exists.

### Work package S00-03 — Workspace and filesystem security

Create a workspace service with operations such as `resolve_user_path(user_id, project_id, relative_path)`, `read_text`, `write_text_atomic`, `list_tree`, and `save_revision`. The service must canonicalize the candidate path, verify that it remains below the authorized root, reject absolute paths and traversal attempts, and handle symlinks according to an explicit policy. The default policy should reject symlink escapes rather than follow them.

Introduce an explicit project or workspace record, even if the initial deployment maps one project to one local root. All file APIs must receive a user/project scope from the authenticated request or server-side task context, never from a client-supplied user ID. Enforce maximum file size, maximum tree depth, maximum upload count, allowed filename rules, and binary-file behavior. Use atomic temporary-file replacement with permissions appropriate to the deployment.

File reads must identify encoding failure rather than silently corrupting binary data. File writes must return a revision identifier, content hash, byte count, and timestamp. Concurrent writes must either reject a stale revision or require an explicit force policy that is never the default.

### Work package S00-04 — Database and migration discipline

Ensure the migration directory is the source of schema truth. Add a test that creates an empty database, applies all migrations, starts the app, and exercises authentication and workspace access. Add a second test that loads a database containing representative legacy records and verifies the migration path.

Every new table or index introduced later must have an idempotent migration and a downgrade or documented irreversible-migration rationale. Test fixtures must never use a developer’s real `ethco.db` or a repository workspace.

### Work package S00-05 — Extension and terminal capability policy

Define a manifest schema for extensions. At minimum it must include extension ID, version, display name, entry point, route prefix, requested capabilities, trust level, health status, and compatibility metadata. Reject malformed manifests before import. Record load failures without exposing stack traces to end users.

Do not treat an extension’s Python code as a safe plugin merely because it lives under `extensions/`. Create one of two explicit policies and document the chosen route: trusted local extensions may load in-process after validation, or all extensions must run behind a separate process/service boundary. For the current stage, the safer minimum is to mark the terminal proxy as high risk, prevent agent use of it, and expose a disabled/quarantined status until an isolated executor exists in Stage 04.

Fix the terminal extension’s import/runtime defects and add disconnect, timeout, cancellation, and unauthorized-input tests. Do not allow arbitrary terminal data to be routed to an external endpoint without a documented user-visible permission and network policy.

### Work package S00-06 — Observability and health

Add structured logs with event name, request ID, user ID hash or internal identifier, route, outcome, latency, and error class. Sensitive fields must be excluded or redacted at the logging boundary. Add `/health/live` for process liveness and `/health/ready` for dependency readiness without disclosing secrets or filesystem contents.

Introduce error categories for authentication failure, authorization failure, invalid path, file conflict, extension failure, dependency failure, and unexpected server error. All API errors should return a stable machine-readable shape with a human-safe message and correlation ID.

### Work package S00-07 — Dependency and repository hygiene

Generate a lock or constraints file compatible with the supported Python version. Document how to install dependencies into a clean environment. Add a secret scan and a tracked-file scan to CI. Keep test artifacts, databases, uploads, and generated workspaces outside the repository or in ignored temporary paths.

## Evaluation harness

The harness should use `pytest` or the project’s selected equivalent, Flask’s test client, temporary directories, an isolated test database, and deterministic fixtures. It must not call external websites or the external terminal service during normal CI. Network-dependent behavior requires a mock server with an explicit contract test suite.

### Harness layout

| Harness component | Purpose | Required fixtures |
|---|---|---|
| `tests/conftest.py` | App factory, temporary DB, temporary workspace, users | `app`, `client`, `auth_client`, `user_a`, `user_b` |
| `tests/test_boot.py` | Clean import and configuration validation | Fresh subprocess, missing-secret mode |
| `tests/test_auth.py` | Login, logout, session, CSRF, authorization | Two users and invalid sessions |
| `tests/test_workspace_security.py` | Path, symlink, upload, write, revision behavior | Traversal corpus, symlink fixture, stale revision |
| `tests/test_migrations.py` | Upgrade from empty and legacy DB | Empty DB and seeded legacy DB |
| `tests/test_extensions.py` | Manifest validation and health policy | Valid, malformed, incompatible, failing extensions |
| `tests/test_terminal_boundary.py` | Timeout, disconnect, cancellation, policy denial | Mock WebSocket/service |
| `tests/test_observability.py` | Redaction, error shape, correlation IDs | Passwords, tokens, invalid routes |
| `tests/test_regression_routes.py` | Existing user journeys | Login, open IDE, settings, file tree, upload |
| `tests/security/test_adversarial_paths.py` | Adversarial path and input corpus | URL-encoded traversal, Unicode, null bytes |

### Required commands

The exact package manager may vary, but CI must provide equivalent commands:

```bash
python -m compileall app.py extensions
pytest -q
pytest -q tests/security
python -m flask --app app:create_app db upgrade
python -m pip check
```

A clean bootstrap job must install from the lock/constraints file, create a temporary configuration, run migrations, start the app in a subprocess, query readiness, and shut it down. The job fails if startup logs contain an unhandled exception, a traceback, a debug server banner, or a missing-required-config warning in production mode.

### Security test corpus

The path corpus must include `../secret`, `../../etc/passwd`, encoded traversal, mixed separators, leading slashes, Windows-style drive paths, Unicode normalization variants, null-byte suffixes, symlink-to-outside-root, symlinked parent directories, and a filename larger than the configured limit. The authorization corpus must include user A attempting to read, write, upload to, or list user B’s root and an unauthenticated request with a forged project identifier.

## Pass/fail gates

A gate is passed only when the result is reproducible from a clean checkout and the evidence package is attached to the release candidate. “Works manually” is not sufficient for a security gate.

| Gate | Pass condition | Fail condition |
|---|---|---|
| G00-01 Clean startup | App imports and becomes ready in a clean subprocess with test configuration | Import error, missing dependency, unhandled startup exception, or readiness timeout |
| G00-02 Production configuration | Production mode refuses to start without required secret/database/workspace configuration | Hard-coded secret used, debug mode enabled, or unsafe fallback accepted |
| G00-03 Authentication isolation | All protected routes deny anonymous access and prevent cross-user access | Any protected route leaks data or performs an action for the wrong user |
| G00-04 Path confinement | 100% of adversarial path corpus is rejected or safely confined; no test reaches outside root | Any traversal, symlink escape, or absolute-path escape succeeds |
| G00-05 Safe writes | Writes are atomic, revisioned, size-limited, and stale-revision behavior is deterministic | Partial file, silent overwrite, or unbounded write occurs |
| G00-06 Migration integrity | Empty and representative legacy databases migrate successfully and route tests pass | Migration leaves schema unusable or cannot be reproduced |
| G00-07 Extension policy | Malformed/untrusted extensions are rejected or quarantined; terminal risk is explicit | Arbitrary extension code loads without policy or health status |
| G00-08 Error and log hygiene | API errors have stable shapes; secrets and credentials are absent from logs | Stack traces, passwords, tokens, or raw session data are exposed |
| G00-09 Regression | Existing login, IDE, settings, tree, read, save, upload, and extension listing tests pass | A current supported workflow regresses without an approved change |
| G00-10 CI repeatability | Two consecutive clean runs produce the same pass/fail outcome with no network dependency | Tests are flaky, order-dependent, or require a developer machine state |

**Blocking rule:** Any failure in G00-01 through G00-08 is an automatic Stage 00 fail. G00-09 may be accepted only with a signed exception describing the user-visible regression and its replacement plan. G00-10 must pass before merging the stage branch.

## Transition tests to Stage 01

Stage 01 may begin only after the following transition suite passes on the exact Stage 00 release candidate.

| Transition test | Procedure | Expected result |
|---|---|---|
| T00-01 Fresh user journey | Create a new user in a clean test DB, log in, open IDE, and request file tree | User sees only the empty authorized workspace |
| T00-02 Two-user isolation | Create two users, write distinct files, exchange path guesses, and call all file APIs | Each user receives only their own data or a safe authorization error |
| T00-03 Revision conflict | Read a file, write it from two simulated clients using the same revision | One write succeeds; the stale write is rejected without overwriting |
| T00-04 Extension quarantine | Install a malformed manifest and a high-risk terminal extension fixture | App remains healthy; extension is rejected/quarantined and status is observable |
| T00-05 Mobile-compatible API | Exercise file tree/read/save endpoints with small payloads and slow mocked responses | Stable JSON errors and no server-side state corruption |
| T00-06 Observability handoff | Trigger auth, path, upload, extension, and unexpected errors | Each produces a correlation ID and redacted structured log event |
| T00-07 Clean handoff | Rebuild from the release candidate in a new environment and rerun G00 tests | Identical pass result with no local database or workspace dependency |

## Rollback and stop conditions

Stop the stage immediately if a security test demonstrates cross-user access, path escape, secret exposure, arbitrary command execution, or an extension load that bypasses policy. Revert to the last known-good release candidate and preserve the failing fixture as a permanent regression test.

If a migration cannot be safely downgraded, stop before applying it to a user database and produce a backup/restore procedure. If a runtime refactor causes a supported workflow regression, keep the app factory changes behind a feature branch until the regression has a test and a resolution plan.

Rollback means restoring the previous application release, restoring the database from a verified backup when schema changes are involved, and disabling any newly introduced extension or terminal capability. Do not roll back by deleting user workspace files or by mutating audit logs.

## Evidence package required for approval

The Stage 00 evidence package must include the commit identifier, dependency lock/constraints file, test report, security test report, migration output, clean-startup logs, route regression report, extension health report, configuration checklist, and a written exception list. The package must state the exact environment, Python version, database type, test command, and whether any tests were skipped.

## Stage completion checklist

| Item | Owner evidence | Status |
|---|---|---|
| App factory and clean startup implemented | Bootstrap test and log | ☐ |
| Production configuration is fail-closed | Config test and redacted sample | ☐ |
| Authentication/session controls tested | Auth/security report | ☐ |
| Workspace isolation and path policy tested | Adversarial corpus report | ☐ |
| Safe write/revision behavior tested | Conflict and atomic-write report | ☐ |
| Migrations reproducible | Upgrade report | ☐ |
| Extension/terminal policy enforced | Manifest and quarantine report | ☐ |
| Structured logs and health checks verified | Observability report | ☐ |
| Existing workflows regression-tested | Route report | ☐ |
| All transition tests T00-01 through T00-07 pass | Transition report | ☐ |

## References

[1]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[2]: ../README.md "Nexuss-IDE repository README"

[3]: ../Extension-doc.md "Nexuss-IDE extension development guide"
