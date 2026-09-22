---
name: grill-me
description: Resolve design decisions with the user one at a time. Use when the user asks to grill a plan or decide an unclear design before implementation.
---

# Grilling

Inspect the relevant code and documents. Then ask the user one question at a
time until each decision needed for the plan is resolved. Use an available
question tool if it helps.

## Design Tree

Walk down each branch of the design tree. A **branch** is a decision point:
an architectural choice, a UX trade-off, an integration seam, a sequencing
question. Resolve dependencies between branches one-by-one — don't jump
ahead to child branches until the parent decision is made.

For each question, provide your recommended answer before asking for mine.

## Rhythm

- Ask questions **one at a time**.
- Summarize advantages and disadvantages for each option.
- If a question can be answered by exploring the repo, explore the repo instead of asking.
- When I answer with a constraint or preference, incorporate it immediately
  — don't ask the same branch again later.
- Record each durable decision in the document that owns it.

## Completion Criterion

The interview is complete when each decision needed for the plan has an answer,
dependencies between decisions are resolved, and durable decisions are in the
owning documents.
