# Memory Blocks (Windows 9x remake)

Browser-based recreation of the classic Windows 9x game **Memory Blocks**
using HTML, CSS, and TypeScript.

## Stack

- TypeScript (strict mode)
- Browser DOM APIs (no framework)
- `tsc` for compile output to `dist/`

## Quick Start

```bash
npm install
```

Run the project entry file directly:

```bash
npx tsx src/index.ts
```

Compile TypeScript:

```bash
npx tsc
```

## Validation

Run these before each run/compile/commit:

```bash
markdownlint .
npx eslint .
npx tsc --noEmit
```

## Project Layout

```text
src/          TypeScript source (entry: src/index.ts)
dist/         Compiled output
.github/      Project and AI-agent instructions
```

## Roadmap

- Add `src/game.ts` for game state, rules, score, and win/lose conditions
- Add `src/board.ts` for grid rendering and block interactions
- Add `src/ui.ts` for score display, controls, and status messaging
- Add `index.html` and `styles.css` for browser UI and Windows 9x styling
