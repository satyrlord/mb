---
name: full-code-review
description: >
  Extremely strict maintainability review hunting code-judo restructurings —
  abstraction quality, the 1k-line rule, and spaghetti growth. Use when asked
  to review code, do a code review, audit changes, check for issues, or review
  uncommitted/staged changes. Covers diff-first review of pending changes and
  broader codebase audit.
disable-model-invocation: true
---

# Thermo-Nuclear Code Quality Review

An unusually strict review focused on implementation quality, maintainability,
abstraction quality, and codebase health.

Above all, be **ambitious** about structure. Do not merely identify local
cleanup. Actively hunt for **code judo**: a restructuring that preserves
behavior while making the implementation dramatically simpler, smaller, and
more direct — branches, helpers, modes, or whole layers disappearing entirely.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Workflow — Two-Pass Review

Perform code review in two passes, ordered by priority.

### Pass 1 — Uncommitted Changes (HIGH priority)

Run `git diff` (and `git diff --cached` for staged changes) to collect the
full working-tree delta. Review **every hunk** against the checklist below.

For each finding, reference the exact file and line range in the diff and
classify severity as **critical**, **warning**, or **nit**.

#### Pass 1 Checklist

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
10. **Clean code** — code must conform to the principles established
    by Robert Cecil Martin in 'Clean Code: A Handbook of Agile Software
    Craftsmanship'.
11. **Problems & quality gate** — after reviewing the diff, check the
    VS Code Problems tab for compile/lint errors and fix any issues
    found, then run `npm run validate` and `npm run test` to confirm
    the changes pass the full quality gate.
12. **Auto-fix** — after reporting findings, automatically fix all
    critical and warning issues in-place. Apply fixes directly to the
    source files, re-run the quality gate, and confirm everything
    passes before presenting the final review summary.

Summarize Pass 1 with a table: `| File | Line(s) | Severity | Finding |`.

### Pass 2 — Broader Codebase (LOW priority)

Only after Pass 1 is delivered, scan the wider codebase for systemic issues:

- Patterns that conflict with `.github/copilot-instructions.md` conventions.
- Repeated anti-patterns across multiple files.
- Stale TODO/FIXME comments with no tracking issue.
- Missing or outdated documentation in `docs/`.

Keep Pass 2 brief — list top findings only, no exhaustive file-by-file
walkthrough.

## Standards

Each standard pairs the rule with the smell that triggers it and the remedy to
reach for — when you spot the smell, push the remedy, not a rename. Be direct
and demanding; do not soften a structural problem into a mild suggestion.

### 0. Be ambitious — find the code-judo move

The whole review hunts for the reframing that deletes complexity rather than
rearranging it. Don't stop at "this could be cleaner." Prefer the version that
makes the change feel inevitable in hindsight, and prefer simplifications that
remove moving pieces over refactors that spread the same complexity around.

- **Smell:** a refactor that relocates complexity without reducing the number
  of concepts a reader must hold; a "it works" implementation that leaves the
  codebase messier than it found it.
- **Remedy:** reframe the state model so conditionals disappear; change the
  ownership boundary so the change becomes a natural extension of an existing
  abstraction; turn special-case logic into a simpler default flow with fewer
  exceptions.

### 1. The 1k-line rule

Do not let a PR push a file from under 1000 lines to over 1000 without a very
strong reason. Treat the crossing as a strong smell by default; waive only when
the structure is compelling and the file stays clearly organized.

- **Smell:** a file crossing 1000 lines on the diff, especially when the new
  code could be split out.
- **Remedy:** extract helpers, subcomponents, or modules; ask whether the file
  should be decomposed *before* the diff lands.

### 2. No spaghetti growth

Be highly suspicious of new ad-hoc conditionals, scattered special cases, or
one-off branches inserted into unrelated flows. "Weird if statements in random
places" is a design problem, not a stylistic nit — call out changes that make
surrounding code harder to reason about even when they technically work.

- **Smell:** new conditionals bolted onto unrelated paths; one-off booleans,
  nullable modes, or flags complicating existing control flow; narrow edge
  cases handled in the middle of an already busy function.
