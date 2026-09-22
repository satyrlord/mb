# Diagnose Reference

Read the project documents for the affected behavior. Use these methods when
the cause of a bug is still unclear.

## 1. Build a feedback loop

Find a repeatable check that shows the reported failure. Prefer a focused
unit test, integration test, or headless Playwright test. An HTTP request,
saved input, browser trace, or small harness can also work. Use
[scripts/hitl-loop.template.ps1](scripts/hitl-loop.template.ps1) only when
the user must perform an action that cannot be automated.

Record the input, the expected result, and the observed result. Repeat the
check to measure whether a timing bug occurs often enough to investigate.
Reduce unrelated setup so each run is fast.

If no check can reproduce the report, state the checks you tried and the
specific evidence needed next. You can still inspect code or logs, but mark
any proposed cause as unconfirmed.

## 2. Find the cause

List distinct explanations and rank them by current evidence. For each one,
state a prediction that a test can disprove. Change one variable or add one
targeted log at a time. Tag temporary logs with a unique prefix so you can
find and remove them.

For a performance issue, record the environment, workload, method, and
baseline result before you change code. Compare the result after the fix.

## 3. Fix and verify

When a test can exercise the real failure path, make it fail before the fix
and pass after the fix. If no such test seam exists, state that limit. Run
the original feedback loop after the change. Remove temporary logs and
harness files. Record the supported cause and any remaining uncertainty.
