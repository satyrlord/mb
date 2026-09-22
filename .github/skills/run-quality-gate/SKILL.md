---
name: run-quality-gate
description: Run or repair MEMORYBLOX validation, unit tests, browser tests, build, coverage, and deployment checks. Use for requested verification or release readiness.
---

# Run the quality gate

Match the user's requested scope. Verify mode reports results; repair mode fixes
failures within the requested scope. Read AGENTS.md, package.json, relevant test and
build configuration, GitHub workflows, and repository status. Preserve unrelated work.

Use npm run quality:sanity before a commit or push. It runs validation, Fallow, and unit
tests. Use npm run quality:full when browser tests are required; it adds Playwright. The
Playwright config uses mobile Chromium projects and Vite preview on port 8080. Build the
production site with npm run build before local browser tests because preview serves
dist/. Do not assume quality:full includes the build, config validation, or coverage.

For CI or release readiness, also check the configured steps in
.github/workflows/ci.yml: npm run build, bash tools/validate-config.sh, browser tests,
per-file coverage at 90% for statements, branches, functions, and lines, and
generated-artifact diff. Check the Pages workflow and /mb/ asset paths when deployment
is affected. Run changed-skill validation when a skill package changed.

Run focused checks first when they resolve a specific risk. Do not replace a
user-requested gate with a narrower command. Do not add suppressions, exclusions, or
lower thresholds to make a gate pass. Repeat successful checks only after a change or a
concrete concern. Run git diff --check and inspect final status and diff.

Report each applicable check as PASS, FAIL, BLOCKED, or N-A with its command and result.
Separate existing failures from scoped regressions. Name any unavailable check and next
action. Claim an overall pass only when every check required for the requested scope
passed.
