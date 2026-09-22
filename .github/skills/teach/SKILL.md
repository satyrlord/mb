---
name: teach
description: Teach a topic over several sessions and keep a record of learning.
disable-model-invocation: true
argument-hint: "What would you like to learn about?"
---

# Teach

Use the current directory as the teaching workspace when the user invokes
this skill. Check existing files before you create a file or lesson.

## Procedure

1. Read `MISSION.md` if it exists. Ask for the user's learning goal if the
   request does not make it clear. Record the goal with the format in
   [MISSION-FORMAT.md](MISSION-FORMAT.md). Complete this step when the goal
   gives a clear reason to learn the topic.
2. Read existing lessons, learning records, and `NOTES.md`. Use the records
   to select a task the user can do with some effort. Complete this step when
   you can state the next skill to practice and the evidence for that choice.
3. Find a trusted primary source for the lesson. Record it in `RESOURCES.md`
   with the format in [RESOURCES-FORMAT.md](RESOURCES-FORMAT.md). Complete this
   step when each factual claim in the lesson has a suitable source.
4. Create one short HTML lesson in `lessons/`. Number files in order, for
   example `0001-topic.html`. Give the user a task and prompt feedback. Use
   shared files in `assets/` when they already exist. Complete this step when
   the lesson teaches one skill, supports practice, and links its sources.
5. Record demonstrated learning in `learning-records/` with the format in
   [LEARNING-RECORD-FORMAT.md](LEARNING-RECORD-FORMAT.md). Update the mission
   only when the user changes it. Complete this step when the record states
   what the user can now do and the next step is clear.

Use [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md) when the learner understands a
term that future lessons need. Use `reference/` for short HTML reference
material. Read [REFERENCE.md](REFERENCE.md) for the learning model.

Do not create a learning record from exposure alone. Ask the user before you
change the mission. Do not assume the user wants to join a community.
