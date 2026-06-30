The MemoryBlox project uses a modern JavaScript/TypeScript toolchain centered around **Vite** for bundling, **Vitest** for unit testing, and **Playwright** for end-to-end (E2E) regression testing. The entire build and deployment lifecycle is orchestrated via `npm` scripts and automated through **GitHub Actions** for static site hosting on GitHub Pages.

### Build System & Tooling
- **Bundler**: [Vite](https://vitejs.dev/) is configured via `vite.config.ts`. It handles TypeScript compilation, asset processing, and includes a custom plugin to serve and copy icon assets from the `icon/` directory to the `dist/` output during builds.
- **Language**: TypeScript is strictly typed (`strict: true`) with ESNext modules and ES2020 target, configured in `tsconfig.json`.
- **Styling**: Tailwind CSS v4 is integrated via the `@tailwindcss/vite` plugin.
- **Artifact Generation**: Before building, the system runs `npm run artifacts`, which executes custom Node.js scripts (`tools/generate-audio-indexes.mjs` and `tools/sync-icon-artifacts.mjs`) to generate JSON indexes for audio files and synchronize icon packs. This ensures that runtime assets are up-to-date before packaging.

### Testing Strategy
- **Unit Tests**: [Vitest](https://vitest.dev/) is used for unit testing, configured in `vitest.config.ts`. It excludes E2E tests and tooling scripts from coverage reports. Coverage is provided by `@vitest/coverage-istanbul`.
- **E2E Tests**: [Playwright](https://playwright.dev/) handles mobile-specific layout regression tests, configured in `playwright.config.ts`. It targets mobile Chromium profiles (Pixel 7) and runs against a local Vite preview server.
- **Validation**: A comprehensive `npm run validate` script chains together artifact generation, markdown linting, ESLint, and TypeScript type-checking to ensure code quality before commits or builds.

### CI/CD Pipeline
- **Platform**: GitHub Actions (`.github/workflows/pages.yml`).
- **Trigger**: Pushes to the `main` branch or manual workflow dispatch.
- **Steps**:
  1. **Setup**: Checks out code and sets up Node.js 22 with npm caching.
  2. **Install**: Runs `npm ci` for deterministic dependency installation.
  3. **Validate**: Executes `npm run validate` to catch linting, typing, and artifact issues early.
  4. **Build**: Runs `npm run build`, which triggers artifact generation and Vite bundling.
  5. **Config Validation**: Executes a custom Bash script (`tools/validate-config.sh`) to verify the existence, syntax, and required keys of runtime configuration files (`config/*.cfg`).
  6. **Stage**: Copies built assets (`dist/`) and static resources (`config/`, `textures/`, `icon/`, `sound/`) into a `site/` directory structured for GitHub Pages.
  7. **Deploy**: Uses `actions/upload-pages-artifact` and `actions/deploy-pages` to publish the `site/` directory to GitHub Pages.

### Developer Conventions
- **Scripts**: Use `npm run dev` for local development (starts Vite and a local leaderboard server). Use `npm run build` for production builds.
- **Quality Gates**: Always run `npm run quality:sanity` (validate + fallow audit + unit tests) before pushing. Full quality checks include E2E tests (`npm run quality:full`).
- **Configuration**: Runtime configurations are stored in `config/*.cfg` files using a simple `key=value` format. These are validated by `tools/validate-config.sh` during CI to prevent missing or deprecated keys.
- **Assets**: Icon and audio assets are managed via generated JSON indexes. Do not manually edit `artifacts/generated-*.json`; instead, use `npm run artifacts` to regenerate them from source directories.