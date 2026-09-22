---
name: add-feature
description: Add or change MEMORYBLOX browser-game behavior. Use for a requested feature, gameplay change, UI change, or behavior-changing repair.
---

# Add or change a feature

Read AGENTS.md, repository status, the affected docs, source, callers, tests, and
configuration before editing. Use docs/style-guide.md for game styling and
docs/runtime-config.md for runtime settings.

Identify the owner of each changed behavior. Game state and matching rules belong in
src/game.ts and src/gameplay.ts. Keep display, input, and accessibility work in the
board and UI modules. Keep event wiring in src/index.ts or a focused controller. Keep
global runtime settings in config/.

Define the visible result and relevant failure behavior. Implement the requested
behavior in the owning layer. Update affected docs under docs/ when the behavior or
architecture changes. For styling changes, follow docs/style-guide.md. Preserve relative
asset paths for the /mb/ deployment and keep the icon-pack count even.

Add focused tests for changed rules and edge cases. Use tests/ for Vitest and e2e/ for
browser behavior. Verify visible changes in a built browser when they depend on layout,
interaction, canvas, or assets. Use [run-quality-gate](../run-quality-gate/SKILL.md) for
the relevant configured checks.

Finish when the requested behavior, docs, tests, and verification agree. Report any check that was not run.
