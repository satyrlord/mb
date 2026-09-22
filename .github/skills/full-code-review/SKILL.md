---
name: full-code-review
description: Review code quality, correctness, and structural risks.
disable-model-invocation: true
---

# Full Code Review

Review the requested scope for defects and unnecessary complexity. Look for a
simpler structure that removes branches, wrappers, or duplicate state while it
keeps behavior. Use file and line evidence for each finding.

## Procedure

1. Read the request and project contracts. Record the current working tree
   state. For a change review, inspect `git diff`, `git diff --cached`, and
   untracked files. Complete this step when every file in scope is known.
2. Review every changed hunk for correctness, type safety, security,
   accessibility, asset paths, tests, and resource cleanup. Compare new code
   with its callers and tests. Complete this step when every hunk has been
   checked and each finding has a file, line, effect, and proposed repair.
3. Check the structure. Look for duplicate state, scattered special cases,
   thin wrappers, unclear ownership, and new files that cross 1,000 lines.
   Recommend a restructure only when it removes complexity and preserves the
   contract. Complete this step when each proposed restructure names the
   code it can remove and how to verify behavior.
4. If the user asked for fixes, make the supported repairs. Run change-relevant
   checks and the required project gate. Complete this step when each repaired
   finding has verification evidence.
5. Report findings in severity order. For a wider review, add only the
   highest-impact findings outside the change. State checks, limits, and
   unresolved risks. Do not report a clean review while a supported finding
   remains.

Do not change unrelated code or user work during a review. Treat a 1,000-line
crossing as a signal to inspect, not a rule that requires a split. Use
`run-quality-gate` for the repository commands when a full gate is required.

Read [REFERENCE.md](REFERENCE.md) for examples of structural findings and
repairs.
