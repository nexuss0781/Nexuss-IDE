# Stage 00 Readiness Audit and Public GitHub Prompt Assessment

**Repository:** `nexuss0781/Nexuss-IDE`  
**Audited release:** `e6493e4` — `Add rigorous stage implementation and evaluation plans`  
**Audit mode:** Static repository inspection and passive public GitHub-source review  
**Implementation status:** No application code was changed during this audit.  
**Decision:** **Stage 00 is not yet ready to pass or begin implementation without explicit authorization.**

## Executive conclusion

The audit found a public GitHub file explicitly named `public/awesome-prompt/Manus/Prompt.txt`, but it is hosted in the unrelated public educational repository [`ConardLi/easy-learn-ai`](https://github.com/ConardLi/easy-learn-ai) and is presented alongside an accompanying analysis document that labels it as a **community-circulated, provenance-unverified snapshot**. The GitHub page does not establish that it is an official Manus publication or the exact confidential Manus system prompt. A separate search match in [`southpaw-spec/manus-atlas`](https://github.com/southpaw-spec/manus-atlas/blob/f996390fa5d7956bbea625223c3137dc99f9dbfa/api/generate.js) is an application author’s custom prompt for generating Manus-related automation ideas, not Manus internal material.

The public artifact may be assessed for high-level product patterns, but it must not be treated as authoritative, copied as the exact Manus prompt, or presented as verified internal documentation. Nexuss should continue with its original **Nexuss Agent Contract** and enforce critical security controls in server-side policy, capability manifests, isolated workers, approvals, and audit events rather than relying on any model prompt.

The Stage 00 repository audit shows that the project has useful foundations but fails or cannot yet prove every blocking gate. The most urgent blockers are the hard-coded secret key, debug mode, global unscoped workspace, insufficient path confinement, direct non-atomic writes, in-process dynamic extension loading, high-risk external terminal proxy, absent test suite, unpinned dependencies, incomplete migration chain, absent stable health/error/logging contracts, and a dirty working tree containing untracked audit artifacts.

> **Authorization boundary:** This report authorizes no code implementation. The next action should be an explicit user decision to begin Stage 00, preferably with the first change limited to secure configuration, app-factory/test scaffolding, and a reversible workspace policy migration.

## 1. Public GitHub prompt assessment

### 1.1 Search scope

The audit used GitHub’s public code and repository search through the selected GitHub integration. Searches covered exact and near-exact phrases including `"Manus system prompt"`, `"Manus prompt"`, and `"system prompt" Manus`. The selected Nexuss-IDE repository was also searched locally for `manus`, `system prompt`, `agent`, `prompt`, and related terms.

The local Nexuss-IDE application code contains no Manus prompt or system-prompt artifact. The only Manus references in the current checkout are in the newly created roadmap/stage documentation and passive audit material; they are not part of the original application runtime.

### 1.2 Findings

| Finding | Evidence | Assessment |
|---|---|---|
| Public file explicitly named `Manus/Prompt.txt` exists | [`ConardLi/easy-learn-ai/public/awesome-prompt/Manus/Prompt.txt`](https://github.com/ConardLi/easy-learn-ai/blob/e6c189aee507d0ba1170d885b296cc2702e8bcff/public/awesome-prompt/Manus/Prompt.txt) | Real public community artifact, not proof of official provenance |
| File metadata is visible | GitHub page reports 250 lines, approximately 9.97 KB, at commit `e6c189a` | A versioned snapshot exists; versioning does not establish authenticity |
| File was added with a learning-analysis document | GitHub page shows commit message equivalent to “add system prompts and learning analysis documents” | Indicates repository curation/education context rather than official Manus release |
| Accompanying analysis marks provenance unverified | [`Prompt.learning.md`](https://github.com/ConardLi/easy-learn-ai/blob/e6c189aee507d0ba1170d885b296cc2702e8bcff/e6c189aee507d0ba1170d885b296cc2702e8bcff/public/awesome-prompt/Manus/Prompt.learning.md) | Strong evidence against treating the file as an official exact prompt |
| Accompanying analysis classifies it as a capability/personality layer | The analysis says it is closer to a product-description/collaboration agreement than strict execution control | Useful for conceptual study, insufficient as a security or execution specification |
| Separate `manus-atlas` match contains a `SYSTEM_PROMPT` | [`southpaw-spec/manus-atlas/api/generate.js`](https://github.com/southpaw-spec/manus-atlas/blob/f996390fa5d7956bbea625223c3137dc99f9dbfa/api/generate.js) | Custom application prompt that uses Manus branding; not evidence of Manus internal prompt |

### 1.3 Decision

The audit result is **“public claimed artifact found; authenticity unverified; exact confidential prompt not established.”** The artifact should not be used as a source of truth for Nexuss. It may inform high-level design themes such as capability mapping, task methodology, user education, and explicit limitations, but those themes must be rewritten into Nexuss-specific, testable contracts.

The current Nexuss roadmap already improves on the public artifact’s stated limitations by separating the original Agent Contract from server-side tool schemas, approval records, event logs, isolation, and verification. This is the correct direction for Stage 00 and all later stages.

## 2. Repository baseline audited

The audit examined the Flask application, extension modules, templates, static scripts/styles, migrations, dependencies, ignore rules, Stage 00 specification, and Git state. The repository currently contains the Stage documentation commit `e6493e4`; application code remains otherwise unchanged from the selected baseline.

One earlier note in the baseline document incorrectly suggested that `app.py` and the terminal extension were missing `os` and `asyncio` imports. A raw-line audit corrected this: `app.py` imports `os` at line 1, and `extensions/NexussTerminal/main.py` imports `asyncio` at line 1. Those import defects are **not** current blockers. The real risks are architectural, authorization, isolation, and testability issues documented below.

## 3. Stage 00 gate status

The following statuses are based on static evidence. A static audit cannot prove a passing runtime property; where no harness exists, the gate is marked **Blocked / not demonstrated** rather than assumed to pass.

| Gate | Status | Evidence and reason |
|---|---|---|
| G00-01 Clean startup | **Blocked / not demonstrated** | Imports are present, but there is no app factory, clean-subprocess smoke test, or health/readiness endpoint. Module-level initialization depends on `os.getcwd()` and creates directories during import. |
| G00-02 Production configuration | **Fail** | `app.py:16` hard-codes `SECRET_KEY`; `app.py:226` starts Socket.IO with `debug=True`; database and workspace configuration are not fail-closed environment configuration. |
| G00-03 Authentication isolation | **Fail** | Routes use `login_required`, but file roots are global and file APIs do not bind a resource to a user/project scope. No cross-user authorization test exists. |
| G00-04 Path confinement | **Fail** | Read/save/upload APIs reject strings containing `..` or starting with `/`, but do not use canonical path resolution/common-root checks, symlink policy, or a path-service boundary. |
| G00-05 Safe writes | **Fail** | Save writes directly with `open(..., 'w')`; there are no revision IDs, stale-write checks, atomic replacement, byte limits, or conflict responses. Uploads are saved directly. |
| G00-06 Migration integrity | **Fail / blocked** | The visible migration chain contains one migration creating `todo` with a foreign key to `user.id`, but no visible migration creates the `user` table. No empty-database or legacy-database upgrade test exists. |
| G00-07 Extension policy | **Fail** | `load_extensions` imports Python extensions into the main Flask process and registers returned blueprints. Manifests do not show capability/trust/health policy. The terminal proxy connects to an external endpoint and should remain quarantined from agent use. |
| G00-08 Error and log hygiene | **Fail** | The app uses `print` for extension/scan errors and flash/toast messages for UX. Stable machine-readable errors, correlation IDs, redaction, and `/health/live`/`/health/ready` routes are absent. |
| G00-09 Regression | **Blocked / not demonstrated** | No `tests/` directory or automated test inventory is present in the repository. |
| G00-10 CI repeatability | **Fail / blocked** | `requirements.txt` contains unpinned dependencies, no lock/constraints file was found, no test harness/CI evidence was found, and the working tree has untracked roadmap/audit files. |

### Gate summary

| Category | Count |
|---|---:|
| Passing | 0 |
| Failing | 6 |
| Blocked/not demonstrated | 4 |
| Blocking failures requiring remediation | 10 |

This summary does not mean the current application is unusable. It means it is not yet suitable as the trusted substrate for an agent that can write files, execute code, or access external sessions.

## 4. Evidence by work package

### S00-01 — Reproducible application bootstrap

The application is created at module import time using a global Flask instance. `BASE_DIR = os.getcwd()` makes behavior depend on the process working directory. Directories are created during import, extensions are loaded during import-time app context setup, and Socket.IO starts with debug enabled when invoked directly. The first implementation should create a testable app factory and separate configuration from side effects.

### S00-02 — Authentication and session boundary

The application uses Flask-Login and protects many routes with `login_required`, which is a useful baseline. However, user identity is not applied to the workspace root or file API. Session cookie/CSRF/rate-limit controls are not evident in the inspected configuration. Authorization must be added as a service-level invariant rather than assumed from route decorators.

### S00-03 — Workspace and filesystem security

The file tree scans the global `WORKSPACE_DIR`. Read, save, and upload use client-provided relative paths with simple substring/leading-slash checks. Save and upload create/write paths directly. The implementation lacks canonical-path checks, symlink policy, per-user/project roots, file-size/type limits, atomic write, revision/hash responses, and stale-write detection.

### S00-04 — Database and migration discipline

The repository has a Flask-Migrate/Alembic setup and one visible migration. The migration creates a `todo` table referencing `user.id` but does not visibly create the `user` table. This must be tested from an empty database before any agent/task schema is added. Future task/event/approval tables must not be layered on an unverified migration chain.

### S00-05 — Extension and terminal capability policy

The extension loader reads manifests, dynamically imports Python files, obtains an initialization function, and registers a blueprint in the main process. This is powerful but grants extensions the application process boundary. The terminal extension maintains in-memory connection state and connects to `wss://bash-terminalbackend.onrender.com`; its lifecycle and external network behavior require an explicit trust/capability policy before any agent can use it.

### S00-06 — Observability and health

The current code prints scan and extension errors. There are no evident structured request IDs, stable API error envelope, redacted logs, liveness/readiness endpoints, or metrics. These are prerequisites for later task/worker/audit debugging.

### S00-07 — Dependency and repository hygiene

The dependency file lists packages without versions. No lock or constraints file was found. The working tree contains untracked `MANUS_INSPIRED_NEXUSS_ROADMAP.md`, `roadmap_baseline.md`, `audit_sources/`, and `stage00_static_audit.txt`. The Stage documentation itself is committed at `e6493e4`. Generated audit artifacts should either be committed intentionally as documentation evidence, moved outside the repository, or ignored before a clean release candidate is declared.

## 5. Stage 00 implementation order after approval

The safe implementation order is deliberately narrower than “begin the agent.”

| Order | Work | Required proof before continuing |
|---:|---|---|
| 1 | Create app factory/configuration boundary and test bootstrap | Clean test app creates with temporary DB/workspace; production config fails closed |
| 2 | Move secret/database/workspace settings to environment-backed configuration | No tracked secrets; debug disabled outside explicit development config |
| 3 | Build workspace service with canonical paths, per-user/project roots, limits, and safe errors | Adversarial path and cross-user tests pass |
| 4 | Add atomic revisioned writes and upload policy | Conflict/atomicity/size-limit tests pass |
| 5 | Repair migration chain from empty and legacy DBs | Upgrade tests create all required tables and routes work |
| 6 | Add CSRF/session/error/log/health controls | Auth, redaction, health, and error-contract tests pass |
| 7 | Add extension manifest/trust/health policy and quarantine terminal proxy | Malformed/high-risk extension tests pass; terminal is not agent-capable |
| 8 | Add dependency lock/constraints, test runner, CI, and clean working-tree policy | Two clean runs pass with no hidden local state |

No LLM integration, task schema, terminal execution, browser connector, or background worker should be added before these controls pass.

## 6. Pre-implementation approval required

To begin Stage 00, approve the following bounded scope:

> **Approved action:** Implement only Stage 00 foundation hardening: app factory/configuration, secret/debug remediation, workspace authorization/path security, safe file writes, migration verification, extension quarantine policy, observability, dependency/test scaffolding, and the required Stage 00 tests. Do not add LLM calls, browser automation, autonomous tool execution, background jobs, or external side effects.

If approved, the implementation should start with a branch/commit that adds only the bootstrap and test harness, followed by small commits for each work package. Every work package must be tested before the next is started, and the Stage 00 evidence checklist must be updated as results become available.

## References

[1]: https://github.com/ConardLi/easy-learn-ai/blob/e6c189aee507d0ba1170d885b296cc2702e8bcff/public/awesome-prompt/Manus/Prompt.txt "Public GitHub file claimed as Manus Prompt.txt"

[2]: https://github.com/ConardLi/easy-learn-ai/blob/e6c189aee507d0ba1170d8850e5e54e8195098c609b037/public/awesome-prompt/Manus/Prompt.learning.md "Public GitHub provenance and learning analysis note"

[3]: https://github.com/southpaw-spec/manus-atlas/blob/f996390fa5d7956bbea625223c3137dc99f9dbfa/api/generate.js "Custom Manus-branded prompt generator implementation"

[4]: ../MANUS_INSPIRED_NEXUSS_ROADMAP.md "Approved Nexuss-IDE roadmap"

[5]: ../Stages/Stage-00-Stabilize-and-Secure-Foundation.md "Stage 00 specification"
