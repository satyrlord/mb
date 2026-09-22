---
name: writing-great-skills
description: Check the structure, triggers, and language of an agent skill.
disable-model-invocation: true
---

# Writing Great Skills

A good skill makes an agent follow a repeatable process. The output can vary.
Use the checks below for each skill file. Read [GLOSSARY.md](GLOSSARY.md) when
a term needs a full definition.

## Invocation

A **model-invoked** skill has a description that tells the agent when to use
it. Keep one distinct trigger for each task type. Put the main task word near
the start. Remove repeated trigger phrases.

A **user-invoked** skill has `disable-model-invocation: true`. Its description
is a short summary for the user. Use this type when only the user should start
the skill. If users must remember too many such skills, create a router that
lists each skill and when to use it.

## Procedure and completion

Put ordered actions in `SKILL.md`. End each action with a condition that the
agent can check. The condition must cover the full task. For example, require
evidence for every changed file instead of a general change summary.

Keep rules that every use needs in `SKILL.md`. Move rules for a special case
to a linked reference file. State when the agent must open that file. Put the
definition, rule, and limit for one concept together.

Split a skill only when a distinct task needs its own trigger or a long
procedure causes the agent to leave an earlier step incomplete. First make
the completion condition clear. Split a procedure only if that does not solve
the problem.

## Language and pruning

Use one source for each rule. Remove a sentence if it has no effect on agent
behavior. Remove old rules when the code or tools change. Use a familiar
leading word for an important action when that word makes the action clearer.
Define a technical term if its meaning is not clear in context.

For procedures and error text, use short sentences and one instruction per
sentence. Use active voice and clear commands. Keep code names, commands,
paths, and required technical terms exact. Do not claim formal ASD-STE100
conformance without a rule and dictionary check against the licensed issue.

## Final check

For every skill in scope, check its invocation, task steps, completion
conditions, reference links, duplicate rules, and current code or tool
claims. Run Markdown lint. Report each issue you could not verify.
