---
name: dead-code-audit
description: Check unused code, symbols, and files in MEMORYBLOX. Use for a dead-code audit or cleanup based on analyzer findings.
---

# Dead Code Audit

Use direct evidence before you remove code. An unused-code tool can report a
false positive when an entrypoint or dynamic lookup uses a file.

## Procedure

1. Read `.github/copilot-instructions.md` and the request. Record the working
   tree state. Complete this step when you know whether the user authorized
   cleanup or only an audit.
2. Run `npm run typecheck`, `npm run lint`, and `npm run fallow`. Search the
   project with `rg` for relevant uses. Record command failures. Complete
   this step when each reported finding has a source and search result.
3. For each finding, inspect entrypoints, imports, DOM selectors, config,
   dynamic imports, assets, tests, and generated artifacts. Complete this
   step when the finding is proven live, proven unused, or still uncertain.
4. If cleanup is authorized, remove only code proven unused. Run the checks
   affected by each deletion. Complete this step when all affected checks
   pass or exact failures are recorded.
5. Report every finding, its evidence, action, and validation result. Do not
   delete an uncertain finding.

Read [REFERENCE.md](REFERENCE.md) for the deletion checks. Read
[EXAMPLES.md](EXAMPLES.md) for sample findings.
