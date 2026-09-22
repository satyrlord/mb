# MEMORYBLOX (Windows 9x remake)

Browser remake of the Windows 9x game **Memory Blocks**
using HTML, CSS, and TypeScript. Try it now at <https://satyrlord.github.io/mb/>

## Update Log

### 2026-03-06

- The app moved audio, leaderboard, orientation, player-name, and win-sequence
  controls from the bootstrap module into separate controllers.

### 2026-03-05

- GitHub Pages deployment includes `icon/` and `sound/` assets.
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
- Local high scores with a player-name prompt on win
- Debug-assisted wins are recorded as `Debug` scores
- Canvas 2D board renderer with a DOM fallback when a 2D context is unavailable
- GitHub Pages workflow for deployment to `/mb/`

## Stack

- TypeScript (strict mode)
- Browser DOM APIs (no framework)
- Vite production output in `dist/`

## Quick Start

```bash
npm install
npm run build
```

Run `npm run serve` to preview the built site at `http://localhost:8080`.

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

Use `npm run dev` during development. Use `npm run serve` to preview a build.
These commands serve files for local use only.

- `npm run dev`: Vite web app and local leaderboard API.
- `npm run dev:full`: alias of `npm run dev`.
- `npm run leaderboard:server`: run only the local leaderboard API.
- `npm run serve`: Vite preview on port 8080 and the local leaderboard API.

The Vite server serves the app. The Pages workflow copies the built entry
and assets from `dist/` into its deployment artifact.

The game saves high scores in the browser's `localStorage` under
`memoryblox.leaderboard`. Scores stay on that browser and origin. To reset
them, clear that key in the browser's site data. The player-name prompt uses
the same browser storage.

The repository also contains a separate SQLite leaderboard server in
`tools/leaderboard/`. The current game client does not send scores to it.
`npm run dev` and `npm run serve` start that server for local work.

## Validation

`npm run validate` generates asset indexes, then runs these checks in order:

```bash
markdownlint-cli2
eslint .
tsc --noEmit
```

`npm run quality:sanity` adds Fallow and unit tests. Before commit or push,
run this gate. Use `npm run quality:full` to include browser tests.

To check coverage separately:

```bash
npm run test:coverage
```

After the quality gate, always scan VS Code Problems and resolve all reported
issues.

## Documentation

- Store project guides in `docs/` and asset-specific guidance beside the assets.
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
src/board.ts               DOM tile input and accessibility layer
src/canvas-board-view.ts   Canvas 2D board renderer
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
src/sound-engine.ts        Web Audio API sound effect engine
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
- Menu texture overlays in `textures/menu-*.svg` are original MEMORYBLOX.
- artwork by Razvan Petrescu: <https://github.com/satyrlord/mb>
- Plasma/swirl visual inspiration credit: Anthony Osceola
  (<https://codepen.io/Anthony-Osceola/pen/YzMmorG>)
