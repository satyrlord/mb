---
name: deslop
description: Audit or remove unsupported MEMORYBLOX code, prose, data, and configuration while preserving valid behavior. Use for requested repository cleanup.
---

# Remove unsupported repository content

Use audit mode for a read-only request. Use cleanup mode when the user asks for edits.
Inspect repository status and inventory the requested scope. Compare each candidate with
its owning code, docs, tests, and a valid sibling. Record the unchanged baseline when a
relevant test or generated artifact can be checked.

Remove only confirmed stale facts, duplicate rules, unreachable helpers, misleading
comments, obsolete selectors, or other content that conflicts with its owner. Preserve
valid behavior, user edits, package pins, generated inputs, media, licenses, and test
fixtures. Treat a warning or unusual style as a prompt to inspect, not proof of a
defect.

For game styling, follow docs/style-guide.md. For config, compare keys with loaders,
consumers, and docs/runtime-config.md. For reachability, use
[dead-code-audit](../dead-code-audit/SKILL.md) and docs/dead-surface-audit.md. Keep
cleanup narrow; do not introduce feature or architecture changes under this skill.

Run focused checks after each related edit group. Re-read the complete requested scope
and report changed, unchanged, and unresolved candidates. Finish when each removal has
direct evidence and applicable checks pass.
