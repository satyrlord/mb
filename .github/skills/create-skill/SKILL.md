---
name: create-skill
description: Create, import, review, or revise reusable skills in the MEMORYBLOX repository. Use when a repository workflow needs skill guidance.
---

# Create or revise a repository skill

Read AGENTS.md and inventory the affected package under .github/skills/. For an import,
retain reusable workflow guidance and remove foreign project names, paths, commands,
contracts, and permission assumptions. Check the current package.json, docs, code, and
workflows before naming a project rule.

Use a lowercase, hyphenated folder name. Put a precise trigger in SKILL.md frontmatter.
Keep the entry point short; add references/ only for substantial conditional guidance,
scripts/ for repeatable deterministic work, and assets/ for output material. Link each
supporting file from the entry point. Keep agents/openai.yaml consistent with the skill
and preserve its invocation policy unless the user asks to change it.

Use short, direct instructions. Define a branch's authority and completion condition
when they affect the workflow. Do not duplicate AGENTS.md or turn a past example into a
universal rule. Check links and all named commands and paths against this checkout.

Validate changed packages with:

    node .github/skills/create-skill/scripts/validate-skill.mjs <skill-folder>...

The runner locates the installed skill-creator validator and a Python environment with
PyYAML. If it reports BLOCKED, report the missing dependency and next action. Also check
metadata, foreign terms, placeholders, links, and any changed script. A validator pass
checks packaging, not the workflow's decisions.

Finish when the trigger is precise, all resources are reachable, project facts are current, and validation passes or a specific blocker is reported.
