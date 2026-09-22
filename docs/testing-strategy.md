# Testing Strategy

## Latest Update (2026-07-02)

- Added `tests/canvas-board-view.test.ts` for the Canvas 2D board renderer
  (Graphics Proposal 2): a fake 2D-context double records draw calls, and
  animation frames are stepped manually through a captured
  `requestAnimationFrame` queue with mocked `performance.now()`.
- `CanvasBoardView` degrades to the inherited DOM rendering when
  `getContext("2d")` returns null, which is exactly what happens under
  jsdom — so all pre-existing board and bootstrap integration tests run
  unchanged without canvas stubs.
- Coverage for `src/canvas-board-view.ts`: 99.4% statements, 95.5% branches,
  100% functions, 99.4% lines.

## Previous Update (2026-03-06)

- The test suite gained focused controller and integration tests.
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

Coverage uses `@vitest/coverage-istanbul`. Run `npm run test:coverage` to
create the report in `coverage/`.

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
against the page. The unit tests cover selected bootstrap flows. Browser
tests cover the built site.

Keep `src/index.ts` excluded from unit-test coverage. The focused integration
tests include `tests/index-win-flow.integration.test.ts`. The browser tests in
`e2e/` use the built site and two mobile Chromium profiles.

## Coverage Metrics

CI runs Istanbul coverage with a 90% threshold for each reported file and
for each of Statements, Branches, Functions, and Lines. Run
`npm run test:coverage` for current measurements. Do not use the historical
figures in the update log as current results.

### Per-File Coverage

Check the coverage table after each coverage run. Fix each reported cell
below 90% before you claim that the coverage gate passed.

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

## Error Handling Tests

- Test configuration fetch and parse errors in `tests/runtime-config.test.ts`.
- Test high score storage errors in `tests/leaderboard.test.ts`. The browser
  leaderboard uses `localStorage`. It does not fetch scores from an API.
- Restore mocked `fetch`, timers, and browser storage after each test.
