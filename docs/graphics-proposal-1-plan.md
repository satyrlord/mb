# Proposal 1 — Implementation Plan (Lowest effort, biggest wins)

Scope: CSS + asset changes only. No game-logic changes. The DOM structure
(`src/board.ts` four-face contract) and the test suite stay intact. See
`docs/graphics-improvement-proposals.md` for the full analysis.

## Goals

1. Real block thickness using the already-built (but hidden) `tile-right` /
   `tile-top` faces instead of the 4px skewed pseudo-element hack.
2. Per-tile plasma variation so tiles stop looking identical.
3. Lighter assets (plasma + menu backgrounds).
4. Lighting polish (specular highlight + hover contact shadow).

## Constraints / invariants (do not break)

- **Do not change `src/board.ts`.** The four-face DOM order
  (`right`, `top`, `front`, `back`) is asserted by
  `tests/board.test.ts` ("render creates tile faces in the required
  right/top/front/back order"). All work here is CSS/asset only, so that test
  must keep passing untouched.
- **Keep the existing flip.** `.tile` already uses `perspective` (on `.board`),
  `transform-style: preserve-3d`, and a `rotateY` flip. The block faces must
  live in that same 3D space without disturbing the flip or the
  `backface-visibility: hidden` on front/back.
- **Preserve accessibility.** No change to `aria-*`, keyboard nav, or
  `prefers-reduced-motion` behavior.
- **Respect the plasma fallback.** `src/index.ts` probes `textures/plasma.png`
  and shows `#plasmaWarning` on failure. If the texture is replaced/renamed,
  update that probe; if kept as a converted format, leave it.

## Step-by-step

### Step 1 — Head-on block extrusion (`styles.css`) — DONE

Decision (confirmed with user): true perspective-3D does not read well for a
head-on memory grid — the right faces stay edge-on/invisible even at a 12° tilt,
and tilting the whole grid looks odd. Implemented a **head-on layered-extrusion**
instead (variant C from review screenshots):

- Added depth tokens on `.tile`: `--tile-depth: 6px`, `--tile-side-right`,
  `--tile-side-bottom`. Kept `--tile-camera-tilt: 0deg` (no grid skew).
- Rebuilt the `.game-block` box-shadow stack to draw a solid block: two solid
  offset shadows form the right + bottom depth faces, a darker pair shades the
  far edge, and a soft offset shadow grounds the block with a contact shadow.
- Removed the old `.game-block::before` / `::after` 4px skew hack.
- The built-but-unused `.tile-right` / `.tile-top` face spans stay
  `display: none` (the box-shadow provides depth and rotates cleanly with the
  flip — no z-fighting). `src/board.ts` and the face-order test are untouched.
- Verified visually (Playwright screenshots): solid raised blocks at rest, clean
  flip to revealed state, no clipping against the board edge.

### Step 2 — Per-tile plasma variation — ALREADY IMPLEMENTED (no change)

Investigation found this is already done in `styles.winfx.css` (the original
analysis only read `styles.css`, which holds the static `20% 20%` fallback, and
missed the winfx override):

- `.tile-front.plasma-surface` / `.tile-back.plasma-surface` already run the
  `plasma-tile-drift` animation, **staggered per tile** via
  `animation-delay: calc(var(--tile-index) * -1 * --plasma-tile-index-offset-delay-ms)`
  (`styles.winfx.css` ~line 627). So each tile already samples a different,
  slowly drifting region of the texture — confirmed via computed-style probe
  (tiles 0/1/2 read 20%/35%/50% background-position at the same instant).
- Glow (`::before`) and flares (`::after`) overlays are also already present.
- A `prefers-reduced-motion: reduce` block exists (`styles.winfx.css` ~line 556).

No work required for Step 2.

### Step 3 — Lighter assets — DONE

Converted all textures from PNG to WebP using sharp-cli (quality 82–85):

- **Plasma texture:** `textures/plasma.png` (444KB) → `textures/plasma.webp` (39KB) — 91% reduction.
  Updated references in `styles.css`, `styles.winfx.css`, and the probe URL in
  `src/index.ts` (`checkPlasmaTextureAvailability`). The fallback/warning path
  remains intact, just pointed at the new `.webp` file.
- **Menu backgrounds:** nine `textures/menu-*.png` files (~10.3MB total) →
  nine `textures/menu-*.webp` files (~770KB total) — 93% reduction.
  Updated `src/menu-texture.ts` (all `imagePath` values + added `.webp` to
  `SUPPORTED_MENU_TEXTURE_EXTENSIONS`). Test assertions updated.
- Old PNG files removed (WebP has universal modern-browser support).

### Step 4 — Lighting polish (`styles.css`) — DONE

- Added a soft `radial-gradient` specular highlight on `.game-block .tile-front`
  (top-left 22%/18% light source, layered as a background above the base color).
  On plasma-surface tiles the existing `styles.winfx.css` glow overlay naturally
  overrides this.
- Enhanced the hover state: `.game-block.tile:hover` now lifts 2px (up from 1px),
  slightly scales (1.008), and expands the contact shadow from 10px→16px blur
  with increased offset. A `box-shadow` transition (180ms ease) smooths entry.
- `prefers-reduced-motion: reduce` block resets both transform and shadow to
  their at-rest values with no transition.

## Verification

- `npm run test` — board/debug tests must pass unchanged (esp. the face-order
  test).
- `npm run typecheck` and `npm run lint` — only if any `.ts` is touched
  (Step 3a/3 asset-reference edits); pure CSS needs neither but run `validate`
  anyway.
- Manual / `npm run dev`:
  - Tiles show real beveled depth at rest.
  - Flip animation is smooth, no z-fighting, side faces rotate with the tile.
  - Tiles no longer look identical (plasma varies by index).
  - Menu backgrounds render for every icon pack.
  - `prefers-reduced-motion` still suppresses motion.
  - Debug menu "Tiles" and "Flip Tiles" views still look correct (they reuse
    `.tile` / `.game-block`).
- Check `#plasmaWarning` path: if the PNG was removed (Step 3a), confirm the
  warning logic was removed too; if converted (Step 3b), confirm the probe URL
  matches the new file.

## Suggested commit breakdown

1. `feat(tiles): render real 3D block faces, remove skew hack` (Step 1)
2. `feat(tiles): vary plasma surface per tile index` (Step 2)
3. `perf(assets): convert plasma + menu textures to WebP` (Step 3)
4. `style(tiles): add specular highlight and hover contact shadow` (Step 4)

## Risks / watch-outs

- Camera tilt (`--tile-camera-tilt`) feeds into multiple transform rules
  (rest, hover, revealed, matched) — change it in one place and re-check all
  four states.
- `backface-visibility: hidden` on side faces may need revisiting; the side
  faces should remain visible through the flip, unlike front/back.
- WebP/AVIF browser support is universal in modern targets, but confirm the
  project's supported-browser baseline before dropping PNG fallbacks.
