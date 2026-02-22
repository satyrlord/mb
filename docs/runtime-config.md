# Runtime Configuration

This project stores global runtime-tunable values in `config/`.

## Files

- `config/ui.cfg`: UI/window/theme/animation bounds and defaults.
- `config/shadow.cfg`: text/filter shadow presets and active preset selection.
- `config/win-fx.cfg`: win animation timing, density, and palette options.
- `config/leaderboard.cfg`: global leaderboard endpoint and networking options.

## `config/ui.cfg`

### UI and theme

- `ui.fixedWindowAspectRatio`: fixed app ratio as width/height
  (`1.6` = `16:10`).
- `ui.emojiPackParityMode`: odd emoji-pack handling mode for Settings grid
  parity (`error` or `warn`).
- `flags.twemojiCdnBaseUrl`: base URL used for flag SVG emoji rendering.
- `ui.tileGlobalOpacity`: shared tile opacity fallback scalar (`0..1`) used when
  per-face keys are unset.
- `ui.tileFrontOpacity`: tile-front plasma opacity scalar (`0..1`).
- `ui.tileBackOpacity`: tile-back plasma + matched highlight opacity scalar (`0..1`).
- `ui.appMaxWidthPx`: app window width cap used for the main shell layout.
- `ui.leaderboardVisibleRowCount`: maximum number of rows shown in High Scores.
- `ui.namePromptFadeOutMs`: fade-out duration for the name prompt after submit.
- `board.minTileSizePx`: minimum board tile width used in grid columns.
- `board.targetTileSizePx`: target tile size used for board width calculation.
- `board.tileGapPx`: horizontal/vertical spacing between tiles.
- `board.boardHorizontalPaddingPx`: board horizontal padding used in width
  calculations.

### Window sizing and resize behavior

- `window.baseMinWidthPx`, `window.baseMinHeightPx`: minimum base window dimensions.
- `window.defaultScale`: initial scale when no stored user scale exists.
- `window.minScale`, `window.maxScale`: clamp bounds used before
  viewport-bound clamping.
- `window.viewportPaddingPx`: viewport padding preserved during scale clamping.

### Animation speed

- `animation.defaultSpeed`: default animation speed multiplier (applied at boot
  and used as the initial Settings slider position when no stored preference exists).
- `animation.minSpeed`, `animation.maxSpeed`: allowed speed bounds.
  The Settings slider clamps to these limits.
- `animation.tileFlipDurationMs`: tile flip transition duration.

### Plasma visual tuning

- `plasma.backgroundDriftDurationMs`
- `plasma.hueCycleDurationMs`
- `plasma.tileDriftDurationMs`
- `plasma.tileIndexOffsetDelayMs`
- `plasma.glowSweepDurationMs`
- `plasma.flaresShiftDurationMs`
- `plasma.glowOpacity` (`0..1`)
- `plasma.flaresOpacity` (`0..1`)

### Gameplay timing (milliseconds)

- `gameplay.mismatchDelayMs`
- `gameplay.reducedMotionMismatchExtraDelayMs`
- `gameplay.matchedDisappearPauseMs`
- `gameplay.matchedDisappearDurationMs`
- `gameplay.reducedMotionMatchedDisappearDurationMs`
- `gameplay.winCanvasFadeDurationMs`
- `gameplay.autoMatchSecondSelectionDelayMs`
- `gameplay.autoMatchBootDelayMs`
- `gameplay.autoMatchBetweenPairsDelayMs`
- `gameplay.uiTimerUpdateIntervalMs`

## `config/shadow.cfg`

- `activePreset`: preset name to load
  (`crisp`, `balanced`, `soft`).
- `preset.<name>.<key>=<number>`:
  per-preset value entries.
- Supported keys:
  - `leftOffsetPx`
  - `leftBlurPx`
  - `leftOpacity`
  - `rightOffsetPx`
  - `rightBlurPx`
  - `rightOpacity`

If the file or selected preset is unavailable, the app uses an internal fallback
shadow configuration defined in code.

## `config/win-fx.cfg`

### Numeric keys

- `winFx.durationMs`
- `winFx.maxTilePieces`
- `winFx.wavesPerTile`
- `winFx.waveDelayMs`
- `winFx.sparksPerTile`
- `winFx.particleDelayJitterMs`
- `winFx.centerFinaleDelayMs`
- `winFx.centerFinaleWaves`
- `winFx.centerFinaleWaveDelayMs`
- `winFx.centerFinaleCount`
- `winFx.confettiRainDelayMs`
- `winFx.confettiRainCount`
- `winFx.confettiRainSpreadMs`

### List keys (comma-separated)

- `winFx.colors`: main burst particle colors. If the color list is invalid or
  empty, particles fall back to a default white (`#ffffff`).
- `winFx.textOptions`: rotating win text options.
- `winFx.rainColors`: confetti rain colors.

## `config/leaderboard.cfg`

