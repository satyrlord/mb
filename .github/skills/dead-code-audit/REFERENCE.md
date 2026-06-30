# Dead Code Audit Reference

## Deletion Standard

Delete a finding only when all of the following are true locally:

- no static references remain
- no framework entrypoint or config file needs it
- no dynamic lookup, reflection, or serialization contract relies on it
- no nearby test or generated artifact expects it

If any one of those points is unresolved, stop and report instead of deleting.

## False Positive Checklist

Treat a finding as alive when it is used through one of these paths:

- DOM element references, event handler wiring, or conditional rendering
  in `board.ts` or other UI modules
- JSON serialization and deserialization contracts (leaderboard data,
  config files)
- reflection, dynamic imports, or template literal access
- Build entry files (`src/index.ts` bootstrap, HTML `script` tags,
  Vite config entry points)
- test-only or fixture-only reachability that the scan intentionally excludes
- DOM `data-` attribute references or `id` lookups from `index.html` markup
- CSS class name references that appear in template strings or
  `classList` calls
