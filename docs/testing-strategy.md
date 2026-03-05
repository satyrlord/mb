# Testing Strategy

## Latest Update (2026-03-05)

- Test suite expanded to 24 test files, 395 tests passing.
- Coverage metrics updated to reflect the full source module set.
- Quality gate now explicitly includes a VS Code Problems scan after
  `npm run test` and `npm run test:coverage`.
- Coverage policy is enforced per reported table cell: each file/row metric
  must be at least 90% for Statements, Branches, Functions, and Lines.
- Targeted branch tests were added to strengthen edge-path coverage for
  game flow, sound engine behavior, win-fx fallbacks, and test helpers.

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

| Path | Reason |
| --- | --- |
| `tools/**` | Dev tooling (servers, scripts), not shipped game code. |
| `src/index.ts` | Browser bootstrap entrypoint — see below. |
| `dist/**` | Compiled output, not source. |
| `eslint.config.mjs` | Linter config, not application code. |
| `vitest.config.ts` | Test config, not application code. |
| `.github/**` | CI/CD workflows and skill definitions. |

### Why `src/index.ts` is excluded

`src/index.ts` is the browser bootstrap entrypoint. It wires up
`DOMContentLoaded`, `window` event handlers, and DOM element lookups
against the real `index.html` shell. The Vitest + JSDOM unit-test
environment never loads the full HTML page or triggers the complete
page lifecycle, so this module cannot be meaningfully exercised in the
current unit-test setup.

**Planned mitigation:** Add integration or end-to-end tests (for example
via Playwright) that run against a real browser environment. Until then
the module is excluded to avoid misleading coverage gaps in the report.

## Coverage Metrics

Current test coverage (all metrics at 90%+):

| Metric | Coverage |
| --- | --- |
| Statements | 97.55% |
| Branches | 94.92% |
| Functions | 98.60% |
| Lines | 97.55% |
| Test Files | 24/24 passing |
| Tests | 395 tests passing |

### Per-File Coverage

All source files (`src/`) meet or exceed 90% coverage:

- 100% coverage: `difficulty.ts`, `game.ts`, `icon-assets.ts`,
  `openmoji-imports.ts`, `presentation.ts`, `session-score.ts`,
  `tile-layout.ts`, `ui.ts`
- 99%+ coverage: `icons.ts` (99.18%)
- 98%+ coverage: `audio-loader.ts` (98.07%), `win-fx.ts` (98.54%)
- 96%+ coverage: `flag-emoji.ts` (96.19%), `runtime-config.ts` (97.12%),
  `sound-engine.ts` (96.60%), `leaderboard.ts` (95.96%),
  `window-resize.ts` (95.97%)
- 95%+ coverage: `board.ts` (95.20%), `gameplay.ts` (95.55%),
  `sound-manager.ts` (95.41%)
- 91%+ coverage: `cfg.ts` (91.80%), `utils.ts` (93.58%)
- `shadow-config.ts`: 100% statements/functions, 95.45% branches
- `test-helpers.ts`: 100% across all metrics

## Conventions

- One test file per source module: `tests/<module>.test.ts`.
- Tests should not depend on network or filesystem I/O; mock `fetch` and
  `localStorage` as needed.
- Use `vi.useFakeTimers()` for timing-dependent tests and restore in
  `afterEach`.
- Prefer deterministic mocks over `Math.random()` in particle/animation
  tests.
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
