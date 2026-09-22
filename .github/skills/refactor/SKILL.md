---
name: refactor
description: Reduce MEMORYBLOX code complexity without a behavior change. Use when the user asks to refactor code.
---

# Refactor

Make a small structural change that keeps the current behavior and contract.

## Procedure

1. Read the affected code, callers, tests, and project documents. Record the
   working tree state. Complete this step when the current behavior and
   boundaries are clear.
2. Identify the complexity to remove. State which branches, repeated rules,
   or files the change will simplify. Complete this step when the proposed
   change has a measurable effect and a relevant check.
3. Make the change. Add a focused regression test when existing tests do not
   cover a risky behavior. Complete this step when no new feature or unrelated
   edit is in the diff.
4. Run the relevant tests and `npm run validate`. Check the final diff for
   orphaned code. Complete this step when the checks pass and each changed
   line serves the refactor.

Check these contracts before you change their code:

- `src/game.ts` owns game state. Board and UI behavior depend on its
  selection and match rules.
- Web Audio uses asynchronous `AudioContext` state changes. Check node
  cleanup and resume behavior.
- `src/board.ts` uses one delegated click handler for tiles. Check its DOM
  selectors when markup changes.
- `src/leaderboard.ts` stores local scores in browser `localStorage`. A
  separate local leaderboard server uses SQLite and can read a legacy JSON
  file. Check both contracts before you change score or entry keys.
- The Vite build needs relative asset paths for the `/mb/` Pages URL. Test
  the production build when asset paths change.

Use `dead-code-audit` when the task requires a full unused-code sweep. Update
the owning document when the refactor changes a durable contract.
