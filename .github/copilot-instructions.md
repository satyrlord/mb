# MEMORYBLOX - Project Instructions for AI Agents

## Project Goal

The new **MEMORYBLOX** web game is a browser-based HTML/CSS/TypeScript remake
of a classic Windows 9x game called 'Memory Blocks'

## Current Implementation Snapshot

- Playable boards with three difficulties (5x6, 5x8, 5x10)
- Dynamic emoji deck generation with 8 themed icon packs
- Tile multiplier setting (1x / 2x / 3x) for multi-copy icon groups
- Animation speed setting (1x / 2x / 3x)
- Timer, attempt counter, restart flow, and win message
- Settings page with pack selection, tile multiplier, and animation speed
- Web Audio-based sound engine with centralized sound manager and loader
- Global leaderboard support with SQLite persistence
- Orientation toggle (landscape / portrait mode) with score bonus
- Win celebration particle effects
- Browser entry via `index.html` + compiled `dist/index.js`
- GitHub Pages deployment workflow in `.github/workflows/pages.yml`

## Tech Stack

- TypeScript (`strict: true`, ES2020, DOM libs)
- ES modules with Node-style resolution
- No framework; direct DOM manipulation

## Critical Workflows

Run these before any commit/push:

```bash
npm run validate
```

Quality gate (run before any commit/push):

```bash
npm run test
npm run test:coverage
```

Test coverage policy: every reported coverage table cell must be at least
90% (Statements, Branches, Functions, and Lines for each reported row/file).

Always scan the VS Code Problems tab after running the quality gate and resolve
all reported issues before commit/push.

Validation order is fixed:

```bash
markdownlint .
eslint .
tsc --noEmit
```

Development/build commands:

```bash
npm run dev
npm run build
```

## Architecture Map

- `src/index.ts`: app bootstrap, loop wiring, restart behavior
- `src/settings-controller.ts`: settings state, two-phase commit, and settings UI
- `src/debug-controller.ts`: debug menu, debug game modes, auto-match demo
- `src/game.ts`: canonical game state and selection/match logic
- `src/gameplay.ts`: GameplayEngine facade over game state
- `src/board.ts`: tile markup rendering and click delegation
- `src/ui.ts`: HUD and status message updates
- `src/icons.ts`: runtime icon deck generation (8 themed packs)
- `src/icon-assets.ts`: OpenMoji SVG asset definitions and lookup
- `src/openmoji-imports.ts`: auto-generated available OpenMoji token list
- `src/difficulty.ts`: difficulty presets (Easy, Normal, Hard)
- `src/tile-layout.ts`: tile multiplier and set distribution logic
- `src/presentation.ts`: game presentation model for views
- `src/session-score.ts`: session score flag normalization
- `src/leaderboard.ts`: leaderboard scoring, storage, and runtime config
- `src/leaderboard-view.ts`: leaderboard entry key/identity helpers and timestamp formatting
- `src/runtime-config.ts`: UI/win-fx runtime config loading
- `src/shadow-config.ts`: shadow preset loading
- `src/cfg.ts`: shared cfg-file parsing utilities
- `src/flag-emoji.ts`: flag emoji CDN URL and country name helpers
- `src/sound-engine.ts`: Web Audio API core engine (dual-layer)
- `src/sound-manager.ts`: high-level game sound controller
- `src/audio-loader.ts`: audio asset loading and caching
- `src/win-fx.ts`: win celebration particle effects
- `src/window-resize.ts`: window resize handle controller
- `src/utils.ts`: shared helper utilities

## Conventions

1. Keep game logic in `src/` TypeScript modules.
2. Preserve strict typing; avoid `any`.
3. Use relative asset paths so project Pages URL `/mb/` works.
4. Keep UX scope minimal unless explicitly requested.
5. Run `npm run validate` after edits.
6. Use the reusable AI skills in `.github/skills/` whenever they apply.
7. For very complex tasks, start in Plan mode first, then implement plan using Agent mode.
8. Always start local preview/dev servers on port `8080` for consistency unless the user explicitly asks for another port.
9. Store and update project documentation under `docs/`.
10. Keep visual/style rules in `docs/style-guide.md`; do not mix non-style governance there.
11. All game styling changes must strictly follow `docs/style-guide.md`.
12. Store global variables and runtime-tunable global configuration in `config/`.
13. Keep the total icon pack count even to preserve the 2-column Settings
  pack grid layout.
14. When cleaning up or refactoring features, run and follow
  `docs/dead-surface-audit.md` to remove dead/unnecessary code surfaces.

## Deployment Notes

- Site target: `https://satyrlord.github.io/mb/`
- Workflow builds with `npm ci`, validates, compiles, then publishes
  `index.html`, `styles.css`, `styles.winfx.css`, `dist/`, `config/`,
  `textures/`, `icon/`, `sound/`, and `music/` assets.

## Anti-patterns to Avoid

- Do not add React/Vue/build frameworks without explicit request.
- Do not hard-code absolute root asset paths (breaks `/mb/` deployment).
- Do not skip validation or modify unrelated files during focused changes.
