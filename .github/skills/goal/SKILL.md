---
name: goal
description: Work toward an explicit goal with checkable completion criteria.
disable-model-invocation: true
---

# Goal

Use this skill only when the user explicitly invokes it. State the objective,
limits, and checks before you work. Use the goal tools if they are available.
Do not create a goal from an ordinary task request.

## Procedure

1. Read the relevant project instructions, code, tests, and documents. Record
   the working tree state. Complete this step when you know the current state
   and the files the goal can change.
2. Write an objective and end-state checks that you can verify. Use the user's
   explicit limits. If a required decision is missing, ask one question.
   Complete this step when each criterion has a command or observation that
   can give a clear pass or fail.
3. Make the required changes in small parts. After each material change, run
   the checks it affects. Complete this step when all planned changes exist.
4. Run every end-state check on the final state. Report the command and result
   for each criterion. Mark the goal complete only when all criteria pass.

Do not commit, reset, switch branches, or delete user work as a routine part
of this skill. Follow the user's instructions for those actions. Use the
project scripts in `package.json` for validation. The commit and push gate is
`npm run quality:sanity`; `npm run quality:full` adds Playwright tests.

Read [REFERENCE.md](REFERENCE.md) when the objective needs a detailed template.
