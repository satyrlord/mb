---
name: run-quality-gate
description: >
  Quality-gate execution for repository hygiene and release readiness. Use when
  the user asks to run a quality gate, clean all Problems panel issues, fix
  lint/test/coverage failures, or verify the branch meets strict 90%+ coverage
  thresholds without suppression.
---

# Run Quality Gate

Run a deterministic gate in fixed order. The leading word is **gate**:
close each gate completely before moving on.

Do not suppress diagnostics unless the user explicitly approves suppression.
The default action is to fix root causes in code, config, tests, or tooling.

## Deep Reference

Use [REFERENCE.md](REFERENCE.md) for gate command fallbacks, discovery checks,
coverage policy details, final report template, and stop conditions.

## Gates

1. **Problems gate**
   - Collect diagnostics from the VS Code Problems pipeline for the whole
     workspace (`get_errors` without file filter).
   - Fix all valid errors and warnings.
   - Re-run diagnostics until either:
     - no problems remain, or
     - only proven false positives remain with evidence captured in the final
       report.
   - Completion criterion: Problems output is empty, or each remaining item is
     explicitly listed as a verified false positive.

2. **Markdown gate**
   - Run markdown linting across repository Markdown files.
   - Preferred command: `npx markdownlint-cli2 "**/*.md"`.
   - Fix every valid finding by editing Markdown.
   - Do not add ignores/rule disables without explicit user permission.
   - Completion criterion: markdownlint exits clean with zero findings.

3. **ESLint gate**
   - Run ESLint for the workspace (`npm run lint`).
   - Apply safe auto-fixes first, then fix remaining findings manually.
   - Do not disable rules without explicit user permission.
   - Completion criterion: ESLint exits clean with zero findings.

4. **TypeScript gate**
   - Run TypeScript compiler check (`npx tsc --noEmit`).
   - Fix all type errors.
   - Completion criterion: tsc exits clean with zero errors.

5. **Unit-test gate**
   - Run unit tests (`npm test`).
   - Fix failing tests and production code issues where feasible.
   - Completion criterion: all unit tests pass.

6. **E2E gate**
   - Run E2E tests (`npm run test:e2e` for Playwright).
   - If no E2E suite exists, record that explicitly and continue.
   - Fix failures where feasible.
   - Completion criterion: all discovered E2E tests pass, or no E2E suite exists
     and that absence is reported.

7. **Coverage gate**
   - Run coverage tooling (`npm run test:coverage`).
   - Fix low-coverage gaps by adding or improving tests, not by excluding code,
     unless the user explicitly approves exclusions.
   - Threshold rule: each reported coverage cell must be at least 90%. Treat
     Statements, Branches, Functions, and Lines as separate cells wherever
     reported (global and per-file/module tables).
   - Completion criterion: coverage report shows >=90% in every reported cell,
     or blockers are explicitly documented with exact cells and values.

## Failure handling

If a gate cannot be closed in the current turn, stop at that gate and report:

- exact command run,
- exact failure output,
- attempted fixes,
- remaining blockers,
- smallest next change to close the gate.

Never claim the full quality gate passed when any gate remains open.

## Final report format

Return results in this order:

1. Gate status table (Problems, Markdown, ESLint, TypeScript, Unit, E2E, Coverage).
2. Files changed.
3. Commands run.
4. Remaining blockers (if any).

## Completion Criterion

This skill run is complete only when:

- every gate has been executed in order,
- every valid issue was fixed or documented as a verified false positive,
- no suppression was introduced without explicit user permission,
- and the final report lists objective evidence for each gate outcome.
