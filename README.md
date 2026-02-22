# MEMORYBLOX (Windows 9x remake)

Browser-based recreation of the classic Windows 9x game **MEMORYBLOX**
using HTML, CSS, and TypeScript.

## Current Status

- Playable memory boards with multiple difficulty levels
 (5x6, 5x8 [default], 5x10)
- Dynamic emoji-based icon pairs generated at runtime
- Timer, attempts counter, restart button, and win state
- Top-bar Debug menu with Demo, Win (near-win board), and Tiles
 (2-tile styling screen)
- Settings page with switchable themed emoji packs
- Global leaderboard support with username prompt on win
- Debug-assisted wins are recorded as `Debug` scores
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
```

⚠️ Development server warning: `npm run dev`, `npm run dev:full`, and
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

## Documentation

- Store all project documentation in `docs/`.
- Keep styling rules in `docs/style-guide.md`.
- Runtime config keys are documented in `docs/runtime-config.md`.
- Dead/unnecessary surface review checklist is in `docs/dead-surface-audit.md`.
- Store global variables and runtime-tunable global configuration in `config/`.
- Keep docs concise, actionable, and aligned with the current implementation.
- Update documentation when behavior, UI, or architecture changes.
- Keep the total number of emoji packs even so the 2-column Settings layout
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
src/board.ts               Board rendering and tile input handling
src/ui.ts                  HUD and status messaging updates
src/icons.ts               Dynamic emoji deck generation
src/utils.ts               Shared helpers (shuffle, time formatting)
config/                    Global runtime configuration files
index.html                 Browser entry point
styles.css                 Game styling
.github/workflows/pages.yml  GitHub Pages build/deploy workflow
```

## Event Wiring Convention

Display view classes (`UiView`, `BoardView`) are scoped to output only.
They **do not** wire or accept interactive event handlers in their
constructor parameters. All event wiring — restart, tile select, resize,
keyboard — is the exclusive responsibility of the bootstrap layer
(`src/index.ts`). This boundary is intentional: do not pass event
callbacks into display views; wire them at the bootstrap level instead.

## Credits

- Many thanks to the original authors: <https://github.com/IonicaBizau/memory-blocks>
- Plasma/swirl visual inspiration credit: Anthony Osceola
  (<https://codepen.io/Anthony-Osceola/pen/YzMmorG>)
