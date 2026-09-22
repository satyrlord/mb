---
name: improve-codebase-architecture
description: Review or improve MEMORYBLOX module ownership, coupling, data flow, and test boundaries. Use for structural friction or an architecture defect.
---

# Improve the architecture

Use analysis mode unless the user requests implementation. Read AGENTS.md, relevant
docs, package and test configuration, and current source. Map the chosen behavior from
index.html and src/index.ts through game state, controllers, board views, audio,
storage, assets, and tests as applicable. Trace one real input to its visible result.

Record concrete costs in ownership, coupling, lifecycle, navigation, or testing with
file evidence. Test candidates for simpler callers, one clear owner, local changes, and
appropriate dependencies. Keep game rules independent from DOM rendering, storage, and
audio. Preserve the README.md event-wiring convention: views present output; bootstrap
or focused controllers wire interactions.

For each candidate, report affected files, evidence, proposed owner, benefit, risk, and
verifier. Rank the strongest candidate first and mark speculative ideas as such. In
analysis mode, stop before editing.

For an authorized change, compare plausible alternatives, set the behavior boundary,
update affected docs under docs/, add meaningful boundary tests, and use
[run-quality-gate](../run-quality-gate/SKILL.md). Finish when the selected measure
improves and behavior remains verified.
