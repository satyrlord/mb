# Memory Blocks (Windows 9x remake)

Browser-based recreation of the classic Windows 9x game **Memory Blocks**
using HTML, CSS, and TypeScript.

## Current Status

- Playable memory boards with multiple difficulty levels
 (5x6, 5x8 [default], 5x10)
- Dynamic emoji-based icon pairs generated at runtime
- Timer, attempts counter, restart button, and win state
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
npm run build
npm run lint
npm run typecheck
npm run validate
```

## Validation

`npm run validate` runs the required checks in order:

```bash
markdownlint .
eslint .
tsc --noEmit
```

## Project Layout

```text
src/                       TypeScript source
src/index.ts               App bootstrap and game loop wiring
src/game.ts                Game state and matching rules
src/board.ts               Board rendering and tile input handling
src/ui.ts                  HUD and status messaging updates
src/icons.ts               Dynamic emoji deck generation
src/utils.ts               Shared helpers (shuffle, time formatting)
index.html                 Browser entry point
styles.css                 Game styling
.github/workflows/pages.yml  GitHub Pages build/deploy workflow
```
