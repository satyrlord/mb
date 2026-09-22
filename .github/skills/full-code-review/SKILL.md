---
name: full-code-review
description: Review a MEMORYBLOX diff, branch, or checkout for correctness, safety, tests, and maintainability. Repair findings when requested.
---

# Review MEMORYBLOX code

Review read-only unless the user requests repair. Inspect status, staged and unstaged
diffs, untracked files, and recent history. Read every changed file in the selected
scope, with its callers, consumers, tests, docs, and deployment inputs. Preserve
unrelated work.

Check relevant contracts: game state and matching rules; board DOM input and canvas
rendering; keyboard and touch access; settings and runtime config; animation and audio
timing; localStorage failure behavior and leaderboard score rules; icon and sound asset
generation; relative /mb/ paths; and the Pages build. Use docs/style-guide.md for UI
changes, docs/runtime-config.md for config, and docs/testing-strategy.md for test
expectations.

For each confirmed finding, give its path and location, evidence, user impact, smallest
repair, and verifier. Treat earlier review comments and tool warnings as hypotheses.
Rank findings by impact. If repair is requested, fix confirmed issues in scope and run
focused regression checks plus the applicable [quality
gate](../run-quality-gate/SKILL.md).

Finish when each selected path has been reviewed and each finding has a concrete verification step. State unverified areas.
