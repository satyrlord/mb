---
name: deslop
description: Remove unnecessary code from a change. Use when the user asks to deslop a diff or remove redundant comments, guards, casts, or nesting.
---

# Deslop

Remove code that adds no required behavior or useful explanation. Keep the
change within the requested diff.

## Procedure

1. Read the diff and surrounding code. Record the base revision and files in
   scope. Complete this step when each changed line is accounted for.
2. Find comments that repeat code, guards for impossible states, casts that
   hide type errors, unnecessary nesting, and patterns that differ from the
   surrounding file. Check callers and contracts before you remove a guard.
   Complete this step when each proposed removal has a reason.
3. Make the small removals. Keep comments that explain an invariant or
   required format. Keep handling for states that can occur. Complete this
   step when the final diff contains only lines needed for the task.
4. Run the affected tests and `npm run validate`. Check the final diff.
   Complete this step when behavior is preserved and the checks pass.

Use [EXAMPLES.md](EXAMPLES.md) for examples. Keep relative asset paths for
the `/mb/` deployment. Do not add browser APIs to pure logic modules.
