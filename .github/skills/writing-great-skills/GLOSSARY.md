# Writing Great Skills Glossary

Use these terms to check a skill. The terms describe its structure and common
failure modes. [SKILL.md](SKILL.md) gives the audit procedure.

## Invocation

### Predictability

The degree to which an agent follows the same process on each use. The output
can vary. All other rules in this glossary support predictability.

### Model-Invoked

A skill that the agent can select from its description. The user can also
invoke it. Its description adds context load on every turn.

### User-Invoked

A skill with `disable-model-invocation: true`. Only the user can start it by
name. This saves context load but adds cognitive load for the user.

### Description

The short text that states when the agent should select a model-invoked skill.
It is always visible to the agent. For a user-invoked skill, it is a short
summary for the user.

### Context Pointer

Text that names material outside the current context and states when to read
it. A skill description points to the skill. A link in `SKILL.md` can point
to a reference file. The condition in the pointer must be clear.

### Context Load

The tokens and attention used by descriptions that the agent sees on each
turn. Add a model-invoked skill only when agent discovery is useful.

### Cognitive Load

The effort a user needs to remember user-invoked skills and when to use them.
A router skill can reduce this effort.

### Router Skill

A user-invoked skill that lists other user-invoked skills and when to use each.
It guides the user but cannot invoke those skills for the user.

## Content Structure

### Information Hierarchy

The order in which the agent needs content. Put ordered steps first in
`SKILL.md`. Put rules needed on every use there too. Put rules for selected
cases in a linked reference file.

### Steps

Ordered actions that the agent must perform. Each step needs a completion
criterion. A skill can consist of steps, reference, or both.

### Completion Criterion

An observable condition that tells the agent a step or task is complete. A
good criterion is clear and covers all items in scope. It makes the agent do
the necessary legwork and resists premature completion.

### Reference

Definitions, facts, examples, and rules that the agent reads when needed.
Reference can be in `SKILL.md` or in a linked file.

### External Reference

Reference outside the skill system that several skills can use. It has no
invocation trigger or procedure.

### Progressive Disclosure

Move reference for a selected case from `SKILL.md` to a linked file. State
when the agent must read that file. Keep material needed on every use in
`SKILL.md`.

### Co-location

Keep a concept's definition, rules, and limits under one heading. This lets
the agent read related material together.

### Branch

A distinct use of a skill that needs a different set of instructions. A
linear skill has no branches.

### Granularity

How finely skills are divided. A new model-invoked skill adds context load.
A new user-invoked skill adds cognitive load. Split only when an independent
trigger or a procedure problem justifies it.

### Post-Completion Steps

Steps that follow the current step. When they draw attention away from an
unfinished step, first make that step's completion criterion clearer.

### Legwork

The inspection, tests, and other work needed to complete a step. An
exhaustive completion criterion makes the required legwork clear.

## Language and Maintenance

### Leading Word

A familiar word that helps the agent select or follow a skill. Use it in the
description when it matches how users ask for the task. Repeat the word only
when it helps the agent make the same decision.

### Single Source of Truth

One authoritative location for each rule. Change that location when the rule
changes instead of updating copies.

### Relevance

Whether a line still affects the skill's task. Remove lines that are outside
scope or no longer match the code or tools.

## Failure Modes

### Premature Completion

The agent leaves a step before it meets its completion criterion. Make the
criterion checkable first. Split a procedure only when the criterion cannot
be made clear and later steps still cause the agent to rush.

### Duplication

The same rule appears in more than one place. Remove copies so one source
defines it.

### Sediment

Old content remains after the task or code changes. Remove it after a
relevance check.

### Sprawl

A skill is too long to use or maintain, even if each line is current. Move
case-specific reference behind a clear context pointer.

### No-Op

An instruction that does not change the agent's behavior. Test each sentence
against the agent's normal behavior. Remove it if it has no effect.
