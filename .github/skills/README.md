# MEMORYBLOX — Agent Skills

Agent skills for the MEMORYBLOX browser-based web game. Organised by invocation type.

## Development Workflow

| Skill | Invocation | Purpose |
|---|---|---|
| [`add-feature`](./add-feature/SKILL.md) | Model-invoked | Spec-driven development: create specs, acceptance criteria, durable decisions, and documentation for new work. Run `markdownlint-cli2` on edited Markdown after changes. |
| [`ablation-test`](./ablation-test/SKILL.md) | Model-invoked | Prove which changed files are actually required for a fix. Use after `diagnose` when a discriminating PASS/FAIL check exists. |
| [`diagnose`](./diagnose/SKILL.md) | Model-invoked | Structured debugging loop for hard bugs and performance regressions. Build a feedback loop, hypothesise, instrument, fix. |
| [`dead-code-audit`](./dead-code-audit/SKILL.md) | Model-invoked | Audit TS code for dead code, orphan files, and unused symbols. Optionally remove provably dead code. |
| [`refactor`](./refactor/SKILL.md) | Model-invoked | Surgical, behavior-preserving cleanup. Watch for game state lifecycle, Web Audio lifecycle, DOM event hazards, and leaderboard storage constraints. |
| [`deslop`](./deslop/SKILL.md) | Model-invoked | Remove AI-generated code slop from the branch diff: unnecessary comments, defensive cruft, `any` casts, deep nesting, and style inconsistencies. |
| [`run-quality-gate`](./run-quality-gate/SKILL.md) | Model-invoked | Deterministic quality gate: clear Problems, markdownlint, ESLint, tsc, unit/e2e tests, and enforce >=90% in every coverage cell without suppression by default. |

## Design & Architecture

| Skill | Invocation | Purpose |
|---|---|---|
| [`claude-design-parity`](./claude-design-parity/SKILL.md) | Model-invoked | Extract design tokens from a reference design (Claude Design project or archive) and drive DaisyUI/Tailwind theme customizations toward parity. |
| [`improve-codebase-architecture`](./improve-codebase-architecture/SKILL.md) | User-invoked | Scan for architectural friction, generate a visual HTML report, then grill through candidates. |

## Code Review

| Skill | Invocation | Purpose |
|---|---|---|
| [`full-code-review`](./full-code-review/SKILL.md) | User-invoked | Thermo-nuclear code quality review: code-judo restructurings, 1k-line rule, spaghetti-growth detection, abstraction quality, and maintainability. |

## Productivity & Meta

| Skill | Invocation | Purpose |
|---|---|---|
| [`grill-me`](./grill-me/SKILL.md) | Model-invoked | Interview the user relentlessly about a plan or design before building. |
| [`handoff`](./handoff/SKILL.md) | User-invoked | Compact the conversation into a handoff document for another agent to continue. |
| [`teach`](./teach/SKILL.md) | User-invoked | Multi-session teaching of a new skill or concept. |
| [`writing-great-skills`](./writing-great-skills/SKILL.md) | User-invoked | Reference for authoring skills: vocabulary and principles. |

> **Note:** Skills were adapted from the MixJam Electron project for this MEMORYBLOX web game codebase. If you encounter stale references, please update them.
