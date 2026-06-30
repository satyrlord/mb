# Run Quality Gate Reference

Command resolution, fallback order, and reporting templates for the
run-quality-gate skill.

## Execution model

- Run gates strictly in order.
- Do not execute later gates if an earlier gate is still open.
- Prefer repository scripts first, then direct tool commands.
- Every gate must produce command evidence in the final report.

## Gate command matrix

Use the first command that exists and succeeds for each gate.

### Problems gate

1. Use VS Code diagnostics API via get_errors for whole workspace.

2. If scoped checks are needed while fixing, run get_errors on edited files.

3. Final check must be a whole-workspace get_errors call.

### Markdown gate

Preferred script order:

1. npm run lint:md

2. npm run markdownlint

3. npx markdownlint-cli2 "**/*.md"

Notes:

- Fix findings in files.

- No suppressions unless user explicitly approves.

### ESLint gate

Preferred script order:

1. npm run lint

2. npm run eslint

3. npx eslint .

Auto-fix pass before manual edits:

- npx eslint . --fix

Notes:

- No rule disable comments/config suppression unless user explicitly approves.

### TypeScript gate

Preferred script order:

1. npx tsc --noEmit

Notes:

- Fix all type errors.
- No `@ts-ignore` or `@ts-expect-error` suppressions unless user explicitly approves.

### Unit-test gate

Preferred script order:

1. npm test

2. npx vitest run

If none exists:

- Mark gate as not-applicable and include discovery evidence.

### E2E gate

Preferred script order:

1. npm run test:e2e

2. npm run e2e

3. npx playwright test

If none exists:

- Mark gate as not-applicable and include discovery evidence.

### Coverage gate

Preferred script order:

1. npm run test:coverage

2. npm run coverage

3. npx vitest run --coverage

Coverage policy:

- Minimum 90% for each reported cell.

- Cells include Statements, Branches, Functions, Lines.

- Apply threshold to global summary and per-file/module table rows when
  reported.

Allowed remediation:

- Add targeted tests.

- Fix production logic that blocks testability.

Not allowed by default:

- Lower thresholds.

- Add exclusions/ignore patterns to hide uncovered code.

- Mark files ignored for coverage.

Any of the above requires explicit user permission.

## Discovery checks

Before unit/e2e/coverage gates, inspect scripts once:

- Read package.json scripts.

- Prefer existing script names over raw npx commands.

## Final report template

1. Gate status:
   - Problems: PASS/FAIL/BLOCKED
   - Markdown: PASS/FAIL/BLOCKED/N-A
   - ESLint: PASS/FAIL/BLOCKED/N-A
   - TypeScript: PASS/FAIL/BLOCKED/N-A
   - Unit: PASS/FAIL/BLOCKED/N-A
   - E2E: PASS/FAIL/BLOCKED/N-A
   - Coverage: PASS/FAIL/BLOCKED/N-A
2. Commands run in order.
3. Files changed.
4. Remaining blockers with exact failing output snippets.

## Stop conditions

Stop and report immediately when:

- a command requires secrets or manual login,

- a command hangs or requires interactive input that cannot be automated,

- or a gate requires suppression but user has not granted permission.

In all stop cases, include the smallest next action to close the gate.
