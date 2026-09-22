---
name: handoff
description: Record the state of a task for another agent.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

Write a short Markdown document for the next agent. Save it in the operating
system's temporary directory unless the user gives another location.

## Required content

1. **Current task:** state the objective and scope.
2. **Current state:** state the last action and exact next step. Give file
   paths and commands when they apply.
3. **Decisions:** state each durable choice and its reason.
4. **Open questions:** include only questions that block the next step.
5. **Changed files:** list paths and relevant diff or commit references.
6. **Suggested skills:** name relevant repository skills in use order.

Point to existing documents instead of copying them. Do not include secrets
or personal data. If the user names a focus for the next session, put the
information for that focus first.

The handoff is complete when an agent can read the document and repository,
then identify the task, last action, and next step without another question.
