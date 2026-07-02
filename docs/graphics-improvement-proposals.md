# Graphics Improvement Proposals

Analysis of the MEMORYBLOX rendering architecture and tiered improvement
proposals. Report-only context document; treat current source and tests as
the authoritative implementation behavior.

## Latest Update (2026-07-02)

- Proposal 2 implemented: the game board is now drawn by a Canvas 2D
  renderer (`src/canvas-board-view.ts`) with real procedural plasma, while
  the DOM `<button>` grid remains as an invisible accessibility / hit-test
  layer. Proposal 2 below is now a completion record, including where the
  implementation deliberately diverged from the original plan.
- Current State rewritten to describe the post-Proposal-2 implementation.
- Earlier today: Proposal 1 converted to a completion record and superseded
  PNG originals (`plasma.png` + nine `menu-*.png`, ~11MB) removed from
  `textures/`; the deployed site ships only the WebP assets.

## Current State (what actually renders)

The **game board is Canvas 2D-rendered** (`CanvasBoardView` in
`src/canvas-board-view.ts`); menus, HUD, settings, and the win-FX particle
system remain DOM/CSS-rendered. There is no WebGL.

### Board: single-canvas renderer over an invisible DOM layer

`CanvasBoardView` extends `BoardView` (`src/board.ts`) and keeps its whole
DOM contract alive: the `<button>` grid still provides aria-labels,
`aria-pressed`, keyboard arrow navigation, the `:focus-visible` outline, and
click delegation — but the `board--canvas` CSS modifier suppresses every DOM
tile visual. Pixels are painted on a sibling `.board-canvas-layer` canvas
positioned over the board inside one `requestAnimationFrame` loop that:

- draws the head-on block extrusion (right/bottom depth faces, far-edge
  shading, soft contact shadow) — the canvas equivalent of the Proposal 1
  `box-shadow` stack — plus a radial specular highlight and a hover lift;
- animates the card flip (horizontal squash with easing) and the matched
  dissolve imperatively, reading `--tile-flip-duration-ms`,
  `--tile-match-disappear-duration-ms`, and `--animation-speed` so runtime
  config and the Settings speed slider still apply;
- skips all work while the game frame is `[hidden]` and clamps frame deltas
  so background tabs do not fast-forward animations.

If a 2D context is unavailable (jsdom, very old browsers), the class
degrades to the inherited DOM/CSS rendering — the pre-Proposal-2 visuals
remain intact in CSS as the working fallback.

### Tile surfaces: procedural plasma

Tile plasma is generated per frame: a seamless sine-field texture
(128×128 offscreen canvas) indexed through a 256-color cycling palette, with
each tile sampling a staggered, slowly drifting 64×64 window. With HD mode
off (`[data-hd-mode="off"]`) or `prefers-reduced-motion`, a single static
plasma frame is rendered instead. `textures/plasma.webp` is still used by
the DOM fallback styles and the menu title effect.

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

## Proposal 2 — Canvas 2D rendering engine (implemented)

Completed; kept here as a record of what changed and where the implementation
deliberately diverged from the original plan.

1. **`CanvasBoardView` with the `BoardView` interface** — implemented as a
   subclass of `BoardView` rather than a sibling implementing an extracted
   interface. Subclassing keeps the entire accessibility / hit-test layer
   (aria attributes, keyboard nav, click delegation, lazy back-face DOM
   rendering) inherited and byte-identical, and lets `index.ts` swap two
   constructor calls while `debug-controller.ts` and the rest of the
   controllers keep their `BoardView` typing unchanged.
2. **Invisible DOM layer** — implemented via the `board--canvas` container
   modifier in `styles.css`: tile backgrounds, borders, shadows, transforms,
   and face spans are suppressed; the `:focus-visible` outline is kept as the
   one visual the DOM layer still owns. The full DOM/CSS tile rendering stays
   in the stylesheet and remains the automatic fallback when no 2D context is
   available.
3. **Procedural plasma** — implemented as a seamless integer-frequency sine
   field rendered through a cycling 256-color palette into a 128×128
   offscreen canvas; tiles sample staggered, drifting 64×64 windows.
   Palette-cycle and drift tempos mirror `--plasma-hue-cycle-duration-ms`
   and `--plasma-tile-drift-duration-ms`. HD-off and reduced-motion render
   one static frame, preserving the HD-mode rules.
4. **Extruded blocks, lighting, animation loop** — implemented. The head-on
   extrusion look from Proposal 1 was redrawn on canvas (not converted to
   isometric — the same "flat board, head-on depth" rationale still holds),
   with the specular highlight, hover lift, matched green glow, flip, and
   dissolve all drawn imperatively; timing reads the existing CSS custom
   properties so `--animation-speed` config drives the loop as proposed.
5. **Win-FX on the same canvas — deliberately not done.** The DOM particle
   system in `win-fx.ts` stays: its perf motivation was already resolved by
   the HD-off particle cap, it renders over the whole app window (not just
   the board canvas), and migrating it would have rewritten the win-sequence
   controller contract for no visual gain. Possible follow-up if particle
   counts ever need to scale.

Tests live in `tests/canvas-board-view.test.ts` (fake 2D context, manually
stepped animation frames); the renderer degrades to DOM rendering under
jsdom, so all pre-existing board and integration tests run unchanged.

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

Proposals 1 and 2 are done: the board now has animated procedural surfaces
and a real render loop with no framework migration, on top of the Proposal 1
block styling (which survives as the no-canvas fallback). Reserve Proposal 3
for when literal 3D geometry becomes a core product goal; the remaining
Proposal 2 follow-up (win-FX particles on canvas) is optional and only worth
it if particle counts ever need to exceed what the DOM system sustains.
