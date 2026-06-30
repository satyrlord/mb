## Overview

This browser-based game engine uses **native `console` methods** (`console.warn`, `console.error`) as its sole logging mechanism. There is no dedicated logging framework, structured logger, or log-level management system.

## System Approach

- **Framework**: None — relies entirely on built-in browser `console` API
- **Log levels used**: `console.warn` and `console.error` only (no `console.log`, `console.debug`, or `console.info` in production source)
- **Namespace convention**: All log messages are prefixed with `[MEMORYBLOX]` to identify application-originated output in the browser console
- **Structured fields**: None — messages are plain strings, sometimes with appended error objects for context

## Key Files

Logging occurs across multiple modules without centralization:

- `src/cfg.ts` — Config loading failures (`console.warn`)
- `src/utils.ts` — Negative elapsed time detection (`console.warn`, rate-limited via module-level flag)
- `src/index.ts` — Bootstrap errors and texture check warnings (`console.warn`, `console.error`)
- `src/leaderboard.ts` — localStorage quota and read/write failures (`console.warn`)
- `src/leaderboard-ui.ts` — Leaderboard submission/refresh failures (`console.warn`)
- `src/audio-loader.ts` — Audio preload failures (`console.error`)
- `src/icons.ts` — Icon-related errors (`console.error`)
- `src/runtime-config.ts` — Runtime config warnings (`console.warn`)

## Architecture and Conventions

### Message Format
All log messages follow the pattern:
```
[MEMORYBLOX] <descriptive message>: <optional context>
```

Examples:
- `[MEMORYBLOX] Failed to parse config file: /config/ui.cfg, SyntaxError: ...`
- `[MEMORYBLOX] Negative elapsed time detected: -5ms. Clamping to zero. (This warning appears once per page load.)`
- `[MEMORYBLOX] Leaderboard storage exceeds size limit — ignoring.`

### Rate Limiting
One instance of rate-limiting exists in `src/utils.ts`: a module-level boolean flag (`negativeElapsedTimeWarningShown`) prevents repeated warnings for the same condition within a single page session.

### Error Context
When logging errors, the pattern appends the caught error object as an additional argument:
```typescript
console.warn(`[MEMORYBLOX] Failed to fetch config file:`, path, error);
```

### Debug vs Production
There is no environment-based conditional logging. The same `console.warn`/`console.error` calls execute in both development and production builds. No `DEBUG` flags, `NODE_ENV` checks, or build-time stripping of logs exist in the source code.

### E2E Test Logging
End-to-end tests (`e2e/debug-layout.spec.ts`) use `console.log` for debug data dumps during test execution, but this is test-only and not part of the application's runtime logging.

## Rules Developers Should Follow

1. **Always prefix with `[MEMORYBLOX]`** — This namespace makes it easy to filter application logs in the browser DevTools console.

2. **Use `console.warn` for recoverable issues** — Config parse failures, localStorage quota warnings, and non-fatal anomalies should use `warn`.

3. **Use `console.error` for unexpected failures** — Audio preload failures, icon errors, and bootstrap crashes should use `error`.

4. **Avoid `console.log` in production source** — The codebase does not use `console.log` in `src/` files; reserve it for temporary debugging or test code only.

5. **Rate-limit repetitive warnings** — If a warning could fire repeatedly (e.g., per-frame or per-user-action), add a module-level guard flag to emit it only once per page load.

6. **Include contextual data** — Append relevant variables (file paths, error objects, numeric values) as additional arguments to aid diagnosis.

7. **No structured logging expected** — Do not introduce JSON-formatted log lines or custom log objects; keep messages human-readable and console-friendly.

8. **No log-level configuration** — There is no mechanism to adjust verbosity at runtime. All warnings and errors are always emitted.