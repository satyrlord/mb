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
- Bootstrap-adjacent UI orchestration extracted into dedicated controllers for audio UI, leaderboard UI, orientation, player-name prompt, and win sequence flow
- Global leaderboard support with SQLite persistence
- Orientation toggle (landscape / portrait mode) with score bonus
- HD mode toggle (reduces particles and disables plasma animations on low-end devices)
- Win celebration particle effects
- Browser entry via `index.html` + compiled `dist/index.js`
- GitHub Pages deployment workflow in `.github/workflows/pages.yml`

## Tech Stack

- Vite 8+ (latest) for build
- DaisyUI 5+ (latest) for front-end
- Playwright (latest) for testing
- Istanbul (latest) for code coverage

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct. No over-engineering.
- If unsure: say so. Never guess or invent file paths.
- User instructions always override this file.

## Efficiency

- Read before writing. Understand the problem before coding.
- No redundant file reads. Read each file once.
- One focused coding pass. Avoid write-delete-rewrite cycles.
- Test once, fix if needed, verify once. No unnecessary iterations.

## Critical Workflows

Run these before any commit/push:

```bash
npm run quality:sanity
```

This runs `npm run validate` followed by `npm run test`. For a full quality
gate that also includes E2E (Playwright) tests:

```bash
npm run quality:full
```

To check test coverage independently:

```bash
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
- `src/leaderboard-ui.ts`: leaderboard UI rendering, submission, and refresh
- `src/leaderboard-view.ts`: leaderboard entry key/identity helpers and timestamp formatting
- `src/runtime-config.ts`: UI/win-fx runtime config loading
- `src/shadow-config.ts`: shadow preset loading
- `src/cfg.ts`: shared cfg-file parsing utilities
- `src/flag-emoji.ts`: flag emoji CDN URL and country name helpers
- `src/sound-engine.ts`: Web Audio API core engine (dual-layer)
- `src/sound-manager.ts`: high-level game sound controller
- `src/audio-loader.ts`: audio asset loading and caching
- `src/audio-ui-controller.ts`: mute button state, music autoplay recovery, unlock notice
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
15. When debugging, use the local VSCode browser if possible. Try to avoid opening external browsers unless absolutely necessary.
16. Before starting a major refactoring, review the documentation in `docs/`
  to understand existing contracts, architecture notes, and style rules.
17. After completing a major refactoring, update the affected documentation
  in `docs/` to reflect the new state.

## Deployment Notes

- Site target: `https://satyrlord.github.io/mb/`
- Workflow builds with `npm ci`, validates, compiles, then publishes
  `index.html`, `styles.css`, `styles.winfx.css`, `dist/`, `config/`,
  `textures/`, `icon/`, `sound/`, and `music/` assets.

## Anti-patterns to Avoid

- Do not add React/Vue/build frameworks without explicit request.
- Do not hard-code absolute root asset paths (breaks `/mb/` deployment).
- Do not skip validation or modify unrelated files during focused changes.
