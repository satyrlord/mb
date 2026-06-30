---
name: diagnose
description: >
  Runs a disciplined diagnosis loop for hard bugs and performance regressions.
  Reproduce, minimise, hypothesise, instrument, fix, and regression-test. Use
  when the user says "diagnose this", the bug is flaky or not yet
  reproducible, root cause is unknown after triage, or a performance
  regression needs measurement before fixing.
---

# Diagnose

A discipline for hard bugs. When the failure mode and repro are already
narrow (build error, one game module, one UI path), skip the ceremony
and fix it directly.

## Phases

Work through these in order:

1. **Build a feedback loop** — the highest-leverage step; do not skip.
2. **Reproduce** — confirm the loop matches the user's reported symptom.
3. **Hypothesise** — 3–5 ranked, falsifiable hypotheses; show the user.
4. **Instrument** — one variable at a time; tagged debug logs or perf baseline.
5. **Fix + regression test** — only at a correct seam; document missing seams.
6. **Cleanup + post-mortem** — remove instrumentation; hand off architecture
   findings to `improve-codebase-architecture` when warranted.

## Completion Criterion

The diagnosis is complete when:

- the bug or regression is reproduced with a feedback loop,
- one root-cause hypothesis is validated or ruled out with evidence,
- the fix and regression test are in place,
- and the instrumentation is removed unless it remains necessary.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for full phase instructions, loop construction
patterns, and the HITL script at
[scripts/hitl-loop.template.ps1](scripts/hitl-loop.template.ps1). Use
[EXAMPLES.md](EXAMPLES.md) for concrete diagnosis loops.