- **Remedy:** push the logic into a dedicated abstraction, helper, state
  machine, or policy object; replace condition chains with a typed model or an
  explicit dispatcher.

### 3. Direct and boring over magical

Prefer maintainable code over hacky or magical code. Treat brittle, ad-hoc, or
"magic" behavior as a quality problem, and be skeptical of generic mechanisms
that hide simple data-shape assumptions.

- **Smell:** generic handling that hides simple structure; thin wrappers or
  identity abstractions that add indirection without buying clarity;
  copy-pasted logic instead of an extracted helper.
- **Remedy:** delete the wrapper or layer of indirection; extract a pure
  function; collapse duplicate branches into a single clearer flow.

### 4. Clean type and boundary contracts

Push hard on type and boundary cleanliness when it affects maintainability.
Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a
clearer type boundary could exist.

- **Smell:** casts, optional params, or ad-hoc object shapes that obscure the
  real invariant; a branch relying on silent fallback to paper over an unclear
  contract.
- **Remedy:** make the type boundary explicit so the control flow gets simpler;
  prefer explicit typed models or shared contracts over loosely-shaped objects.

### 5. Logic in the canonical layer

Keep feature logic out of shared paths and implementation details out of APIs.
Reuse existing canonical helpers rather than normalizing architectural drift.

- **Smell:** feature-specific logic leaking into general-purpose modules;
  a bespoke helper where a canonical utility already exists; logic added in the
  wrong layer when a clear central home exists.
- **Remedy:** move the logic to the package/module/layer that already owns the
  concept; reuse the canonical helper instead of a near-duplicate.

### 6. Atomic orchestration

Treat unnecessary sequential orchestration and non-atomic updates as design
smells when the cleaner structure is obvious. Don't over-index on
micro-optimizations, but flag avoidable orchestration that makes the
implementation more brittle.

- **Smell:** independent work serialized for no reason; related updates that
  can leave state half-applied.
- **Remedy:** run independent work in parallel when that also simplifies the
  flow; restructure related updates into a more atomic shape; separate
  orchestration from business logic.

## Review Tone

Be direct, serious, and demanding about quality. Do not be rude, but do not
soften major maintainability issues into mild suggestions. If the code makes
the codebase messier, say so. If the implementation missed an obvious
dramatic simplification, say that too.

Good phrases:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast / optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?`

## Output Expectations

Prefer a smaller number of high-conviction comments over a long list of
cosmetic notes; do not flood the review with low-value nits when larger
structural issues exist. Prioritize findings in this order:

1. Structural code-quality regressions
2. Missed opportunities for dramatic simplification / code-judo restructuring
3. Spaghetti / branching complexity increases
4. Boundary / abstraction / type-contract problems
5. File-size and decomposition concerns
6. Modularity and abstraction issues
7. Legibility and maintainability concerns

## Output Format

Present results as:

1. **Pass 1 summary table** (uncommitted changes): `| File | Line(s) | Severity | Finding |`.
2. **Pass 1 detailed notes** — grouped by file, with code snippets where
   helpful.
3. **Pass 2 highlights** — bullet list of broader observations (if any).
4. **Suggested next steps** — concrete actions ranked by impact.

## Approval Bar

Do not approve merely because behavior seems correct. Treat a clear violation
of any **Standard** above as a presumptive blocker unless the author justifies
it clearly — most of all, a PR that preserves incidental complexity when a
plausible code-judo move would delete it. If the bar is not met, leave
explicit, actionable feedback and push for the cleaner decomposition.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for a worked review example, extended
remedy patterns with code-level illustrations, and a quick-reference
checklist.

## Required Final Step

After fixing the full-code-review findings, invoke the `run-quality-gate`
skill to execute the repository quality gates before ending the flow.

- Treat this invocation as mandatory, even when the review findings are small.
- If the quality gate leaves blockers open, report those blockers explicitly and
  do not claim the full-code-review flow is complete.

## Completion Criterion

This skill run is complete only when:

- the maintainability review findings have been fixed, and
- the `run-quality-gate` skill has been invoked and its gate outcomes reported.
