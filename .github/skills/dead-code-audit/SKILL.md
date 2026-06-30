---
name: dead-code-audit
description: >
  Audits the MEMORYBLOX codebase for dead TypeScript code, orphan files,
  and unused symbols, triages findings into live dead code or false
  positives, and optionally removes provably dead code with focused
  validation. Use when the user asks for a dead-code scan, unused-code
  audit, orphan-file scan, unused-symbol triage, or cleanup from analyzer
  findings.
---

# Dead Code Audit

## Goal

Gather deterministic **evidence** of dead code in the TypeScript codebase —
hard proof, not suspicion. Inspect only the reported findings and either:

- report live findings and validated false positives, or
- remove provably dead code when the user explicitly asked for cleanup.

Use this skill for dead-code work only. Ordinary review, security review,
performance review, and merge-readiness review are out of scope here — that
is `full-code-review`'s domain.

## Read First

1. `.github/copilot-instructions.md`

## Gather Evidence

Run from the repository root and collect findings from:

```bash
# TypeScript compiler diagnostics (unused variables, unreachable code, unused parameters)
npx tsc --noEmit

# ESLint diagnostics (unused imports, unused variables, dead code patterns)
npm run lint
```

For symbols the compiler cannot judge (unused exports, orphan files,
unreferenced CSS or assets), search for references with `grep` or `rg`
across the project.

If a build or lint step fails, report the exact failure and stop — do not
triage findings against a broken build, and do not delete anything.

## Weigh the Evidence

For each finding, gather the smallest local proof before editing:

- direct usages and references
- entrypoint wiring (`src/index.ts` bootstrap, HTML `script` tags,
  Vite config entry points)
- reflection, serialization, CSS class references, or dynamic imports
- DOM `data-` attribute references or `id` lookups from markup
- tests or fixtures that rely on the symbol or file

If the evidence shows the finding is a false positive (still alive through
one of these paths), report the concrete reason rather than deleting.

## Act on the Evidence

1. If the request is audit-only, report findings and their evidence without
   editing.
2. If the request includes cleanup and the evidence meets the Deletion
   Standard (no static references, no entrypoint wiring, no dynamic lookup,
   no test dependency), delete the smallest slice that removes it.
3. After each deletion, run Audit Validation before widening scope.
4. For false positives, suggest the narrowest suppression or config
   refinement only when the same false positive is likely to recur.

## Completion Criterion

The audit is complete when:

- every reported finding has been triaged as live, false positive, or removed,
- the evidence for each decision is explicit,
- no cleanup was performed without proof,
- and validation commands were re-run after any edits.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for the Deletion Standard, False Positive
Checklist, Reporting contract, and Audit Validation steps. Use
[EXAMPLES.md](EXAMPLES.md) for concrete audit and cleanup scenarios.
