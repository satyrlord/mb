# Full Code Review Reference

Use these patterns when a change adds code but does not change the contract.
Check callers and tests before you recommend a repair.

## Duplicate state

If two modules store the same fact, find which module owns it. Derive the
other view from that source when the contract permits it. Verify the relevant
updates and failure paths.

## Scattered conditions

If several callers make the same decision, find the owner of that decision.
Move it there when this removes repeated branches. Check each caller after
the move.

## Thin wrapper

If a function only renames another call, remove it when it adds no contract,
validation, or useful test seam. Check all callers before removal.

## Large file

If a change makes a file exceed 1,000 lines, inspect the new responsibility.
Split the file only if the new module has a clear owner and reduces the work
needed to understand the code.

## Finding format

For each finding, state the file and line, the observable risk, the proposed
change, and the check that can show the change kept behavior.
