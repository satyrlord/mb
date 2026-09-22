# MEMORYBLOX Agent Instructions

## Project Goal

**MEMORYBLOX** is an HTML, CSS, and TypeScript remake of the Windows 9x game
Memory Blocks. It runs in a browser.

## Current Implementation Snapshot

- Playable boards with three difficulties (5x6, 5x8, 5x10)
- Dynamic icon decks with eight themed packs
- Tile multiplier setting (1x / 2x / 3x) for multi-copy icon groups
- Animation speed setting (1x / 2x / 3x)
- Timer, attempt counter, restart flow, and win message
- Settings page with pack selection, tile multiplier, and animation speed
- Web Audio sound engine with a sound manager and asset loader
- Controllers for audio UI, leaderboard UI, orientation, player names, and wins
- Local browser leaderboard storage; a separate local server can use SQLite
- Orientation toggle (landscape / portrait mode) with score bonus
- HD mode toggle that controls graphics effects
- Win celebration particle effects
- Browser entry through `index.html`; Vite creates the production files in `dist/`
- GitHub Pages deployment workflow in `.github/workflows/pages.yml`

## Tech Stack

- Vite 8 for the build
- DaisyUI 5 for the interface
- Playwright for browser tests
- Istanbul for code coverage

## Approach

- Read the relevant code, tests, and documentation before you edit.
- Make focused edits. Use simple solutions.
- Check your changes before you report completion.
- State uncertainty. Do not invent file paths or test results.
- Follow the user's instructions when they conflict with this file.

## Efficiency

- Read each stable file once. Read it again if another process can have changed it.
- Plan one focused edit. Repeat a check only after a change or a failure.

## Critical Workflows

Run these before any commit/push:

```bash
npm run quality:sanity
```

This runs validation, Fallow, and unit tests. To include Playwright browser
tests, run:

```bash
npm run quality:full
```

To check test coverage independently:

```bash
npm run test:coverage
```

In CI, each reported file must reach 90% for statements, branches, functions,
and lines. Use `npm run test:coverage` to inspect coverage locally.

Before a commit or push, review the VS Code Problems tab when it is available.
Resolve relevant issues.

`npm run validate` creates audio and icon artifacts, then runs these checks in
this order:

```bash
markdownlint-cli2
eslint .
tsc --noEmit
```

`npm run quality:sanity` runs Fallow after validation.

## Fallow CLI

[Fallow](https://github.com/fallow-rs/fallow) checks dead code, duplication,
and code health.

Available scripts:

- `npm run fallow`: full analysis
- `npm run fallow:audit`: change audit
- `npm run fallow:health`: health score

Both quality scripts run Fallow. Its settings are in `.fallowrc.json`.

Development and build commands:

```bash
npm run serve:dev-root
npm run serve
npm run build
```

The first command starts the Vite development server on port `8080`. The
second command starts a preview and the local leaderboard server.

## Architecture Map

- `src/index.ts`: app start, event wiring, restart behavior
- `src/settings-controller.ts`: settings state, two-phase commit, and settings UI
- `src/debug-controller.ts`: debug menu, debug game modes, auto-match demo
- `src/game.ts`: canonical game state and selection/match logic
- `src/gameplay.ts`: GameplayEngine facade over game state
- `src/board.ts`: tile markup rendering and click delegation (DOM accessibility / hit-test layer)
- `src/canvas-board-view.ts`: Canvas 2D board renderer (procedural plasma, extrusion, flip/dissolve animation loop) over the invisible DOM layer
- `src/ui.ts`: HUD and status message updates
- `src/icons.ts`: runtime icon deck generation (8 themed packs)
- `src/icon-assets.ts`: OpenMoji SVG asset definitions and lookup
- `src/openmoji-imports.ts`: auto-generated available OpenMoji token list
- `src/difficulty.ts`: difficulty presets (Easy, Normal, Hard)
- `src/tile-layout.ts`: tile multiplier and set distribution logic
- `src/presentation.ts`: game presentation model for views
- `src/session-score.ts`: session score flag normalization
- `src/leaderboard.ts`: leaderboard scoring, browser storage, and runtime config
- `src/leaderboard-ui.ts`: leaderboard UI rendering, submission, and refresh
- `src/leaderboard-view.ts`: leaderboard entry key/identity helpers and timestamp formatting
- `src/runtime-config.ts`: UI/win-fx runtime config loading
- `src/shadow-config.ts`: shadow preset loading
- `src/cfg.ts`: shared cfg-file parsing utilities
- `src/flag-emoji.ts`: flag emoji CDN URL and country name helpers
- `src/sound-engine.ts`: Web Audio API core engine (dual-layer)
- `src/sound-manager.ts`: high-level game sound controller
- `src/audio-loader.ts`: audio asset loading and caching
- `src/audio-ui-controller.ts`: mute button state for sound effects
- `src/win-fx.ts`: win celebration particle effects
- `src/win-sequence-controller.ts`: win animation sequence orchestration
- `src/orientation-controller.ts`: orientation mode state, toggle, and layout helpers
- `src/hd-mode-controller.ts`: HD mode state, device detection, toggle, and data-attribute helpers
- `src/player-name-prompt.ts`: player name modal prompt and localStorage persistence
- `src/window-resize.ts`: window resize handle controller
- `src/utils.ts`: shared helper utilities

## Conventions

1. Keep game logic in `src/` TypeScript modules.
2. Preserve strict typing; avoid `any`.
3. Use relative asset paths so the site works at `/mb/`.
4. Keep UX scope minimal unless explicitly requested.
5. Run `npm run validate` after edits.
6. Use the reusable AI skills in `.github/skills/` whenever they apply.
7. For complex tasks, write a plan before you edit.
8. Use port `8080` for local Vite servers, unless the user asks for a different
   port. Use `npm run serve:dev-root` for development.
9. Store and update project documentation under `docs/`.
10. Keep visual/style rules in `docs/style-guide.md`; do not mix non-style governance there.
11. All game styling changes must strictly follow `docs/style-guide.md`.
12. Store global variables and runtime-tunable global configuration in `config/`.
13. Keep an even number of icon packs for the two-column Settings grid.
14. When cleaning up or refactoring features, run and follow
  `docs/dead-surface-audit.md` to remove dead/unnecessary code surfaces.
15. When possible, use the local VS Code browser for debugging.
16. Before starting a major refactoring, review the documentation in `docs/`
  to understand existing contracts, architecture notes, and style rules.
17. After completing a major refactoring, update the affected documentation
  in `docs/` to reflect the new state.

## Deployment Notes

- Site target: `https://satyrlord.github.io/mb/`
- The Pages workflow installs dependencies, validates, builds, and checks
  configuration. It publishes `dist/index.html`, `dist/assets/`, `config/`,
  `textures/`, `icon/`, and `sound/`.

## Do Not

- Do not add a new UI framework unless the user asks for it.
- Do not use absolute root asset paths. They break the `/mb/` site path.
- Do not skip validation or edit unrelated files during a focused change.
