# Graphics Improvement Proposals

Analysis of the MEMORYBLOX rendering architecture and tiered improvement
proposals. Report-only context document; treat current source and tests as
the authoritative implementation behavior.

## Latest Update (2026-07-02)

- Current State rewritten to describe the post-Proposal-1 implementation.
- Proposal 1 converted to a completion record, including where the
  implementation deliberately diverged from the original plan.
- Superseded PNG originals (`plasma.png` + nine `menu-*.png`, ~11MB) were
  removed from `textures/`; the deployed site now ships only the WebP assets.

## Current State (what actually renders)

The game is **DOM/CSS-rendered**. There is no `<canvas>` or WebGL anywhere —
every visual is an HTML element styled with CSS.

### Tile blocks: head-on box-shadow extrusion

Each tile (`src/board.ts`, `ensureButtonCount`) is a `<button>` containing four
`<span>` faces (`right`, `top`, `front`, `back`). The visible effect comes
from:

- A real CSS `perspective: 1800px` on `.board` (`styles.css`) plus
  `transform-style: preserve-3d` and a `rotateY` flip per tile — a genuine
  card-flip.
- Block depth drawn as a **layered box-shadow extrusion** on `.game-block`
  (`--tile-depth: 6px`): solid offset shadows form the right and bottom depth
  faces, a darker pair shades the far edge, and a soft offset shadow grounds
  the block. The `tile-right` / `tile-top` face spans remain `display: none`
  by design — see the Proposal 1 completion notes for why the side faces were
  not promoted to real 3D-positioned elements.
- A radial-gradient specular highlight on the front face simulates a
  top-left light source.

### Tile surfaces

Tiles sample a shared 40KB `textures/plasma.webp` at `background-size: 500%`
with `background-blend-mode: multiply`. The static base position in
`styles.css` (`20% 20%`) applies only when HD mode is off; with HD on, the
animated plasma layers in `styles.winfx.css` drive the surface, staggered
per tile via the `--tile-index` custom property (`animation-delay`).

### Icons

OpenMoji SVGs (`icon/openmoji/svg/`) plus Unicode emoji — crisp, scalable, and
the strongest part of the current visuals.

### Menu backgrounds

Nine WebP images in `textures/` (~47–105KB each, ~750KB total), referenced by
`src/menu-texture.ts`.

### Win FX

A particle system built entirely from DOM nodes (`src/win-fx.ts`), tuned by
`config/win-fx.cfg`: 30 firework bursts, a 50-piece center finale, and a
50-piece confetti rain, budgeted under `winFx.maxParticles=5000` with HD mode
on, or `winFx.maxParticlesLow=500` with HD off. Still the heaviest DOM churn
in the app, but the HD-off cap already protects low-end devices.

---

## Proposal 1 — CSS / asset polish (implemented)

Completed; kept here as a record of what changed and where the implementation
diverged from the original plan.

1. **Block thickness** — *implemented differently than proposed.* The plan
   was to un-hide the `tile-right` / `tile-top` spans and position them with
   `translateZ` / `rotateY`. The shipped implementation instead draws a
   head-on extrusion with a layered `box-shadow` stack on `.game-block`,
   because a true perspective tilt would skew the whole flat board and leave
   the side faces edge-on (see the comment above `.game-block` in
   `styles.css`). The unused face spans stay hidden.
2. **Per-tile plasma variation** — implemented via `--tile-index`, used as a
   staggered `animation-delay` on the animated plasma layers in
   `styles.winfx.css` (HD mode on), rather than as a static
   `background-position` offset.
3. **Asset slimming** — implemented. `plasma.png` (454KB) → `plasma.webp`
   (40KB); nine menu PNGs (~10.9MB) → WebP (~750KB). The superseded PNG
   originals have been deleted from `textures/`, so the Pages deploy
   (which copies `textures/` wholesale) ships only WebP.
4. **Lighting polish** — implemented: radial-gradient specular highlight on
   the front face plus a grounded contact shadow in the extrusion stack.

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
- Note: the perf motivation is weaker than when this was first written — HD
  mode already caps win-FX particles to 500 on low-end devices — so the case
  for Proposal 2 now rests mainly on visual gains (animated procedural
  surfaces, richer lighting).

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

Proposal 1 is done and delivered most of the perceived "3D block" improvement
for a fraction of the effort. Reach for Proposal 2 for animated surfaces and a
real render loop without a framework migration; reserve Proposal 3 for when
literal 3D geometry is the goal.
