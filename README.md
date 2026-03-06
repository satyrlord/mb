# MEMORYBLOX (Windows 9x remake)

Browser-based recreation of the classic Windows 9x game **MEMORYBLOX**
using HTML, CSS, and TypeScript. Try it now at <https://satyrlord.github.io/mb/>

## Update Log

### 2026-03-06

- Bootstrap responsibilities were split into focused controllers:
  `audio-ui-controller`, `leaderboard-ui`, `orientation-controller`,
  `player-name-prompt`, and `win-sequence-controller`.
- Current verified test state: 34 test files, 621 tests passing.

### 2026-03-05

- GitHub Pages deployment now includes `icon/`, `sound/`, and `music/`
  asset directories so OpenMoji SVG icon packs and audio files are served.
- Fixed 160 stale `dev/mb/` path prefixes in `artifacts/generated-icon-assets.json`.

### 2026-02-24

- Quality gate policy reinforced: run `npm run test` and `npm run test:coverage`,
  then scan VS Code Problems and resolve all diagnostics.
- Coverage policy reinforced: every reported coverage table cell must be at
  least 90% (Statements, Branches, Functions, Lines per row/file).
- Test suite expanded with targeted edge-branch tests in game/sound/win-fx
  modules and helper utilities.

## Current Status

- Playable memory boards with multiple difficulty levels
 (5×6, 5×8 [default], 5×10)
- Dynamic emoji-based icon decks generated at runtime
- Tile multiplier setting (1× / 2× / 3×) for multi-copy icon groups
- Animation speed setting (1× / 2× / 3×)
- Timer, attempts counter, restart button, and win state
- Top-bar Debug menu with Demo, Win (near-win board), Tiles
  (2-tile styling screen), SVG imports, and Flip Tiles
- Settings page with switchable themed icon packs, tile
 multiplier, and animation speed sliders
- Global leaderboard support with username prompt on win
- Debug-assisted wins are recorded as `Debug` scores
- Plasma texture background with fallback warning when unavailable
- GitHub Pages workflow for deployment to `/mb/`

## Stack

- TypeScript (strict mode)
- Browser DOM APIs (no framework)
- `tsc` compile output to `dist/`

## Quick Start

```bash
npm install
npm run build
```

Open `index.html` in a browser after build.

## Development Commands

```bash
npm run dev
npm run dev:full
npm run build
npm run lint
npm run typecheck
npm run validate
npm run test
npm run test:coverage
```

Development server warning: `npm run dev`, `npm run dev:full`, and
`npm run serve` are local-development commands only and must not be used as a
production hosting setup.

- `npm run dev`: web app + TypeScript watch + local leaderboard API.
- `npm run dev:full`: alias of `npm run dev`.
- `npm run leaderboard:server`: run only the local leaderboard API.
- `npm run serve`: local static server on port 8080 + local leaderboard API;
 serves the repo root (`.`) with cache disabled (`-c-1`) and directory
 listing disabled (`-d false`) for development only.

The `http-server` commands are development-only. They expose files from
the repository root and must never be used as a production deployment setup.
Sensitive files under `config/` (for example `leaderboard.db`) and source
files are reachable when serving the root in local dev.

The local static server reads `.http-serverignore`; DB artifacts
(`config/leaderboard.db`, `.db-shm`, `.db-wal`) are blocked there to reduce
accidental exposure during development.

Leaderboard persistence now uses a SQLite database at
`config/leaderboard.db` (created automatically on first server start).
The API server now uses a storage adapter layer under
`tools/leaderboard/`, so DB implementations can be swapped without
changing HTTP/game flow logic.
The server retains up to `100` recent games in SQLite.

`config/leaderboard.data.json` is retained only as a legacy migration source
for older score data. Active leaderboard reads/writes use SQLite.

Set `LEADERBOARD_DB_DRIVER=sqlite` (default) when starting the server.
Set `LEADERBOARD_RETENTION=100` (default) to control how many ranked
games are retained.

### Shared scores across devices

- Keep one shared leaderboard backend running (`npm run leaderboard:server`).
- Keep `config/leaderboard.cfg` with `leaderboard.endpointUrl=auto`.
- Open the game from both devices using the same host machine URL
 (for example `http://<your-pc-ip>:8080`).
- Wins from mobile and PC now write to the same persistent score table.

### Reset global scores

- Stop the leaderboard server.
- Delete `config/leaderboard.db`.
- Start the server again (`npm run leaderboard:server`).

