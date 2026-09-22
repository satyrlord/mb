# Goal Reference

Use this template when the user invokes the goal skill for a large task.

```text
Objective: <one sentence>
Scope: <files or behavior to change>
Constraints: <limits from the user or project>

End-state checks:
1. <command or observation> -> <required result>
2. <command or observation> -> <required result>

Evidence to report:
- Commands and results
- Changed files
- Remaining failures or limits
```

Each check must be observable. For example, `npm run quality:sanity` exits
with status 0. A statement such as "the code is better" does not define a
check.

Keep criteria tied to one objective. Add a negative check when it can detect
a relevant regression. Check the final state after the last change; an older
test result does not prove the final state.
