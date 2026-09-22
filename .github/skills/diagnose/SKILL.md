---
name: diagnose
description: >
  Diagnose a difficult bug or performance regression. Use when the cause is
  unclear, the bug is intermittent, or a performance change needs measurement.
---

# Diagnose

Use a repeatable check to guide a difficult investigation. Fix a clear,
local error directly when no diagnosis loop is needed.

## Phases

Work through these in order:

1. **Build a feedback loop.** Record input, expected result, and observed
   result. Complete this step when the check detects the reported symptom or
   you can state the evidence still needed to reproduce it.
2. **Test causes.** Rank explanations that make different predictions. Change
   one variable at a time. Complete this step when evidence supports a cause
   or rules it out.
3. **Fix and verify.** Add a regression test at a seam that exercises the real
   failure path when possible. Complete this step when the original check and
   relevant tests pass, or the remaining limit has exact evidence.
4. **Clean up.** Remove temporary logs and files. Record the cause, checks,
   and remaining uncertainty.

## Completion Criterion

The diagnosis is complete when:

- the reported symptom has a repeatable check, or failed reproduction
  attempts and needed evidence are recorded,
- the result for each tested cause is recorded,
- a supported fix has passed the original check when a fix was possible,
- and temporary instrumentation has been removed.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for full phase instructions, loop construction
patterns, and the HITL script at
[scripts/hitl-loop.template.ps1](scripts/hitl-loop.template.ps1). Use
[EXAMPLES.md](EXAMPLES.md) for concrete diagnosis loops.