## Validation

`npm run validate` runs the required checks in order:

```bash
markdownlint .
eslint .
tsc --noEmit
```

Quality gate before commit/push:

```bash
npm run test
npm run test:coverage
```

After the quality gate, always scan VS Code Problems and resolve all reported
issues.

## Documentation

- Store all project documentation in `docs/`.
- Keep styling rules in `docs/style-guide.md`.
- Runtime config keys are documented in `docs/runtime-config.md`.
- Dead/unnecessary surface review checklist is in `docs/dead-surface-audit.md`.
- Store global variables and runtime-tunable global configuration in `config/`.
- Keep docs concise, actionable, and aligned with the current implementation.
- Update documentation when behavior, UI, or architecture changes.
- Keep the total number of icon packs even so the 2-column Settings layout
 remains balanced.

## Shadow Presets

- Edit `config/shadow.cfg` and set `activePreset` to `crisp`, `balanced`, or `soft`.
- Example: `activePreset=soft`.
- See `docs/runtime-config.md` for full config key reference.
- Restart/reload the app after changing config values.

## Project Layout

```text
src/                       TypeScript source
src/index.ts               App bootstrap and game loop wiring
src/game.ts                Game state and matching rules
src/gameplay.ts            GameplayEngine facade over game state
src/board.ts               Board rendering and tile input handling
src/ui.ts                  HUD and status messaging updates
src/icons.ts               Dynamic icon deck generation
src/icon-assets.ts         OpenMoji SVG asset definitions and lookup
src/openmoji-imports.ts    Auto-generated available OpenMoji token list
src/utils.ts               Shared helpers (shuffle, time formatting)
src/presentation.ts        Presentation layer helpers
src/session-score.ts       Session score flag normalization
src/difficulty.ts          Difficulty presets (Easy, Normal, Hard)
src/tile-layout.ts         Tile multiplier and set distribution logic
src/leaderboard.ts         Leaderboard scoring, storage, and runtime config
src/leaderboard-ui.ts      Leaderboard rendering, refresh, and
                           score submission UI flow
src/leaderboard-view.ts    Leaderboard entry keys and timestamp formatting helpers
src/runtime-config.ts      UI/win-fx runtime config loading
src/shadow-config.ts       Shadow preset loading
src/win-fx.ts              Win celebration particle effects
src/win-sequence-controller.ts  Win canvas fade + celebration orchestration
src/flag-emoji.ts          Flag emoji CDN URL and country name helpers
src/cfg.ts                 Shared cfg-file parsing utilities
src/sound-engine.ts        Web Audio API core engine (dual-layer)
src/sound-manager.ts       High-level game sound controller
src/audio-loader.ts        Audio asset loading and caching
src/audio-ui-controller.ts Audio mute UI state and autoplay recovery
src/orientation-controller.ts Orientation mode state and layout helpers
src/player-name-prompt.ts  Player name modal prompt and localStorage persistence
src/settings-controller.ts Settings UI controller
src/debug-controller.ts    Debug menu and debug-mode controller
src/window-resize.ts       Window resize handle controller
config/                    Global runtime configuration files
icon/                      OpenMoji SVG assets and pack catalog
sound/                     Sound effect WAV files
music/                     Background music MP3 files
index.html                 Browser entry point
styles.css                 Game styling
styles.winfx.css           Win animation styling (isolated)
.github/workflows/pages.yml  GitHub Pages build/deploy workflow
```

## Event Wiring Convention

Display view classes (`UiView`, `BoardView`) are scoped to output only.
They **do not** wire or accept interactive event handlers in their
constructor parameters. All event wiring remains owned by the bootstrap
layer (`src/index.ts`), which may delegate cohesive subsystems to focused
controllers (`AudioUiController`, `LeaderboardUiController`,
`PlayerNamePrompt`, `WinSequenceController`, and orientation helpers).
This boundary is intentional: do not pass event callbacks into display
views; wire them at the bootstrap/controller layer instead.

## Credits

- Many thanks to the original authors: <https://github.com/IonicaBizau/memory-blocks>
- Menu texture overlays in `textures/menu-*.svg` are original MEMORYBLOX
  artwork by Razvan Petrescu: <https://github.com/satyrlord/mb>
- Plasma/swirl visual inspiration credit: Anthony Osceola
  (<https://codepen.io/Anthony-Osceola/pen/YzMmorG>)
