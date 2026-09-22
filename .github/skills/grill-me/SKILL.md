---
name: grill-me
description: Challenge a MEMORYBLOX plan one unresolved decision at a time. Use when the user asks for a decision interview before implementation.
---

# Challenge a plan one decision at a time

Stay read-only unless the user authorizes edits. Read AGENTS.md, relevant docs, code,
tests, and current primary sources where needed. Resolve facts that the repository can
answer before asking the user.

List unresolved choices and order them by dependency and cost of reversal. Consider
gameplay, scoring, board interaction, accessibility, layout, settings, storage, assets,
performance, browser support, deployment, and verification when relevant.

For one active choice, state the evidence gap, give two or three distinct options when
useful, explain their effects, recommend one with a verifier, and ask one decision
question. Record the answer and its dependent choices before moving on. Reopen a settled
choice only when new evidence conflicts with it.

If the user authorizes documentation edits, update the owning file under docs/ and any
conflicting guidance. Otherwise report the exact change needed. Route authorized
implementation to [add-feature](../add-feature/SKILL.md) or
[refactor](../refactor/SKILL.md).

Finish when the user resolves or explicitly defers each identified choice. Name the owner and next verification step for each deferral.
