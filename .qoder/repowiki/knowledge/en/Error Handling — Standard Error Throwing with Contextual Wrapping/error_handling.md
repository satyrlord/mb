## Overview

The MemoryBlox game engine uses a straightforward, conventional TypeScript/JavaScript error handling approach centered on built-in `Error` and `RangeError` types. There are no custom error classes, error codes, or centralized error middleware. Error handling is decentralized across modules, following consistent patterns for validation, async operations, and graceful degradation.

## System Approach

### Built-in Error Types Only
- **`Error`**: Used universally for validation failures, state corruption, and operational errors
- **`RangeError`**: Used specifically for out-of-bounds index access in `game.ts`
- No custom error classes, error hierarchies, or error code enums exist anywhere in the codebase

### Error Propagation Strategy
Errors propagate through two primary mechanisms:
1. **Synchronous throws** — immediate failure for invalid inputs or corrupted state
2. **Async rejection** — Promise rejections caught at call sites with contextual logging

## Key Files and Patterns

### Validation Errors (Fail-Fast)
**`src/game.ts`** — Game logic enforces strict preconditions:
```typescript
if (options.deck.length !== tileCount) {
  throw new Error("Deck size must exactly match rows × columns.");
}
if (matchableTileCount % 2 !== 0) {
  throw new Error("Matchable tile count must be even.");
}
```
State corruption detection uses descriptive messages with diagnostic context:
```typescript
if (state.remainingPairCount === 0) {
  throw new Error(
    "[MEMORYBLOX] State corruption detected: Attempted to match a tile pair when remainingPairCount is already zero..."
  );
}
```

**`src/icons.ts`** — Icon pack validation throws immediately on configuration errors:
```typescript
throw new Error(`[MEMORYBLOX] Duplicate icon found in '${pack.id}': ${icon}`);
throw new Error(`[MEMORYBLOX] Icon pack '${pack.id}' has ${pack.icons.length} icons; minimum required is ${MIN_ICONS_PER_PACK}.`);
```

### Async Error Wrapping with Cause Preservation
**`src/audio-loader.ts`** demonstrates the most sophisticated pattern — wrapping errors while preserving the original cause:
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
  }
  // ... decode audio
} catch (loadError: unknown) {
  const errorMessage = loadError instanceof Error ? loadError.message : String(loadError);
  const wrappedError = new Error(`Failed to load audio from ${url}: ${errorMessage}`);
  throw Object.assign(wrappedError, { cause: loadError instanceof Error ? loadError : undefined });
}
```
This pattern adds URL context while chaining the original error via the `cause` property.

### Graceful Degradation (Best-Effort Operations)
**`src/cfg.ts`** — Config loading returns `null` on failure rather than throwing:
```typescript
export const loadCfgFile = async (path: string): Promise<Map<string, string> | null> => {
  try {
    const response = await window.fetch(path, { cache: "no-cache" });
    if (!response.ok) return null;
    try {
      const content = await response.text();
      return parseCfgLines(content);
    } catch (parseError) {
      console.warn(`[MEMORYBLOX] Failed to parse config file:`, path, parseError);
      return null;
    }
  } catch (error) {
    console.warn(`[MEMORYBLOX] Failed to fetch config file:`, path, error);
    return null;
  }
};
```
Nested try-catch distinguishes network errors from parsing errors.

**`src/leaderboard-ui.ts`** — Leaderboard operations fail silently with user-facing fallbacks:
```typescript
async submitWin(input: SubmitWinToLeaderboardInput): Promise<void> {
  try {
    await this.client.submitScore(submittedScore);
    try {
      await this.refresh();
    } catch (refreshError: unknown) {
      console.warn("[MEMORYBLOX] Leaderboard refresh failed after submit:", refreshError);
      this.setStatus("You win! Score saved, but leaderboard refresh failed.");
      return;
    }
  } catch (error: unknown) {
    console.warn("[MEMORYBLOX] Leaderboard submission failed:", error);
    this.setStatus("You win! Leaderboard submit failed.");
  }
}
```

### Bootstrap-Level Error Catching
**`src/index.ts`** — Application bootstrap catches all unhandled errors:
```typescript
bootstrap().catch((error: unknown) => {
  console.error("[MEMORYBLOX] Failed to bootstrap application.", error);
});
```

### Parallel Operation Resilience
**`src/audio-loader.ts`** — Preloading uses `Promise.allSettled` to continue despite individual failures:
```typescript
public async preload(urls: string[]): Promise<void> {
  const results = await Promise.allSettled(urls.map((url) => this.load(url)));
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      console.error(`[AudioLoader] Failed to preload ${urls[i]}:`, result.reason);
    }
  }
}
```

## Architecture and Conventions

### Error Message Prefix Convention
All runtime warnings/errors use the `[MEMORYBLOX]` prefix for easy log filtering:
- `console.warn("[MEMORYBLOX] ...")` — recoverable issues
- `console.error("[MEMORYBLOX] ...")` — failures requiring attention

### Unknown Type Handling
Catch blocks consistently type errors as `unknown` and narrow with `instanceof Error`:
```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
}
```

### Silent Failure for Non-Critical Features
Several features degrade gracefully:
- Leaderboard submission failures show user-friendly status without crashing
- Plasma texture check failures display a warning UI element
- Config file fetch failures fall back to defaults

### AbortController for Cancellation
Async sequences use `AbortController` signals for cooperative cancellation rather than error-based flow control:
```typescript
mismatchAbortController?.abort();
mismatchAbortController = null;
// Callbacks check signal.aborted before proceeding
```

## Rules Developers Should Follow

1. **Use built-in `Error` for all throws** — Do not create custom error classes unless there is a compelling need for programmatic error discrimination
2. **Throw synchronously for validation** — Fail fast on invalid inputs, corrupted state, or violated invariants
3. **Wrap async errors with context** — When catching and re-throwing, preserve the original error via the `cause` property
4. **Type catch parameters as `unknown`** — Always narrow with `instanceof Error` before accessing `.message`
5. **Use `[MEMORYBLOX]` prefix** — All console warnings and errors should include this prefix for log filtering
6. **Distinguish critical vs. non-critical failures** — Critical errors (game logic, state corruption) should throw; non-critical errors (leaderboard, config, textures) should log and degrade gracefully
7. **Use `Promise.allSettled` for parallel operations** — When multiple independent async operations can fail individually without affecting others
8. **Return `null` for optional data** — Config loaders and similar functions return `null` on failure rather than throwing, allowing callers to provide defaults
9. **Never swallow errors silently** — Always log with `console.warn` or `console.error` when catching without re-throwing
10. **Use `RangeError` for bounds violations** — Array index out-of-range errors should use `RangeError` for semantic clarity