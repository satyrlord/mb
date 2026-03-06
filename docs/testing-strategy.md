# Testing Strategy

## Latest Update (2026-03-06)

- Test suite expanded to 34 test files, 621 tests passing.
- Coverage metrics updated to reflect the full source module set.
- Quality gate now explicitly includes a VS Code Problems scan after
  `npm run test` and `npm run test:coverage`.
- Coverage policy is enforced per reported table cell: each file/row metric
  must be at least 90% for Statements, Branches, Functions, and Lines.
- Dedicated controller tests now cover `audio-ui-controller`,
  `leaderboard-ui`, `orientation-controller`, `player-name-prompt`, and
  `win-sequence-controller`.
- Targeted integration coverage now includes `tests/win-flow.integration.test.ts`
  and `tests/index-win-flow.integration.test.ts` for extracted win flow and the
  real bootstrap path.

## Test Runner

All tests use [Vitest](https://vitest.dev/) with the `jsdom` environment
where DOM access is required. Run tests with:

```bash
npm run test            # single run
npm run test:coverage   # single run + coverage report
npm run test:watch      # watch mode
```

## Coverage

Coverage is collected via `@vitest/coverage-v8`. Reports are written to
`coverage/` in multiple formats (HTML, Clover, JSON).

### Excluded Paths

The following paths are excluded from coverage in `vitest.config.ts`:

- `tools/**` — Dev tooling (servers, scripts), not shipped game code.
- `src/index.ts` — Browser bootstrap entrypoint — see below.
- `dist/**` — Compiled output, not source.
- `eslint.config.mjs` — Linter config, not application code.
- `vitest.config.ts` — Test config, not application code.
- `.github/**` — CI/CD workflows and skill definitions.

### Why `src/index.ts` is excluded

`src/index.ts` is the browser bootstrap entrypoint. It wires up
`DOMContentLoaded`, `window` event handlers, and DOM element lookups
against the real `index.html` shell. The Vitest + JSDOM unit-test
environment never loads the full HTML page or triggers the complete
page lifecycle, so this module cannot be meaningfully exercised in the
current unit-test setup.

**Current mitigation:** Keep `src/index.ts` excluded from unit-test coverage,
but cover high-value bootstrap flows with targeted integration tests
(`tests/index-win-flow.integration.test.ts`). Full browser E2E coverage remains
future work.

## Coverage Metrics

Current test coverage (all metrics at 90%+):

- Statements: 97.84%
- Branches: 96.02%
- Functions: 99.00%
- Lines: 97.84%
- Test Files: 34/34 passing
- Tests: 621 tests passing

### Per-File Coverage

All source files (`src/`) meet or exceed 90% coverage.

- Recently extracted controller modules are fully or near-fully covered:
  `audio-ui-controller.ts` (100%), `leaderboard-ui.ts` (100%),
  `orientation-controller.ts` (100%), `player-name-prompt.ts` (100%),
  `win-sequence-controller.ts` (98.78%).
- Core gameplay and infrastructure modules remain at or above the project
  threshold, including `board.ts`, `gameplay.ts`, `leaderboard.ts`,
  `runtime-config.ts`, `sound-engine.ts`, `sound-manager.ts`,
  `utils.ts`, and `window-resize.ts`.
- `test-helpers.ts` remains 100% across all metrics.

## Conventions

- One test file per source module: `tests/<module>.test.ts`.
- Tests should not depend on network or filesystem I/O; mock `fetch` and
  `localStorage` as needed.
- Use `vi.useFakeTimers()` for timing-dependent tests and restore in
  `afterEach`.
- Prefer deterministic mocks over `Math.random()` in particle/animation
  tests.
- Prefer asserting controller behavior through public methods instead of
  reaching into internal helpers. If a helper becomes `private`, update tests
  to verify the same behavior through the owning public API.
- After major code review or bug fixes, add tests to cover the edge cases
  fixed and verify coverage targets remain above 90%.

## Error Handling Patterns

The codebase distinguishes between multiple error types to provide precise
error context:

- **Network errors** (for `fetch` failures): caught in outer `try-catch` block
  in config loading functions (`cfg.ts`, `leaderboard.ts`, `shadow-config.ts`).
  These log "Failed to fetch" messages and return safe defaults.
- **Parse/validation errors** (for invalid config or JSON): caught in inner
  `try-catch` block wrapping `response.text()` and parsing logic. These log
  "Failed to parse" messages separately from network errors to help distinguish
  transient connection issues from structural/format problems.
- **Storage errors** (for quota exceeded or permission denied): caught via
  `instanceof DOMException` in leaderboard storage operations.

Tests verify these error paths using mocked `fetch` failures and `localStorage`
access patterns. See `tests/leaderboard.test.ts` and `tests/runtime-config.test.ts`
for examples of error scenario coverage.
