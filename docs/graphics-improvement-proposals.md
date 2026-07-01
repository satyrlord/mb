# Graphics Improvement Proposals

Analysis of the MEMORYBLOX rendering architecture and three tiered
improvement proposals. Report-only context document; treat current source
and tests as the authoritative implementation behavior.

## Current State (what actually renders)

The game is **DOM/CSS-rendered**. There is no `<canvas>` or WebGL anywhere —
every visual is an HTML element styled with CSS.

### The "3D blocks" are a CSS illusion

Each tile (`src/board.ts`, `ensureButtonCount`) is a `<button>` containing four
`<span>` faces (`right`, `top`, `front`, `back`). The 3D effect comes from:

- A real CSS `perspective: 1800px` on `.board` (`styles.css`) plus
  `transform-style: preserve-3d` and a `rotateY` flip per tile — a genuine,
  decent card-flip.
- But the *block depth* is faked with two 4px `::before`/`::after`
  pseudo-elements skewed by 4° (`.game-block::before` / `::after`). The
  `tile-right` / `tile-top` face spans are actually **`display: none`** — so the
  code builds four faces per tile but only renders two. That is the "2D poor
  approximation": a flat tile with a thin skewed shadow strip masquerading as
  block thickness.

### Tile surfaces

A single shared ~444KB `textures/plasma.png` is scaled to
`background-size: 500%` with `background-blend-mode: multiply`. Every tile
samples the same static bitmap at the same `20% 20%` position, so all tiles look
identical and the "plasma" never animates on tiles (the drift CSS vars exist but
are not wired to the tile faces).

### Icons

OpenMoji SVGs (`icon/openmoji/svg/`) plus Unicode emoji — crisp, scalable, and
the strongest part of the current visuals.

### Menu backgrounds

Nine large PNGs (~1–1.5MB each, ~10MB total in `icon/`) — heavy payload.

### Win FX

A particle system built entirely from DOM nodes (`src/win-fx.ts`): 24 sparks +
6 cores per firework burst, each a positioned `<div>` animated via CSS
keyframes. This is the heaviest DOM churn in the app.

---

## Proposal 1 — Lowest effort, biggest wins (CSS / asset only) - Already implemented

No architectural change. Make the existing pseudo-3D and surfaces look
intentional rather than approximate.

1. **Render real block thickness.** The `tile-right` / `tile-top` faces already
   exist in the DOM but are hidden. Replace the 4px skewed-pseudo-element hack
   with actual `translateZ` / `rotateX` / `rotateY`-positioned side faces (the
   `preserve-3d` context is already there). True beveled blocks for ~30 lines of
   CSS and zero JS change — deleting dead code, not adding it.
2. **Fix the plasma so tiles differ.** Vary `background-position` per tile using
   the existing `--tile-index` custom property (already set in `board.ts` but
   unused by the texture). One `calc()` per face makes every tile sample a
   different region — instant visual variety for free.
3. **Shrink/replace heavy assets.** Replace the 444KB plasma PNG with a CSS
   gradient or a canvas-baked gradient, or at minimum convert to WebP/AVIF
   (~90% smaller). Same for the nine menu PNGs (~10MB → ~1MB).
4. **Add lighting polish.** A subtle `radial-gradient` specular highlight on the
   front face and a contact `drop-shadow` that scales on hover. Cheap, high
   perceived-quality gain.

**Why first:** highest visual ROI, touches only CSS + asset files, no risk to
game logic or tests.

---

## Proposal 2 — Medium effort: Canvas 2D rendering engine (same stack)

Keep TypeScript / Vite / no-3D-lib, but replace the **per-tile DOM tree** with a
single `<canvas>` 2D renderer driving the board.

- Introduce a `CanvasBoardView` implementing the same interface `BoardView`
  exposes (`render`, `animateMatchedPair`, etc.) so `index.ts` and the
  controllers do not change. The DOM `<button>` grid becomes a thin invisible
  accessibility / hit-test layer; pixels are drawn on canvas.
- Gains: real procedural plasma (animated per-frame noise instead of a static
  bitmap), proper isometric/extruded blocks drawn with gradients, lighting,
  particle effects on the same canvas (replacing the DOM-node firework system in
  `win-fx.ts`), and a real animation loop driven by the existing
  `--animation-speed` config.
- Cost: a rendering loop, hit-testing, and re-implementing the flip / match /
  dissolve animations imperatively. The existing `aria-label` / keyboard-nav
  contract in `board.ts` must be preserved via the hidden DOM layer
  (accessibility is currently good — do not regress it).

**Why:** the sweet spot — dramatically better visuals while staying in plain TS
with no new heavy dependency.

---

## Proposal 3 — High effort: Three.js / WebGL real 3D (tech-stack migration)

Render the board as **actual 3D geometry** with Three.js (or a thinner WebGL
layer like OGL if bundle size matters).

- Each tile becomes a real extruded rounded box with PBR materials, the icon
  applied as a texture on the front face, the flip as a quaternion rotation,
  dynamic lighting/shadows, and the camera tilt (`--tile-camera-tilt`, already a
  concept in CSS) becoming a real perspective camera.
- Win FX becomes a GPU particle system (instanced points) instead of DOM
  nodes — orders of magnitude more particles at higher framerate.
- Cost / risks: ~150KB+ added to the bundle; full view-layer rewrite; OpenMoji
  SVG icons must be rasterized to textures (currently a strength — avoid making
  them blurry); accessibility (keyboard nav, screen-reader labels, the whole
  `board.ts` a11y contract) must be rebuilt on an invisible DOM overlay since
  WebGL has no accessibility tree; and the existing DOM-tile-face tests need
  substantial rewriting.

**Why / when:** only worth it if literal 3D blocks are a core product goal. The
highest visual ceiling, but by far the most disruptive.

---

## Recommendation

Proposal 1 delivers most of the perceived "3D block" improvement for a fraction
of the effort (partly just by un-hiding code that already exists). Reach for
Proposal 2 for animated surfaces and a real render loop without a framework
migration; reserve Proposal 3 for when literal 3D geometry is the goal.
