---
name: run-quality-gate
description: Run the MEMORYBLOX quality gate and report its results. Use when the user asks for validation, release checks, test results, coverage, or help with a failed quality check.
---

# Run Quality Gate

Run the checks that the request needs. Read `package.json` before you run them.
The project scripts are the source of truth for commands and their order.

## Procedure

1. Record the working tree state with `git status --short`. Read the request to
   determine the required gate. Complete this step when you know which checks
   the user requested and which files were dirty before the gate.
2. Run the requested script. Use `npm run quality:sanity` for the commit and push
   gate. Use `npm run quality:full` when end-to-end tests are required. Run
   `npm run test:coverage` when coverage is required. Complete this step when
   each required command has an exit status and its output is saved.
3. After the gate, inspect the VS Code Problems view if it is available. If it
   is not available, state that limit and use command diagnostics. Complete
   this step when each visible problem has a result or a stated reason it
   could not be checked.
4. Fix each issue caused by the task. After a fix, rerun the failed check and
   all checks that the fix affects. Complete this step when required checks
   pass or each remaining failure has exact command evidence.
5. Report each check as passed, failed, or unavailable. State the commands,
   changed files, and remaining failures. Do not call the gate passed while a
   required check is open.

The `validate` script runs artifact generation, Markdown lint, ESLint, and
TypeScript checks. The quality scripts also run Fallow and unit tests.
`quality:full` adds Playwright tests. The coverage script uses Istanbul. The
coverage policy requires at least 90% in every reported table cell for
Statements, Branches, Functions, and Lines.

Run Playwright in headless mode. Do not change rules or coverage exclusions to
hide a failure. If the user asks for only selected tests, run only those tests
and report the gate as partial.

Read [REFERENCE.md](REFERENCE.md) when a command is unavailable or a result
needs triage.
