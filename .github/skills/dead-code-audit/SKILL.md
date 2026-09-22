---
name: dead-code-audit
description: Audit MEMORYBLOX reachability and remove proven dead code, assets, configuration, or dependencies when cleanup is requested.
---

# Audit dead surfaces

Use read-only audit mode unless the user requests cleanup. Read AGENTS.md and follow docs/dead-surface-audit.md. Inspect repository status before changing files.

Map entry points in index.html, src/index.ts, package.json, Vite, tests/, e2e/, tools/,
config/, and the GitHub workflows. Check imports and exports, DOM IDs and CSS selectors,
event wiring, runtime config keys, icon and audio generators, static asset URLs, local
leaderboard paths, and deployment copy paths. Distinguish generated artifacts from their
source inputs.

Treat an analyzer warning or search miss as a candidate, not proof. For each candidate,
record its owner, references, runtime or build path, and status: live, dead, or
unresolved. Inspect dynamic references and future work documented in docs/ before
removal.

In cleanup mode, remove only proven dead surfaces in the requested scope. Update
affected docs and tests. Run focused checks, then the checks required by
docs/dead-surface-audit.md and [run-quality-gate](../run-quality-gate/SKILL.md). Report
every unresolved path and unavailable check.

Finish when every in-scope candidate has evidence and every removal passes the applicable checks.
