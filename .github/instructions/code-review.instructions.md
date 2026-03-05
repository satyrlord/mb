---
description: "Use when asked to review code, do a code review, audit changes, check for issues, or review uncommitted/staged changes. Covers diff-first review of pending changes and broader codebase audit."
---

# Code Review

Perform code review in two passes, ordered by priority.

## Pass 1 — Uncommitted Changes (HIGH priority)

Run `git diff` (and `git diff --cached` for staged changes) to collect the
full working-tree delta. Review **every hunk** against the checklist below.

For each finding, reference the exact file and line range in the diff and
classify severity as **critical**, **warning**, or **nit**.

### Checklist for uncommitted changes

1. **Correctness** — logic errors, off-by-one, wrong variable, missing
   edge cases.
2. **Type safety** — `any` usage, unsafe casts, missing null checks
   (project enforces `strict: true`).
3. **Security** — injection vectors, unsanitized user input, hardcoded
   secrets, OWASP Top 10 concerns.
4. **Consistency** — naming conventions, code style, and patterns that
   diverge from surrounding code or project conventions.
5. **Test coverage** — new logic paths that lack corresponding tests;
   project policy requires ≥ 90 % coverage per file.
6. **Dead code** — unreachable branches, unused imports, leftover
   debug artifacts.
7. **Performance** — unnecessary allocations in hot paths, missing
   cleanup of listeners/timers, DOM thrashing.
8. **Accessibility** — missing ARIA attributes, unlabelled interactive
   elements, broken keyboard navigation.
9. **Asset paths** — must be relative (no absolute root paths) to
   support the `/mb/` GitHub Pages deployment.
10. **Clean code** — Code must conform to the principles established
   by Uncle Bob (Robert Cecil Martin) in his eponymous work
   'Clean Code: A Handbook of Agile Software Craftsmanship 2nd Edition'
11. **Problems & quality gate** — after reviewing the diff, check the
    VS Code Problems tab for compile/lint errors and fix any issues
    found, then run `npm run validate` and `npm run test` to confirm
    the changes pass the full quality gate.
12. **Auto-fix** — after reporting findings, automatically fix all
    critical and warning issues in-place. Apply fixes directly to the
    source files, re-run the quality gate, and confirm everything
    passes before presenting the final review summary.

Summarize Pass 1 with a table: `| File | Line(s) | Severity | Finding |`.

## Pass 2 — Broader Codebase (LOW priority)

Only after Pass 1 is delivered, scan the wider codebase for systemic issues:

- Patterns that conflict with the project's `copilot-instructions.md`
  conventions.
- Repeated anti-patterns across multiple files.
- Stale TODO/FIXME comments with no tracking issue.
- Missing or outdated documentation in `docs/`.

Keep Pass 2 brief — list top findings only, no exhaustive file-by-file
walkthrough.

## Output format

Present results as:

1. **Pass 1 summary table** (uncommitted changes).
2. **Pass 1 detailed notes** — grouped by file, with code snippets where
   helpful.
3. **Pass 2 highlights** — bullet list of broader observations (if any).
4. **Suggested next steps** — concrete actions ranked by impact.
