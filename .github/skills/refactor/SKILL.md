---
name: refactor
description: >
  Surgical, behavior-preserving cleanup for the MEMORYBLOX repository. Use
  when the user asks to refactor — reduce complexity or make code easier to
  change without adding features.
---

# Refactor

Reduce structural and local complexity without changing behavior, contracts,
or validation coverage. Take small steps and validate after each one; do not
mix cleanup with new feature work or widen into drive-by edits.

Project-specific hazards — read more context before touching these
(Chesterton's fence):

- Game state lifecycle: `game.ts` is the canonical state; board, UI, and
  gameplay all derive from it. Changing state shape or selection/match logic
  silently breaks the board rendering and win detection.
- Web Audio lifecycle: `AudioContext` state transitions (suspended/resumed)
  must be handled asynchronously; simplifying AudioNode creation patterns
  can leak nodes or break the dual-layer sound engine.
- DOM event delegation: board click handling in `board.ts` relies on event
  delegation from a single listener; changing markup structure can break
  tile selection without any compile error.
- Leaderboard storage: `leaderboard.ts` persists to `leaderboard.data.json`;
  changing the scoring schema or entry key format silently corrupts existing
  leaderboard data.
- Vite build: the project uses Vite with relative asset paths for
  `/mb/` deployment; changing import paths or asset references can break
  the production build while `npm run dev` still works.

Delete dead code only when you can prove it is off the active path
(`dead-code-audit` owns the full sweep).

Add a focused regression test before risky structural changes. If the
cleanup changes a durable seam, follow with `add-feature`.

## Completion Criterion

The refactor is done when all of the following are true:

- **Behavior preserved** — all existing tests pass. No regression uncovered
  by the change.
- **Complexity reduced** — the refactored code is simpler, smaller, or more
  readable than before. Not a lateral move.
- **No new dead code** — no paths left orphaned by the change. (If you
  suspect dead code remains, run `dead-code-audit`.)
- **No drive-by edits** — every changed line serves the refactoring goal.
  No scope-creep fixes or features mixed in.
