# Deslop Examples

Use these examples to judge a change. They are code patterns, not project
API definitions. Check the actual contract before you apply a pattern.

## Comment that repeats code

Before:

```ts
// Add the tile class.
element.classList.add("tile");
```

After:

```ts
element.classList.add("tile");
```

Keep a comment when it states an invariant or a reason that code cannot show.

## Guard on a required value

Before:

```ts
function showTile(tile: Tile | undefined): void {
  if (!tile) return;
  renderTile(tile);
}
```

After, only when every caller guarantees a tile:

```ts
function showTile(tile: Tile): void {
  renderTile(tile);
}
```

Keep the guard when an absent value is part of the real contract. Check every
caller and test before you remove it.
