# Deslop Examples

Before/after pairs to calibrate what "slop" looks like in MEMORYBLOX code.

## Example 1 — Comment Slop

### 1. Before (slop)

```ts
// Import the game state module for tile matching
import { GameState } from "../game";

// Define the board rendering function
// This function renders the game board with all tiles
export function renderBoard(state: GameState, container: HTMLElement): void {
  // Get the tiles from the game state
  const tiles = state.getTiles();

  // Clear the container before rendering
  // This ensures we don't have stale tiles from a previous render
  container.innerHTML = "";

  // Loop through each tile and create its DOM element
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    // Create a div element for the tile
    const el = document.createElement("div");

    // Add the tile CSS class
    el.className = "tile";

    // Set the data attribute for the tile index
    el.dataset.index = String(i);

    // If the tile is revealed, show the icon
    if (tile.revealed) {
      el.textContent = tile.icon;
    }

    // Append the tile element to the container
    container.appendChild(el);
  }
}
```

### 1. After (deslopped)

```ts
import { GameState } from "../game";

export function renderBoard(state: GameState, container: HTMLElement): void {
  container.innerHTML = "";

  for (const [i, tile] of state.getTiles().entries()) {
    const el = document.createElement("div");
    el.className = "tile";
    el.dataset.index = String(i);

    if (tile.revealed) {
      el.textContent = tile.icon;
    }

    container.appendChild(el);
  }
}
```

**What was removed:** restatement comments ("Define the board rendering function"),
obvious explanations ("Loop through each tile"), and redundant
line-by-line narration. **What was kept:** nothing — no comment in the
"before" version carried a non-obvious invariant or decision.

---

## Example 2 — Defensive Cruft Slop

### 2. Before (slop)

```ts
function playTileFlipSound(soundManager: SoundManager | null | undefined): void {
  try {
    // Check if the sound manager is available
    if (!soundManager) {
      console.warn("playTileFlipSound: soundManager is null");
      return;
    }

    // Check if the sound is muted before playing
    if (soundManager.isMuted && soundManager.isMuted()) {
      return;
    }

    // Try to play the flip sound
    const result = soundManager.play("tile-flip");
    if (!result) {
      console.warn("playTileFlipSound: play() returned false");
    }
  } catch (error) {
    // Silently catch any audio errors
    console.error("playTileFlipSound error:", error);
  }
}
```

### 2. After (deslopped)

```ts
function playTileFlipSound(soundManager: SoundManager): void {
  if (soundManager.isMuted()) return;
  soundManager.play("tile-flip");
}
```

**What was removed:** the entire try/catch that silently swallowed errors,
null-guard cascades that paper over invariants (the caller should never pass
null — that's a type error), and comments that restate the code.

**What was kept:** the mute check — that's a real business rule, not
defensive cruft.
