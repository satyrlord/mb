# Dependency Maintenance

## Compatibility contracts

Keep `vitest` and `@vitest/coverage-istanbul` on the same exact version.
The Istanbul provider has a version-specific Vitest peer dependency; upgrading
only the runner can leave the dependency graph invalid.

The jsdom 30 toolchain requires Node.js
`^22.22.2 || ^24.15.0 || >=26.0.0`. CI and Pages use the current Node.js 22
release. The `engines.node` field documents the supported development runtime.

Update `package.json` and `package-lock.json` together. Resolve the lockfile
with npm on a supported runtime, then verify it with `npm ci`. Review the
lockfile diff for unintended version changes. Do not use `--force` or
`--legacy-peer-deps` to hide compatibility problems.

## Pull request validation

`.github/workflows/ci.yml` runs on pull requests targeting `main` and pushes
to `main`. It uses a read-only repository token and does not retain checkout
credentials. The workflow performs the following checks in order:

1. Install the committed dependency graph with `npm ci`.
2. Run `npm run quality:sanity` for generated artifacts, Markdown lint,
   ESLint, TypeScript, Fallow, and unit tests.
3. Build the production site and validate runtime configuration.
4. Install Chromium and run both configured mobile-browser projects.
5. Run Istanbul coverage with the existing 90% policy enforced per file
   for statements, branches, functions, and lines.
6. Verify that generated tracked files have not changed.

The production build must precede browser tests because Playwright starts
`vite preview` on port 8080. CI limits Playwright to two workers without
excluding tests or projects.

Run the equivalent checks on Linux with a supported Node.js version:

```bash
npm ci
npm run quality:sanity
npm run build
bash tools/validate-config.sh
npx playwright install --with-deps chromium
npm run test:e2e -- --workers=2
npm run test:coverage -- \
  --coverage.thresholds.perFile \
  --coverage.thresholds.statements=90 \
  --coverage.thresholds.branches=90 \
  --coverage.thresholds.functions=90 \
  --coverage.thresholds.lines=90
git diff --exit-code
```

A workflow file is not evidence that tests passed. Verify successful checks
for the current pull request head before merging. Keep the pull request in
draft when lockfile regeneration or validation is incomplete. Close replaced
dependency pull requests only after their updates have reached `main`.
