---
name: goal
description: Run a long-form goal with judge-verified completion.
disable-model-invocation: true
---

# /goal

Declare a durable objective with a verifiable **end state**. The agent plans →
acts → observes → iterates across many turns until every end-state criterion
is confirmed — or you `/goal pause` or `/goal clear`.

## Read First

1. `.github/copilot-instructions.md` — repo conventions, quality gates, anti-patterns.
2. `docs/` — domain-specific docs relevant to the goal.

## Mental Model

A goal has three required parts and one built-in safeguard:

|Part|What it is|Good|Bad|
|------|-----------|------|-----|
|**Goal**|A clear, actionable objective in the imperative.|«Migrate all v1 API calls to v2.»|«Make the API better.»|
|**End state**|The checklist. Observable, binary, machine-checkable.|«`rg "/api/v1" src/` returns 0 matches; `npm test` exits 0.»|«It should work.»|
|**Constraints**|Boundaries: scope, style, safety, non-goals.|«Only edit `src/` and `tests/`. Conventional Commits.»|(none — agent will drift)|

The **end state** is the judge. The agent must verify each criterion
independently before declaring done. This stops both **premature completion**
(«looks good to me!») and endless spinning («just one more refactor…»).

## Invocation

Type `/goal` followed by your objective. The agent will ask for the three
parts if any are missing, then run the loop until the end state is confirmed.

Minimal form:

```text
/goal Migrate all deprecated v1 API calls to v2.
End state: rg "/api/v1" src/ tests/ returns 0 matches, npm test exits 0.
Constraints: only src/ and tests/, Conventional Commits.
```

Full form: use the [layered template](REFERENCE.md#layered-template) for
complex, multi-hour goals.

## Subcommands

|Command|What it does|
|---------|-------------|
|`/goal status`|Show progress, last verification results, remaining criteria.|
|`/goal pause`|Freeze the loop. State is preserved in session memory.|
|`/goal resume`|Continue from the last checkpoint.|
|`/goal clear`|Stop and reset. Use when you need to refine the goal itself.|

## The Loop

After receiving a goal, the agent runs this cycle until the end state is met
or a stop condition fires:

1. **Plan** — break the goal into concrete, verifiable steps.
2. **Act** — execute one step. Edit files, run commands, gather evidence.
3. **Verify** — check EVERY end-state criterion. Run the exact verification
   commands. Report which pass and which fail.
4. **Iterate** — if any criterion fails, go back to plan with the gap in
   mind. If all pass, the goal is done.

The agent never declares victory on its own say-so. Every «done» must be
backed by verification output.

## Repo Integration

This skill inherits the repo's quality gates. When the end state includes
test or lint criteria, use the canonical commands:

```bash
npm run quality:sanity    # markdownlint + eslint + tsc + vitest
npm run quality:full      # above + Playwright E2E
npm run test:coverage     # coverage report (≥90% threshold per file)
```

Branch-per-goal convention:

```bash
git switch -c goal/<short-name>
```

Commit before launching so `git reset --hard` is always a clean escape.

## Stop Conditions

The loop stops when:

- All end-state criteria pass on a clean verification run — **goal achieved**.
- The user runs `/goal pause` or `/goal clear`.
- Hard iteration cap is reached (default: 20). The agent writes
  `BLOCKERS.md` with what's left and stops — no guessing.
- A destructive or irreversible action is required. The agent stops and
  asks.

## Completion Criterion

The goal is done when **every** end-state criterion has been independently
verified and the verification output is presented to the user. No criterion
is «close enough.» Partial passes are failures.

## Reference

- [Layered template, anti-patterns, and examples](REFERENCE.md)
- [Project instructions](/.github/copilot-instructions.md)
