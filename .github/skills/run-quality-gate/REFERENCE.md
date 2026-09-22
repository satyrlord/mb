# Run Quality Gate Reference

Use this reference when a gate fails or an expected command is unavailable.

## Project commands

| Purpose | Command |
| --- | --- |
| Validate source and Markdown | `npm run validate` |
| Commit and push gate | `npm run quality:sanity` |
| Gate with Playwright | `npm run quality:full` |
| Coverage report | `npm run test:coverage` |

Read `package.json` before use. The scripts can change. `validate` runs
`npm run artifacts`, `markdownlint-cli2`, `npm run lint`, and
`npm run typecheck`. The quality scripts also run Fallow and unit tests.
`quality:full` adds Playwright tests.

## Failed check

1. Record the command, exit code, and relevant error text.
2. Identify the file or operation that caused the failure. Do not change an
   unrelated file to make a check pass.
3. Fix the cause. Then run the failed check and the checks affected by the
   change.
4. If a check needs a secret, a service, or a tool that is unavailable, report
   the missing item and the smallest action needed to run the check.

Do not treat a false positive as proven until you have evidence. Do not add a
rule suppression or coverage exclusion only to make the gate pass.

## Final report

Report the status of validation, Fallow, unit tests, Playwright, coverage, and
VS Code Problems when each applies. Give the command and result for each check.
List the files changed and all checks that were not run.
