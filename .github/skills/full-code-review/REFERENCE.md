# Full Code Review — Reference

Disclosed reference for the `full-code-review` skill. Contains a worked
MEMORYBLOX example, extended remedy patterns, and a quick-reference checklist.

## Worked Example — MEMORYBLOX Board Refactor PR

### Scenario

A PR adds tile animation support to the board. The diff touches
`src/board.ts`, `src/game.ts`, and `src/ui.ts`.

### Review Walkthrough

**File-size check.** `board.ts` was 680 lines; the PR adds 140 lines
(animation state, CSS class toggling, transition end handlers).
That doesn't cross 1k yet, but with the animation controller logic inline,
it's trending that way. Flag: "can we extract the animation logic into a
separate module before it crosses 1k?"

**Spaghetti check.** The animation toggle calls
`element.classList.add('tile-flipping')` from inside the game state
update handler. But `board.ts` already owns DOM rendering — now it also
owns animation timing. Two problems:

1. The board module is taking on animation concerns that should live in
   a presentation layer.
2. Manual `setTimeout` for animation cleanup is brittle; there's no
   centralized animation lifecycle.

**Structural finding.** The animation state lives as a `Set<string>` of
animating tile IDs on the board, but `game.ts` already tracks tile states
(`hidden`, `revealed`, `matched`). Two sources of truth for tile state.
The cleaner design: add an `animating` transient state to the game model;
the board reads it; presentation handles the CSS transitions.

**Remedy.** Instead of adding animation to the bloated `board.ts`:

1. Extract `TileAnimator` as a separate module.
2. Derive animation state from game state transitions, not a separate Set.
3. Remove manual `setTimeout` cleanup; use `transitionend` events.

**Verdict.** Request changes. Three presumptive blockers: board module
taking on unrelated concerns, duplicate state tracking, and brittle
animation cleanup.

## Extended Remedy Patterns

When the body's "Preferred Remedies" list feels abstract, reach for these
patterns:

### Delete-a-layer

**Smell:** `PresentationModel` wraps `GameState` which wraps raw tile data.
Three layers for one data access.

**Move:** Delete `PresentationModel`. Access `GameState` directly where
possible. If `GameState` is also a pass-through for certain properties,
inline those accessors.

**Test:** After deletion, is anything harder to understand? No → keep the
deletion.

### Reframe-the-model

**Smell:** `if (tile.isRevealed) { ... } else if (tile.isMatched) { ... } else { ... }`
in three different files.

**Move:** Replace booleans with a typed state:
`type TileState = 'hidden' | 'revealed' | 'matched' | 'animating'`.
One switch in one place. Conditional branches collapse.

### Push-to-canonical-layer

**Smell:** Feature-specific logic in a general-purpose module. A new
leaderboard sort order condition in the shared utility module.

**Move:** General layer exposes a registration point (e.g.
`registerSortOrder(name, comparator)`). Feature module registers itself.
Shared layer stays general.

### Collapse-branches

**Smell:**

```ts
if (a) { doX(); }
if (b) { doX(); }
```

Two branches, same action, different guards.

**Move:** Extract the guard: `if (shouldDoX(a, b)) { doX(); }`. Or better:
collapse the guards upstream so `a` and `b` don't diverge in the first place.

### Inline-the-wrapper

**Smell:**

```ts
function wrapFetch(url: string) { return fetch(url); }
```

An identity function with a different name.

**Move:** Delete it. Call `fetch()` directly. If the wrapper adds logging or
error handling, make that the function's name: `fetchWithTimeout`, not
`wrapFetch`.

## Quick-Reference Checklist

Before approving, confirm:

- [ ] No file crossed 1k lines without a strong reason
- [ ] No new ad-hoc conditionals bolted onto unrelated flows
- [ ] No architecture boundary leak (engine ↔ ui direct calls)
- [ ] No duplicate state (same fact in two stores/modules)
- [ ] No thin wrappers or identity abstractions
- [ ] No `any` casts used to bypass type-checking
- [ ] Logic lives in the canonical layer for its concept
- [ ] No obvious code-judo simplification was missed