- `leaderboard.enabled`: enable/disable global leaderboard calls (`true`/`false`).
- `leaderboard.endpointUrl`: HTTP endpoint used for both reads and writes.
- `leaderboard.autoEndpointPort`: port used when `leaderboard.endpointUrl=auto`.
- `leaderboard.apiKey`: optional API key sent as `x-api-key`.
- `leaderboard.maxEntries`: number of recent games shown in the menu.
- `leaderboard.timeoutMs`: request timeout in milliseconds.
- `leaderboard.scorePenaltyFactor`: score retention factor applied to
  debug/auto-demo scores (`0..1`).
- `leaderboard.attemptsPenaltyMs`: per-attempt time penalty added before score calculation.
- `leaderboard.baseScoreDividend`: base dividend used in score calculation.
- `leaderboard.scoreScaleFactor`: final score scaling multiplier.
- `leaderboard.debugScoreExtraReductionFactor`: extra debug score reduction
  factor (`0..1`).
- `leaderboard.debugWinModeReductionFactor`: additional reduction for debug
  Win mode (`0..1`).
- `leaderboard.debugTilesModeReductionFactor`: additional reduction for debug
  Tiles mode (`0..1`).

### Legacy JSON to SQLite migration

When using the SQLite leaderboard backend, the server performs an automatic
one-time migration of legacy leaderboard data from
`config/leaderboard.data.json` (if present) into the SQLite database at
`config/leaderboard.db`.

**Migration state flag:**

- The migration state is persisted in SQLite's metadata table using the key
  `legacy-json-migration-complete`.
- Flag values: `0` (incomplete) or `1` (complete). These numeric values are
  intentional and must remain stable across releases — changing them will
  cause the migration to run again and may duplicate or reset stored
  leaderboard data.

**Migration behavior:**

- The migration is idempotent: if the state flag is already marked complete,
  or if the legacy JSON file does not exist, the migration is skipped.
- Duplicate entries are filtered: existing SQLite entries are matched
  against incoming legacy entries using an identity function that includes
  all entry fields. Incoming duplicates are not re-inserted.
- Entry timestamp preservation: legacy entries retain their original
  `createdAt` timestamps during migration.

**Important:** Only change the migration state key
(`legacy-json-migration-complete`) or flag values as part of a deliberate,
one-time migration plan (for example, after intentionally discarding all
previous leaderboard data). Unplanned changes may cause data loss or
duplication.

### Expected endpoint behavior

- `GET <endpoint>?limit=N`
  - Returns either an array of score entries or `{ entries: [...] }`.
- `POST <endpoint>`
  - Accepts score JSON payload with:
    - `playerName`
    - `timeMs`
    - `attempts`
    - `difficultyId`
    - `difficultyLabel`
    - `emojiSetId`
    - `emojiSetLabel`
    - `scoreMultiplier`
    - `scoreValue`
    - `isAutoDemo` (optional)

Scores created from debug tools are submitted with `difficultyLabel=Debug`.

For local development in this repository, a bundled API server is available at
`http://127.0.0.1:8787/leaderboard` via `npm run leaderboard:server`.
Scores are stored in a SQLite database file at `config/leaderboard.db`.
The leaderboard backend keeps up to `100` recent games.
The leaderboard server uses a pluggable storage adapter (`tools/leaderboard/`).
Select the adapter with `LEADERBOARD_DB_DRIVER` (currently `sqlite`).
Override retention with `LEADERBOARD_RETENTION` (positive integer, default `100`).

`leaderboard.endpointUrl` supports an `auto` mode. In this mode, the app resolves
the endpoint to `http(s)://<current-host>:8787/leaderboard`, which allows mobile
and PC clients to share one persistent leaderboard when both open the game from
the same host machine URL.

## Notes

- Runtime config loads via `fetch()` at startup.
- Invalid or missing values fall back to safe defaults.
- Reload the page after changing config files.
- Use `docs/dead-surface-audit.md` for dead/unnecessary surface cleanup passes.

## Browser Compatibility

The versions below are the **minimum where `AbortSignal.timeout` is natively
available**. Older browsers are still supported: the `withTimeout` helper in
`src/leaderboard.ts` detects `AbortSignal.timeout` at runtime and falls back to
a manual `AbortController` timer when the native API is absent, so the
leaderboard fetch works across a wider range of browsers.

- **Chrome 105** — `AbortSignal.timeout` (native)
- **Firefox 110** — `AbortSignal.timeout` (native)
- **Safari 15.4** — `AbortSignal.timeout` (native, introduced March 2022)
- **Edge 105** — same as Chrome (Chromium-based)

Core MEMORYBLOX styles do not currently rely on CSS container queries. If you
introduce container-query-based customizations, ensure you provide suitable
fallbacks (for example, responsive layouts based on traditional media queries
or feature-detection).

## Quick Examples

### Softer text shadows

In `config/shadow.cfg`, switch to the soft preset:

```properties
activePreset=soft
```

### Slower win animation pace

In `config/win-fx.cfg`, increase the major delays and total duration:

```properties
winFx.durationMs=6400
winFx.centerFinaleDelayMs=900
winFx.confettiRainDelayMs=1300
```

### Narrower animation speed range

In `config/ui.cfg`, keep the speed slider between `1x` and `2x`:

```properties
animation.defaultSpeed=1
animation.minSpeed=1
animation.maxSpeed=2
```
