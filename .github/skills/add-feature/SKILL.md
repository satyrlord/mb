---
name: add-feature
description: >
  Creates or updates repository specs, acceptance criteria, durable decisions,
  and documentation for new work. Use when adding a feature or defining an
  ambiguous slice, when making architectural decisions or changing contracts
  (game state, leaderboard, audio, settings), or when recording durable
  context (decisions, glossary, conventions) for future engineers and agents.
---

# Add Feature

## Goal

Write or update the smallest durable document that makes the next slice
unambiguous and records decisions future maintainers would otherwise have to
rediscover. Document decisions, not just code — the context and trade-offs
that explain *why it was built this way*. Skip obvious code and throwaway
prototypes under `tmp/`.

Use `grill-me` instead when the user wants interactive design grilling,
pressure-testing, or branch-by-branch questioning before documentation.

## First Rule

Do not create a duplicate spec or summary when an existing doc already owns the
behavior. Update the owning document instead.

## Read First

> CRITICAL: Always read documentation before implementing

1. `.github/copilot-instructions.md` - Agent behavior rules and guardrails
2. **All relevant docs in `docs/` folder for the domain**:
   - `docs/style-guide.md` - Visual and styling rules
   - `docs/sound-engine-plan.md` - Web Audio engine architecture
   - `docs/runtime-config.md` - Runtime configuration system
   - `docs/icon-pack-generator.md` - Icon pack generation
   - `docs/testing-strategy.md` - Test conventions and coverage policy
   - `docs/win-animation-sequence.md` - Win celebration flow
   - `docs/dead-surface-audit.md` - Dead code removal process
3. Check for existing implementations that might solve the problem

**Never implement without understanding the existing documented context.**

## Choose The Right Home

For **canonical docs** (durable reference documents):

- architecture and process model -> (create a focused doc under `docs/`)
- game state and rules -> (create a focused doc under `docs/`)
- audio engine decisions -> `docs/sound-engine-plan.md`
- visual and styling rules -> `docs/style-guide.md`
- runtime configuration -> `docs/runtime-config.md`
- icon pack design -> `docs/icon-pack-generator.md`
- trade-off decisions and rationale -> record in the relevant canonical doc, or create a new doc under `docs/`
- cross-cutting terminology -> `docs/glossary.md` (create lazily, only when needed)
- durable trade-off decisions -> record in the relevant canonical doc, or create a new doc under `docs/`
  (this project does not use standalone ADRs; no `docs/adr/` tree).
  Lifecycle: DRAFT → REVIEW → ACCEPTED → SUPERSEDED/DEPRECATED. Don't
  delete old decisions; supersede them.

Create a doc for anything expensive to reverse: game state schema changes,
leaderboard format changes, audio engine contracts, icon pack format changes.

Keep the skill catalog in `.github/skills/README.md` current.

## Spec Content

When clarifying a slice before implementation (manual path), include:

- objective and user value
- explicit assumptions
- commands for build, test, and validation
- the behavior or contract being defined
- success criteria that are specific and testable
- non-goals or out-of-scope items
- open questions that still need a human answer

## Inline Documentation (TypeScript)

The highest-value comments record format gotchas at the point where a reader
would otherwise fall in. Every time an agent produces a wrong result from a
missing fact (tile multiplier logic, audio context lifecycle, leaderboard
scoring edge cases), record the fact where it matters. No commented-out code,
no lingering TODOs.

## Manual Spec Workflow

1. Surface assumptions before drafting.
2. Pick the owning canonical doc in `docs/`.
3. Draft the smallest spec change that closes the ambiguity.
4. Get human confirmation when the slice is non-trivial or surprising.
5. Hand off to the implementation step.

## Completion Criterion

The spec or documentation work is done when all of the following are true:

- **Slice is unambiguous** — the smallest change that closes the ambiguity
  has been drafted. No scope bloat.
- **No duplicates** — no existing doc already owned this behavior (checked
  against the canonical doc map in "Choose The Right Home").
- **Decisions recorded** — any trade-off or surprise-averse decision made
  during the work is captured in the owning doc.
- **Validation passes** — `markdownlint-cli2` passes on all edited Markdown
  files.

If the slice is non-trivial or surprising, get human confirmation before
handing off to the implementation step.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for durable decision rules and the
decision-record threshold. Use [EXAMPLES.md](EXAMPLES.md) for concrete
spec, glossary, and decision-record updates.
