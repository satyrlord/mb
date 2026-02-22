# MEMORYBLOX Style Guide

This guide defines visual and styling rules for the game UI.

## Core Principles

- Keep the UI compact, readable, and game-first.
- Preserve a Windows 11 desktop feel with retro game flavor.
- Reuse existing tokens and primitives before adding new ones.

## Window, Scale, and Aspect Rules

- In resize-ready mode, the app window uses a fixed aspect ratio of `16:10`.
- Base window size is anchored at a minimum of `1024x640`.
- Runtime scale defaults to `1.0` and targets a clamp range of `0.72..1.5`.
- On very small viewports, effective minimum scale can drop below `0.72`
  because viewport-bound clamping takes precedence.
- Scaling is also clamped by viewport bounds with `16px` padding on
  each side.
- Persist user scale in local storage (`memoryblox-window-scale`).
- Apply UI scaling at the shell level (`--ui-scale`) and keep app internals
  in base pixel coordinates.

## Anchor and Resize Rules

- Keep transform origin anchored to top-left for consistent scaling.
- The resize handle is bottom-right anchored and is the only direct resize
  affordance.
- Resize drag uses pointer capture and must preserve the fixed aspect ratio.
- During resize drag, disable text selection and restore it when drag ends.
- Persist scale only after resize completes.

## Top and Bottom Bar Rules

- Top and bottom bars must never show internal scrollbars.
- Bars may wrap controls when needed and must remain fully visible.
- Bars stay visually above game content where overlays are needed.
- Status and control areas must not overlap with the game canvas.

## Game Canvas Rules

- The canvas uses frame sections (`menu`, `game`, `debug-tiles`), and only
  one frame is visible at a time.
- Game boards must remain within available width (`max-width: 100%`).
- Popover menus must render above the canvas and remain plainly visible.
- Win effects render in a dedicated layer and should not break frame layout.

## Board and Tile Sizing Rules

- Tile minimum size is `44px` to preserve usability and touch target quality.
- Default board target tile size is `84px` with `10px` gaps.
- Board width should follow `min(targetWidth, 100%)` behavior.
- Tiles default to front-facing (`0deg` camera tilt and rest angle).
- Tile reveal uses a vertical-axis flip via `rotateY`
  (flat rest at `0deg`, reveal at `-180deg`) with intentionally slower timing.
- Tile-to-emoji proportion should be maintained through container-relative
  sizing (`cqw`) so icons scale with tile size.
- Keep front glyph and back emoji ratios aligned with implementation values
  (`62cqw` for front symbol, `clamp(1.2rem, 72cqw, 4.6rem)` for back emoji).
- Emoji on tile backs should include a subtle dark outline/shadow for contrast
  against light or green-heavy tile backgrounds.

## Debug Tile Sizing Rules

- Debug Tiles mode uses the same tile visual style primitives as normal play.
- Debug tiles are intentionally 50% of the previous debug prototype size
  (`120px` minimum instead of `240px`).
- Debug board spacing and padding should match standard board rhythm
  (`10px` gap, `8px` padding).

## Debug Menu Styling Rules

- The top-bar Debug entry uses a bug icon.
- Menu left edge aligns with Debug button left edge.
- Menu items use compact menu styling, not normal button styling.

## Theme and Token Rules

- The game uses a **dark-only** theme; there is no light-mode or theme-blend
  toggle. All color tokens resolve to their dark values.
- Use CSS variables from `styles.css` for colors, borders, and surfaces.
- Do not hard-code new colors, shadows, or typography without clear need.
- Color tokens are plain values (no `color-mix` expressions); update the
  CSS variable directly when a color needs changing.

## Plasma Surface Rules

- The `.plasma-surface` class is a **composable containment host**. Apply it
  to any element whose interior should show the plasma texture effect.
- Containment properties (`overflow:hidden`, `isolation:isolate`,
  `clip-path:inset(0)`) live on `.plasma-surface` in `styles.css`.
- The animated texture layers (`::before` glow, `::after` flares) live in
  `styles.winfx.css`; keep motion rules there, not in `styles.css`.
- Brightness is set per target via `background-color` + `background-blend-mode:
  multiply` on `.{target}.plasma-surface` rules:
  - Tile front face (`?` symbol): `#808080` → 50% brightness.
  - Tile back face (emoji): `#ffffff` → white base, with plasma texture
    visibility controlled by `--tile-back-opacity` (falling back to
    `--tile-global-opacity`, default `50%`) so the emoji remains clearly legible.
- Matched tile green highlight opacity is also controlled by
  `--tile-back-opacity` (falling back to `--tile-global-opacity`) via the
  `ui.tileBackOpacity` / `ui.tileGlobalOpacity` config keys, so the glow
  tracks the same runtime-tunable as the back-face plasma.
- Each tile receives a `--tile-index` CSS custom property (set by `board.ts`)
  for staggered animation offsets via `animation-delay`.
- The SVG displacement filter must be applied to the texture image layer, not
  to a parent with `overflow:hidden`, to avoid clipping artifacts.

## Motion Styling Rules

- Respect reduced-motion preferences by reducing or removing non-essential
  motion.
- In reduced-motion mode, tile reveal should remain visible but gentler
  (do not force instant/no-transition tile flips).
- Endgame animation order must be: tile match/dissolve animation,
  then game canvas fade-out, then win animation layer.
- Keep win-animation-heavy CSS in `styles.winfx.css`, imported separately from
  `styles.css`, to keep core UI styling maintainable and motion rules isolated.
