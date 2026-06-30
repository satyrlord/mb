## Overview

The MemoryBlox game engine uses a **custom, file-based runtime configuration system** built around simple `.cfg` files (INI-like `key=value` format) loaded via HTTP `fetch()` at application startup. There is no environment variable layering, no feature flag service, and no secrets management — all configuration is client-side, public, and stored in the `config/` directory.

## Configuration Format

### `.cfg` Files (Primary Runtime Config)

Four core `.cfg` files define runtime behavior:

- **`config/ui.cfg`** — UI layout, window sizing, animation speeds, plasma visual effects, gameplay timing
- **`config/shadow.cfg`** — Text shadow presets (`crisp`, `balanced`, `soft`) with per-preset numeric values
- **`config/win-fx.cfg`** — Win animation particle counts, delays, color palettes (comma-separated lists)
- **`config/leaderboard.cfg`** — Leaderboard enablement, scoring formula parameters, debug reduction factors

Each file uses a flat `key=value` syntax:
- Lines starting with `#` are comments
- Blank lines are ignored
- Keys use dot-separated namespacing (e.g., `ui.fixedWindowAspectRatio`, `plasma.glowOpacity`)
- Values are strings parsed into numbers, booleans, or comma-separated lists by dedicated loaders

### JSON Files (Build-Time / Tooling Config)

Two JSON files serve build-time tooling rather than runtime:

- **`config/audio-formats.json`** — Supported audio file extensions
- **`config/icon-pack-generator.json`** — Icon pack generation settings (emoji/SVG ratios, source URLs, pack definitions)

These are consumed by Node.js scripts in `tools/` during development, not by the browser app at runtime.

## Architecture

### Core Loading Pipeline

1. **`src/cfg.ts`** — Low-level parser providing:
   - `parseCfgLines(content)` → `Map<string, string>` — splits config text into key-value pairs
   - `parseCfgNumber()`, `parseCfgInteger()`, `parseCfgBoolean()` — typed value parsers
   - `loadCfgFile(path)` — fetches a `.cfg` file via `window.fetch()` with `cache: "no-cache"`
   - `createCfgReader(entries)` — convenience wrapper for typed field access with fallback defaults

2. **`src/runtime-config.ts`** — High-level config loaders:
   - `loadUiRuntimeConfig()` — loads `ui.cfg`, applies clamping/validation, returns `UiRuntimeConfig`
   - `loadWinFxRuntimeConfig()` — loads `win-fx.cfg`, parses hex color lists, returns `WinFxRuntimeConfig`
   - Exports `RUNTIME_CONFIG_PATHS` constant mapping logical names to file paths
   - Defines `DEFAULT_*_RUNTIME_CONFIG` constants as fallbacks when files are missing or invalid

3. **`src/shadow-config.ts`** — Shadow preset loader:
   - `loadShadowConfig()` — reads `shadow.cfg`, selects active preset, falls back to `balanced` if missing
   - Supports nested preset keys (`preset.<name>.<setting>=<value>`)
   - Normalizes values with clamping bounds (`MAX_OFFSET_PX=100`, `MAX_BLUR_PX=50`)

4. **`src/leaderboard.ts`** — Leaderboard config loader:
   - `loadLeaderboardRuntimeConfig()` — reads `leaderboard.cfg`, validates scoring factors within `[0,1]` ranges

### Design Decisions

- **Graceful degradation**: Every loader returns hardcoded defaults if the file is missing, unreadable, or contains parse errors. No config failure crashes the app.
- **Value clamping**: Numeric values are clamped to safe ranges (e.g., opacity `0..1`, scale `minScale..maxScale`). Swapped min/max values are auto-corrected with console warnings.
- **No hot-reload**: Config is loaded once at startup. Changes require a page reload.
- **No server-side config**: All config is client-side; the leaderboard endpoint URL can be set to `auto` mode which resolves to the current host on port 8787.

## Validation

A shell script **`tools/validate-config.sh`** enforces config integrity:

- Checks all four `.cfg` files exist
- Validates every non-blank, non-comment line matches `key=value` syntax
- Verifies required keys are present per file (e.g., `ui.fixedWindowAspectRatio`, `activePreset`, `winFx.colors`, `leaderboard.enabled`)
- Detects deprecated keys that must be removed (e.g., old `winFx.durationMs`)
- Exits with code 1 on any failure

This script is intended to run in CI or pre-commit hooks.

## Developer Conventions

1. **Adding a new config key**:
   - Add the key to the appropriate `.cfg` file with a default value
   - Add the key to the corresponding TypeScript interface in `runtime-config.ts` or its module
   - Add the key to `DEFAULT_*_RUNTIME_CONFIG` as the fallback
   - Read the key in the loader using `cfg.number()`, `cfg.integer()`, or `cfg.boolean()` with the default
   - Add the key to `tools/validate-config.sh` if it is required
   - Document the key in `docs/runtime-config.md`

2. **Key naming**: Use dot-separated namespaces matching the config domain (e.g., `plasma.glowOpacity`, `gameplay.mismatchDelayMs`). Avoid underscores or camelCase in keys.

3. **Defaults matter**: Always provide sensible defaults. The app must function correctly even if all `.cfg` files are deleted.

4. **Validation at load time**: Clamp numeric values, validate enums (e.g., `emojiPackParityMode` must be `"error"` or `"warn"`), and filter invalid list items (e.g., non-hex colors are dropped from `winFx.colors`).

5. **Console warnings**: Log warnings for recoverable issues (missing presets, swapped min/max, unrecognized keys) but never throw errors that break the app.

6. **JSON configs are build-time only**: Do not add runtime logic that depends on `audio-formats.json` or `icon-pack-generator.json`. These are consumed exclusively by Node.js tooling scripts.