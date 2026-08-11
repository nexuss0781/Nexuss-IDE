# Nexuss-IDE Roadmap Baseline

## Current repository

- Flask monolith in `app.py` with Flask-Login, SQLAlchemy, Flask-Migrate, Flask-SocketIO, SQLite, filesystem workspace APIs, and dynamic Flask Blueprint extensions.
- Main UI is a single `templates/ide.html` shell with a top bar, left file-tree drawer, Monaco editor, right app drawer, iframe-based extension overlay, loading screen, and toast feedback.
- Visual language is dark VS Code-like styling with hard-coded colors, Font Awesome CDN icons, and a wallpaper/glass effect for the app drawer.
- Mobile behavior is custom touch handling around Monaco: selection handles, long press, copy/paste toolbar, and drawer transitions.
- Backend exposes file tree/read/save/upload endpoints and extension discovery/launch routes. Current file API validates `..` and absolute paths but does not yet show a complete canonical-path, per-user workspace policy.
- Settings currently support wallpaper upload and display a username. Login/register are simple server-rendered forms.
- Bundled extensions include a Todo app and a terminal proxy. The extension system is powerful but loads Python modules into the Flask process, so a future agent-tool system needs explicit capability isolation and approval policies.

## Immediate technical risks to resolve before intelligence work

1. The current `app.py` does import `os`, so the earlier import-risk note is corrected. However, startup still depends on module-level side effects and `os.getcwd()` rather than an app factory/configuration boundary.
2. The terminal extension does import `asyncio`, but its WebSocket lifecycle uses potentially unsafe cross-loop operations and an external terminal endpoint. It should not become an unrestricted agent execution substrate.
3. `SECRET_KEY` is hard-coded in source and the SQLite/database/workspace paths are global rather than clearly scoped per user.
4. File operations accept user-supplied relative paths and need canonical path checks, size/type limits, safe writes, and user/workspace isolation before an agent can operate on them.
5. Autosave is timer-based and reports success/failure via a single HTML toast; it lacks revision IDs, conflict handling, audit events, and background job state.
6. The frontend is mostly inline HTML/CSS/vanilla JS, which makes a cross-surface redesign possible but makes shared component tokens, state management, accessibility, and test coverage essential.
7. The app has no current LLM, retrieval, browser, task queue, agent session, connector, approval, or persistent memory subsystem.

## Public, non-confidential Manus-like patterns used for emulation

- The official public site presents Manus as an action-oriented system that can create slides, build websites, design, and create games, with the positioning “Less structure, more intelligence.”
- The public Browser Operator page describes delegated multi-step planning and operation across websites, use of active authenticated browser sessions, transparency/control, and the ability to stop or intervene.
- A public product overview describes asynchronous cloud work, multi-agent specialization, a visible “computer”/activity panel, background completion, and replayable sessions. These are product patterns, not evidence of any proprietary implementation details.
- An academic overview describes a planner/executor/verifier decomposition as a useful reference architecture, but its claims about internal Manus implementation should be treated as secondary and not as authoritative disclosure.

## Scope boundary

This roadmap must not reproduce Manus’s confidential system prompt, hidden instructions, internal policies, or proprietary source code. It can instead specify an original, auditable agent contract that delivers similar observable outcomes: clarify intent, plan, use approved tools, show progress, verify work, request approval for consequential actions, and return artifacts with provenance.

## Browser-verified public UI patterns

- The public Manus homepage uses a sparse, centered task-entry surface with a single high-salience prompt (“What can I do for you?”), compact suggested actions, a restrained light theme, and broad product navigation beneath a simple header.
- The public Browser Operator page presents a marketing and workflow sequence: connect browser, grant access, then autonomous action. It emphasizes active tabs, permission boundaries, delegated multi-step work, examples, and an explicit FAQ around stopping and security.
- Observable UI patterns worth adapting for Nexuss-IDE are: prompt-first entry, suggested task chips, task/activity timeline, explicit permission/connector states, visible execution context, intervention/stop affordances, and replayable/auditable history. These should be implemented as original design and behavior, not copied branding or proprietary assets.

## GitHub prompt-audit findings

- The selected `nexuss0781/Nexuss-IDE` repository contains no Manus/system-prompt references in the application code or original repository content; the only prompt-related material in the local checkout is the newly created roadmap/stage documentation.
- GitHub public code search found a file explicitly named `public/awesome-prompt/Manus/Prompt.txt` in `ConardLi/easy-learn-ai`, a public educational repository. The GitHub page identifies the file as a 250-line, 9.97 KB community-repository artifact added in a commit titled “feat: 新增系统提示词及学习分析文档” on June 3, 2026; it does not identify an official Manus publication or official source.
- The accompanying `Prompt.learning.md` explicitly characterizes the artifact as a community-circulated snapshot with provenance “待核验”/unverified and says it should not be treated as Manus’s official real system prompt. It also describes the content as a capability/personality layer rather than a strict execution-control prompt, and notes that it lacks strong executable tool schemas, hard constraints, and failure-control mechanics.
- A separate GitHub match, `southpaw-spec/manus-atlas/api/generate.js`, contains an application author’s own `SYSTEM_PROMPT` for generating Manus automation ideas. It is custom product code that uses the Manus brand in generated copy, not evidence of Manus’s internal system prompt.
- Assessment: a public GitHub file claiming to be a Manus system prompt exists, but its own provenance note marks it unverified/community-sourced. It is not appropriate to treat, copy, or present it as the exact confidential Manus prompt. The Nexuss implementation should continue using the original Nexuss Agent Contract and enforce controls outside the model prompt.
