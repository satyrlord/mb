# Memory Blocks - Project Instructions for AI Agents

## Project Goal

Recreate the classic Windows 9x game **Memory Blocks** as a browser-based
HTML/CSS/TypeScript application. This is a greenfield project - the game
logic and UI are not yet implemented.

## Tech Stack & Architecture

- **Language**: TypeScript (strict mode, ES2020 target)
- **Runtime**: Browser (DOM + DOM.Iterable APIs)
- **Build**: TypeScript compiler (`tsc`) compiles `src/` → `dist/`
- **Module System**: ESNext modules with Node resolution
- **Source Structure**: All game code in `src/`, entry point is `src/index.ts`

## Critical Workflows

### Before ANY commit or run

Run these validations in order (all must pass):

```bash
markdownlint .
npx eslint .
npx tsc --noEmit
```

### Development

```bash
npx tsx src/index.ts          # Run TypeScript directly
npx tsc                        # Compile to dist/
```

### File watching (when implemented)

Use `tsc --watch` for continuous compilation during development.

## Project Conventions

1. **TypeScript-first**: No JavaScript files; use `.ts` extension
2. **Strict typing**: All code must satisfy `strict: true` compiler mode
3. **DOM-focused**: Target browser environment, not Node.js
4. **No frameworks**: Pure TypeScript, HTML, CSS - no React/Vue/Angular

- **Markdown validation**: All `.md` files must pass `markdownlint`
  (MD022 rule enforced)

## File Structure

```text
src/          # All TypeScript source code (entry: index.ts)
dist/         # Compiled output (gitignored)
.github/      # GitHub configuration & AI agent skills
.vscode/      # Workspace settings (TS server, markdown formatter)
```

## Configuration Notes

- **tsconfig.json**: Excludes `.md` and `.github` from compilation
- **TypeScript**: Uses workspace version (`node_modules/typescript/lib`)
- **VS Code**: Markdown files use `markdownlint` formatter,
  auto-format on save
- **Ignore patterns**: `.eslintignore` excludes `.md`, `node_modules`,
  `dist`, `.github`

## Memory Blocks Game Requirements

**What to implement:**

- Puzzle game with colored blocks on a grid
- Block matching/elimination mechanics (specifics TBD - research
  Windows 9x version)
- Score tracking and win/lose conditions
- Retro Windows 9x aesthetic (gray dialogs, system fonts,
  beveled edges)

**Research needed:**

- Original game rules and mechanics (block patterns, matching logic)
- Visual style guide from Windows 9x UI
- Animation timing and effects

## Getting Started (for AI agents)

1. Research the original Memory Blocks game to understand mechanics
2. Design the game architecture (game state, board, rendering)
3. Create HTML structure for game board and UI
4. Implement game logic in TypeScript modules
5. Style with CSS to match Windows 9x aesthetic
6. Test in browser and validate with linters before committing

## Key Files to Create

- `src/game.ts` - Core game logic and state management
- `src/board.ts` - Board rendering and block management  
- `src/ui.ts` - UI elements (score, buttons, dialogs)
- `index.html` - Main HTML entry point
- `styles.css` - Windows 9x-inspired styling

## Anti-patterns to Avoid

- Don't add build frameworks (webpack, vite) without discussion -
  keep it simple
- Don't use `any` type - leverage TypeScript's type system
- Don't create files outside `src/` for game code
- Don't skip the validation steps defined above
