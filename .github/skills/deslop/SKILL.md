---
name: deslop
description: >
  Remove AI-generated code slop from the current branch diff. Use when the
  user asks to deslop, clean up AI slop, remove unnecessary comments, strip
  defensive cruft, or flatten needless nesting.
---

# Remove AI Code Slop

Check the diff against main and remove AI-generated slop introduced in the
branch. The goal is code that looks like a skilled human wrote it:
intentional, economical, and consistent with the surrounding codebase.

## Focus Areas

- **Extra comments** — unnecessary or noise-level comments inconsistent with
  local style. Delete comments that restate the code. Keep comments that
  record format gotchas, non-obvious invariants, or decisions a maintainer
  would otherwise have to rediscover.
- **Defensive cruft** — try/catch blocks, null guards, or fallback paths that
  are abnormal for trusted code paths in *this* codebase. The game engine
  already owns state validation; the UI layer should not paper over engine
  failures with silent fallbacks.
- **Casts to `any`** — used only to bypass type issues. Replace with the
  correct type or narrow the signature.
- **Deep nesting** — simplify with early returns, guard clauses, or extracted
  helpers.
- **Inconsistent patterns** — anything that clashes with the file and
  surrounding codebase conventions (import grouping, game module style,
  DOM event handling patterns, config file conventions).

## Completion Criterion

The deslop is done when you can re-read the diff and answer yes to every
question:

- Would every remaining comment meet the `full-code-review` standard?
- Would every remaining guard clause, cast, and nested block meet the
  `full-code-review` standard?
- Does the diff read like a skilled human wrote it — intentional,
  economical, consistent with the surrounding file?

If the `full-code-review` standards would flag the same patterns this skill
targets, the deslop is not done.

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Keep the final summary concise (1–3 sentences).
- Respect the project architecture: `src/` TypeScript modules, Vite build
  pipeline, relative asset paths for `/mb/` deployment. Do not import
  browser-only APIs in pure logic modules or vice versa.

## Deep Reference

Use [EXAMPLES.md](EXAMPLES.md) for concrete before/after slop removal
examples to calibrate judgment.
