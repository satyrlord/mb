## Styling Architecture

The MEMORYBLOX game uses a **hybrid CSS architecture** combining utility-first frameworks with extensive custom design tokens and component-specific stylesheets.

### Core Stack

- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) — provides utility classes for layout and spacing
- **DaisyUI** (with `dui-` prefix) — supplies pre-built component primitives (tables, range sliders)
- **Custom CSS** (`styles.css`, `styles.winfx.css`) — dominates the visual identity with hand-crafted tokens, animations, and component styling

### Stylesheet Organization

Two primary stylesheets are loaded in `index.html`:

1. **`styles.css`** — Main UI stylesheet containing:
   - Global layout, theme tokens, component styling
   - Board/tile mechanics, menu systems, settings panels
   - Responsive breakpoints and reduced-motion overrides

2. **`styles.winfx.css`** — Animation-heavy win effects layer:
   - Particle systems, text glow animations, screen flashes
   - Plasma surface texture effects
   - HD mode overrides
   - Separated intentionally to keep core UI maintainable

## Design Token System

All visual properties flow through **CSS custom properties** defined on `:root` (~80+ tokens):

### Color Tokens
- Semantic naming: `--color-body-bg`, `--color-tile-front-bg`, `--color-menu-title`
- Gradients used extensively: `linear-gradient(180deg, #334155, #1f2937)`
- No light-mode support — dark-only theme (`color-scheme: dark`)

### Typography Tokens
- Font stacks: `--font-ui` (Ubuntu/Segoe UI), `--font-display` (Russo One), `--font-emoji` (system emoji fonts)
- Weight tokens: `--font-weight-ui-medium` (500), `--strong` (600), `--title` (700)
- Size tokens: `--font-size-compact` (0.78rem), `--font-size-control` (0.98rem)

### Shadow & Depth Tokens
- Physical text shadows: `--shadow-text-physical` for embossed effect
- Tile shadows: `--shadow-tile` with inset highlights and drop shadows
- Button shadows: `--shadow-topbar-btn` with active state variants

### Animation Timing Tokens
- Global speed multiplier: `--animation-speed` (default 1, range 1–3)
- Tile flip duration: `--tile-flip-duration-ms` (560ms)
- Plasma animation durations: drift (18s), hue cycle (10.8s), tile drift (90s)

## Component Styling Patterns

### Tiles (Core Game Mechanic)
- Use **container queries** (`container-type: size`) for responsive sizing
- Front glyph scales via `--tile-front-size-cqw` (62cqw)
- Back emoji scales via `clamp(1.2rem, var(--tile-back-size-cqw), 4.6rem)`
- 3D flip via `rotateY` transforms with `preserve-3d` and `perspective: 1800px`
- Block extrusion effect via layered `box-shadow` (not true 3D)

### Plasma Surface System
- Composable `.plasma-surface` class applied to any element needing animated texture
- Uses `textures/plasma.png` with multi-layer background blending
- Animated via `::before` (glow overlay) and `::after` (flare overlay) pseudo-elements
- Menu title uses specialized plasma text effect with `background-clip: text`
- Each tile receives `--tile-index` for staggered animation offsets

### HD Mode Toggle
- Controlled via `[data-hd-mode="off"]` attribute selector on app shell
- When off: disables plasma animations, falls back to solid colors
- Reduces particle count in win celebrations
- Persists device-aware default (on for desktop, off for mobile/tablet)

## Responsive Strategy

### Fixed Aspect Ratio Scaling
- App window maintains **16:10 aspect ratio** (`ui.fixedWindowAspectRatio=1.6`)
- Base dimensions: 1024×640px minimum
- Runtime scale: 0.72–2.0x, persisted in localStorage
- Scale applied at `.app-shell` level via `--ui-scale` variable
- Transform origin anchored top-left for consistent scaling

### Breakpoint Handling
- Single breakpoint at `max-width: 860px` for mobile adaptation:
  - Bars switch to column layout
  - Resize handle hidden
  - Reduced padding and gaps
  - Font sizes clamped smaller

### Viewport Clamping
- Max width capped at `--app-max-width-px` (979px default)
- 16px viewport padding enforced during resize
- `min-height: 100dvh` for dynamic viewport height support

## Motion & Accessibility

### Reduced Motion Support
- Respects `prefers-reduced-motion: reduce` media query
- Tile flips slowed but not eliminated (360ms vs 560ms)
- Win animations simplified: hover transforms disabled, shake/flash/chroma removed
- Match disappear duration reduced (350ms vs 500ms)

### Animation Speed Control
- User-adjustable via settings slider (1×–3×)
- Applied globally via `calc(duration / var(--animation-speed))` pattern
- Affects all timed animations consistently

## Configuration Integration

Runtime configuration (`config/ui.cfg`) drives CSS token values:
- Tile opacity: `ui.tileGlobalOpacity`, `ui.tileFrontOpacity`, `ui.tileBackOpacity`
- Board sizing: `board.minTileSizePx` (44px), `board.targetTileSizePx` (84px)
- Animation timing: `animation.tileFlipDurationMs`, plasma durations
- Window constraints: `window.baseMinWidthPx`, `window.maxScale`

TypeScript modules read these configs and apply them as inline styles or DOM attributes, keeping CSS declarative while enabling runtime tuning.

## Developer Conventions

1. **Never hardcode colors** — always reference CSS variables from `:root`
2. **Keep motion rules in `styles.winfx.css`** — isolate animation-heavy code
3. **Use `.plasma-surface` as containment host** — don't duplicate texture logic
4. **Respect the fixed aspect ratio** — don't break 16:10 scaling assumptions
5. **Test reduced-motion mode** — ensure usability without intensive animations
6. **Apply HD-off selectors consistently** — use `[data-hd-mode="off"]` pattern
7. **Container queries for tiles** — use `cqw` units for proportional sizing
8. **Physical shadow utility** — apply `.u-shadow-physical` for embossed text/SVG effects