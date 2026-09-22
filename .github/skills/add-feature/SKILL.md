---
name: add-feature
description: Define and document a MEMORYBLOX feature. Use when adding a feature, resolving an unclear requirement, or changing a durable contract.
---

# Add Feature

Update the document that owns the requested behavior. Record decisions that
future work must follow. Do not create a second document for the same rule.

## Procedure

1. Read `.github/copilot-instructions.md`, relevant `docs/` files, code, and
   tests. Find the document that owns the behavior. Complete this step when
   you can name that document or show why a new document is needed.
2. State the objective, user value, assumptions, contract, testable success
   criteria, limits, and open questions. Ask the user only when the request
   and project contracts do not resolve a required decision. Complete this
   step when the implementation scope is clear.
3. Update the owning document under `docs/`. Record the reason for a durable
   decision. Keep visual rules in `docs/style-guide.md`. Use
   `docs/sound-engine-plan.md` for audio design, `docs/runtime-config.md` for
   runtime settings, and `docs/icon-pack-generator.md` for icon packs.
   Complete this step when the documents and proposed behavior agree.
4. Implement the authorized change or give a concrete handoff. Run
   `markdownlint-cli2` on edited Markdown. Complete this step when the
   required work is done and the edited Markdown passes lint.

Add a code comment only when it explains a required rule or an unexpected
format at the point of use. Update `.github/skills/README.md` when you add
or remove a skill.

Read [REFERENCE.md](REFERENCE.md) for the decision-record threshold. Read
[EXAMPLES.md](EXAMPLES.md) when you need an example of an owning document.
