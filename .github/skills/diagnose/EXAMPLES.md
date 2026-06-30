# Diagnose Examples

## Example 1: Board Rendering Glitch With Unclear Root Cause

- Prompt shape: "Diagnose these recurring visual glitches on the 5×10 board."
- Good behavior: build one feedback loop, rank hypotheses, instrument one seam
  at a time, and stop guessing.
- Good result: a validated root cause or a tighter owning seam for the next
  slice.

## Example 2: Flaky Audio Init

- Prompt shape: "The audio sometimes doesn't start when I click the first tile."
- Good behavior: confirm a reproducible loop first, then isolate whether the
  fault is AudioContext state, user gesture requirement, or asset loading.
- Good result: one local repair plus a guard validation step.

## Example 3: Leaderboard Load Performance Regression

- Prompt shape: "Leaderboard got slower after this refactor; diagnose it."
- Good behavior: capture a baseline, compare candidate hot paths, and measure
  before changing code.
- Good result: a quantified regression source, not a speculative optimization.
