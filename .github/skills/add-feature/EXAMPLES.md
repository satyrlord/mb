# Add Feature Examples

## Example 1: Clarify Game State Contract

- Prompt shape: "Update the game state spec for this new tile multiplier behavior."
- Good behavior: edit the owning contract doc, define success
  criteria, and keep non-goals explicit.
- Good result: the next implementation slice becomes unambiguous.

## Example 2: Record A Durable Trade-Off

- Prompt shape: "Record why we are not versioning leaderboard data files."
- Good behavior: capture the decision, rationale, and consequences in the
  owning doc under `docs/` instead of scattering the answer across
  chat history.
- Good result: future architecture or format work stops re-litigating the same
  question.

## Example 3: Add A Glossary Term

- Prompt shape: "Define 'tile multiplier' so the docs stop drifting."
- Good behavior: add the smallest durable glossary entry in the owning doc.
- Good result: later prompts and specs use one canonical term.
