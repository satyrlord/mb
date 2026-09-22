---
name: refactor
description: Refactor MEMORYBLOX without changing game behavior or contracts. Use for an authorized restructure, simplification, or reorganization.
---

# Refactor without behavior change

Read AGENTS.md, repository status, affected docs, source, callers, consumers, and tests.
State the behavior and public contracts that must remain unchanged. Pick one concrete
measure of the structural cost, such as duplicate ownership, dependency edges, or caller
complexity.

Keep game rules in src/game.ts and src/gameplay.ts. Preserve the board DOM layer's input
and accessibility role and the canvas view's visual role. Keep interaction wiring in
src/index.ts or focused controllers. Preserve localStorage data behavior, runtime config
keys, asset paths for /mb/, and generated-artifact inputs. Follow docs/style-guide.md
for any style movement.

Make one coherent structural change at a time. Run focused checks and compare the
selected measure with its baseline. Follow docs/dead-surface-audit.md when removing
obsolete surfaces. If a necessary step changes behavior, treat it as a feature change
through [add-feature](../add-feature/SKILL.md).

Update affected architecture docs and run the applicable [quality
gate](../run-quality-gate/SKILL.md). Finish when behavior is verified, the selected
structural cost decreases, and every changed line serves the refactor.
