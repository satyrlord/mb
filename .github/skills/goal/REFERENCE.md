# /goal Reference

Disclosed reference for [`/goal`](SKILL.md). Loaded when the agent needs the
layered template, anti-patterns, or worked examples.

## Layered Template

For complex, multi-hour goals, use this format:

```text
/goal <One-sentence high-level objective.>

## Breakdown
1. <Step 1 — what to investigate / produce>
2. <Step 2 — what to implement>
3. <Step 3 — what to verify>

## Measurable end state (the agent will verify exactly these)
- [ ] Command `<cmd>` exits 0.
- [ ] File `<path>` exists and contains `<regex or string>`.
- [ ] Metric `<name>` ≥ `<threshold>` per `<measurement command>`.
- [ ] Artifact: `<path>` matches the structure in `<schema/example>`.

## Success proof (what the agent must show you)
- Pasted output of the verification commands.
- A short diff summary per affected module.
- Updated `CHANGELOG.md` entry (if applicable).

## Constraints & non-goals
- MUST: <e.g., keep public API stable, run formatter after each edit>.
- MUST NOT: <e.g., delete migrations, touch config/, call paid APIs>.
- Style: <e.g., Conventional Commits, 2-space indent, no `any`>.
- Scope: <e.g., only files under src/auth/ and tests/auth/>.

## Verification loop
After each major change:
1. Run `<test cmd>` and `<lint cmd>`.
2. Append a one-line summary to `.goal/journal.md`.
3. Only declare done when ALL end-state checks pass on a clean run.

## Stop conditions
- Hard stop after N iterations — write `BLOCKERS.md` instead of guessing.
- Stop and ask if a destructive action is required (drop table, force push…).
```

## Anti-patterns

| Don't | Why | Do instead |
|-------|-----|------------|
| «Make the code better.» | No measurable end state. | Tie to tests, coverage %, or specific refactors. |
| End state = «agent says it's done.» | Worker grades itself. | Use commands/regex the agent can re-run. |
| No file/scope constraint. | Agent edits package.json, CI, secrets. | Whitelist directories. |
| Goal includes 7 unrelated tasks. | Can't verify cleanly; agent thrashes. | Split into separate goals. |
| No stop condition. | Burns tokens forever. | «Max N iterations, then write BLOCKERS.md.» |
| Goal launched on dirty working tree. | Hard to roll back. | Always branch + commit first. |
| Vague constraint like «be careful.» | No-ops the agent ignores. | Concrete: «do not modify package.json.» |
| End state has no negative checks. | Regressions slip through. | Add: «`rg "TODO\|FIXME" src/ \| wc -l` is unchanged or lower.» |

## MEMORYBLOX Examples

### Example 1: Code Migration

```text
/goal Replace all direct localStorage calls in src/ with the settings-controller API.

End state:
- rg "localStorage." src/ --type ts returns 0 matches (except in settings-controller.ts and player-name-prompt.ts).
- npm run quality:sanity exits 0.
- All existing tests pass.

Constraints:
- Only edit files under src/ and tests/.
- No new `any` type annotations.
- Preserve existing test coverage levels.
```

### Example 2: UI Feature

```text
/goal Add a dark/light theme toggle to the settings page.

End state:
- A toggle exists in the Settings page UI and switches themes.
- The choice persists across page reload (localStorage).
- npm run quality:sanity exits 0.
- Manual check: both themes render without visual regressions at 375px, 768px, 1280px.

Constraints:
- Follow docs/style-guide.md for visual rules.
- Use existing DaisyUI theme mechanism — no custom CSS theme variables.
- Do not modify game logic files (game.ts, board.ts, icons.ts).
```

### Example 3: Test Coverage

```text
/goal Bring src/leaderboard.ts test coverage above the 90% threshold.

End state:
- npx vitest run --coverage reports ≥90% for Statements, Branches, Functions, Lines on src/leaderboard.ts.
- npm run quality:sanity exits 0.

Constraints:
- Only add/modify tests in tests/leaderboard.test.ts.
- Do not modify src/leaderboard.ts to cheat coverage (no `/* istanbul ignore */` without explicit approval).
- No snapshot tests — use explicit assertions.
```

## Pro Tips

1. **Define «done» ruthlessly.** Vague goals fail. Tie completion to tests,
   files, regex matches, exit codes, or numeric thresholds.
2. **Start small, then scale.** Test with a 5-minute goal before launching a
   5-hour one. Watch with `/goal status`.
3. **Iterate on the goal itself.** If the agent drifts twice, `/goal clear`,
   then add a constraint that targets the failure mode.
4. **Use negative checks.** «…and `rg "TODO|FIXME" src/ | wc -l` is unchanged
   or lower» catches sneaky regressions.
5. **Log verdicts.** After each verification, append to `.goal/journal.md`.
   The log is gold for refining future goals.
6. **Prime context first.** Before `/goal`, make sure the agent has read the
   relevant docs in `docs/`. Cheap upfront context saves expensive mid-loop
   confusion.
