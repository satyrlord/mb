## Overview

This repository uses **npm** as its package manager with **lockfile v3** (`package-lock.json`) for deterministic dependency resolution. All dependencies are declared in `package.json` and managed through standard npm workflows, supplemented by GitHub's Dependabot for automated version updates.

## Package Manager & Lockfile Strategy

- **Package manager**: npm (Node.js package manager)
- **Lockfile**: `package-lock.json` using lockfileVersion 3, ensuring reproducible builds across environments
- **Registry**: Public npm registry (`https://registry.npmjs.org/`) — no private registries or vendoring detected
- **Engine constraint**: Node.js >=18.0.0 enforced via `engines` field in `package.json`

## Dependency Categories

All dependencies are declared as `devDependencies`, reflecting this project's architecture as a browser-based application with no runtime npm dependencies shipped to production:

### Build & Tooling
- **Vite** (^8.1.2) — primary build tool and dev server
- **TypeScript** (^6.0.3) — type checking and compilation
- **tsx** (^4.21.0) — TypeScript execution for tooling scripts

### Testing Stack
- **Vitest** (^4.1.4) — unit test runner with Istanbul coverage provider
- **Playwright** (^1.59.1) — end-to-end mobile browser testing
- **jsdom** (^29.0.2) — DOM simulation for unit tests

### Linting & Code Quality
- **ESLint** (^10.0.1) with `@eslint/js`, `typescript-eslint`, and `globals`
- **markdownlint-cli** (^0.48.0) — Markdown linting
- **fallow** (^2.103.0) — custom code quality/health auditing tool

### CSS Framework
- **Tailwind CSS** (^4.2.2) with `@tailwindcss/vite` plugin and `daisyui` (^5.5.19) component library

### Utility Dependencies
- **better-sqlite3** (^12.6.2) — SQLite storage for leaderboard (used in tooling)
- **concurrently** (^10.0.3) — parallel process execution for dev servers

### Version Overrides
The `overrides` field pins `minimatch` to `^10.2.1`, likely addressing a transitive dependency vulnerability or compatibility issue within the ESLint ecosystem.

## Automated Updates via Dependabot

`.github/dependabot.yml` configures two update streams:

1. **npm dependencies** — checked daily (weekdays) for new versions
2. **GitHub Actions** — checked weekly for workflow updates

Dependabot monitors the root directory (`/`) for `package.json` and lockfiles, automatically creating pull requests when updates are available.

## Module Resolution Configuration

`tsconfig.json` sets `moduleResolution: "bundler"`, aligning TypeScript's module resolution with Vite's bundler behavior. This ensures consistent import resolution between development, type-checking, and production builds.

Key TypeScript settings affecting dependency handling:
- `resolveJsonModule: true` — allows importing JSON files (e.g., config files)
- `skipLibCheck: true` — skips type-checking of declaration files in `node_modules`, improving build performance
- `types: ["vite/client"]` — includes Vite's ambient type definitions

## Build Pipeline Integration

Dependencies are integrated into the build pipeline through npm scripts:

- `npm run build` — runs artifact generation then `vite build`
- `npm run validate` — chains artifact sync, markdown linting, ESLint, and TypeScript type-checking
- `npm run quality:full` — comprehensive quality gate including all validation, fallow audit, unit tests, and E2E tests

The `artifacts` script (`npm run artifacts`) regenerates derived assets (audio indexes, icon sync) before builds, ensuring generated files stay in sync with source data.

## Development Workflow Conventions

- **No production dependencies**: The application ships zero npm packages to browsers; all dependencies are build-time or test-time only
- **Concurrent dev servers**: `npm run dev` uses `concurrently` to run Vite and the leaderboard server in parallel
- **Tool scripts use `.mjs` extension**: Custom tooling in `tools/` uses ES modules (`.mjs`) executed via `node` or `tsx`
- **Coverage exclusions**: Tool scripts, config files, and bootstrap entrypoints (`src/index.ts`) are excluded from unit test coverage metrics

## Rules for Developers

1. **Always commit `package-lock.json`** — ensures deterministic installs across machines and CI
2. **Use npm scripts for common tasks** — do not invoke tools directly; use `npm run lint`, `npm run test`, etc.
3. **Review Dependabot PRs promptly** — daily npm checks mean frequent update PRs; review and merge to keep dependencies current
4. **Do not add runtime dependencies** — the project intentionally has zero production dependencies; any new library should be a devDependency unless there is a compelling architectural reason
5. **Pin overrides cautiously** — the `minimatch` override exists for a specific reason; document any new overrides in comments or PR descriptions
6. **Run `npm run validate` before committing** — ensures linting, type-checking, and artifact consistency
7. **Node.js version requirement** — ensure local environment meets `>=18.0.0`; CI enforces this constraint