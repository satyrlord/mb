import {
  BoardView,
  type BoardTileStatus,
  type BoardTileViewModel,
} from "./board";
import { getFlagEmojiSvgUrl } from "./flag-emoji";
import { getIconAssetByToken } from "./icon-assets";

/**
 * Canvas 2D board renderer (Graphics Proposal 2).
 *
 * Extends {@link BoardView} so the DOM `<button>` grid keeps providing the
 * full accessibility and hit-test contract (aria-labels, keyboard nav,
 * focus-visible outline, click delegation) while all tile pixels are painted
 * on a single sibling `<canvas>` layer:
 *
 * - Procedural plasma is generated per frame from a seamless sine field and
 *   a cycling palette instead of sampling the static `plasma.webp` bitmap.
 * - The head-on block extrusion, specular highlight, flip, matched-glow, and
 *   dissolve animations are drawn imperatively inside one rAF loop.
 * - Animation timing mirrors the CSS custom properties driven by runtime
 *   config (`--tile-flip-duration-ms`, `--tile-match-disappear-duration-ms`,
 *   `--animation-speed`), so the Settings animation-speed slider applies.
 * - HD mode off (`[data-hd-mode="off"]`) and `prefers-reduced-motion` fall
 *   back to static surfaces, matching the CSS behavior they replace.
 *
 * When a 2D context is unavailable (e.g. jsdom, ancient browsers) the class
 * degrades to the inherited DOM/CSS rendering: no canvas is attached and the
 * `board--canvas` visual-suppression class is never added.
 */

type TileSelectHandler = (index: number) => void;

/** Tile geometry in canvas CSS pixels, relative to the board container. */
interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Per-tile animation and drawing state mirrored from the view models. */
interface CanvasTileState {
  icon: string;
  status: BoardTileStatus;
  /** Flip progress: 0 = front (hidden face) … 1 = back (icon face). */
  flip: number;
  /** Flip progress the tile is animating toward. */
  flipTarget: number;
  /** Dissolve progress: 0 = fully visible … 1 = removed from the canvas. */
  dissolve: number;
  /** Timestamp at which the matched-pair dissolve starts, or null. */
  dissolveStartTime: number | null;
  rect: TileRect;
}

/** Animation timing values sourced from the runtime-config CSS variables. */
interface CanvasBoardTimings {
  flipDurationMs: number;
  matchDisappearDurationMs: number;
  animationSpeed: number;
  tileBackOpacity: number;
}

/** Head-on extrusion depth; mirrors `--tile-depth` in `styles.css`. */
const TILE_DEPTH_PX = 6;

/** Hover lift offset; mirrors the DOM `:hover` `translateY(-2px)`. */
const HOVER_LIFT_PX = 2;

/** Square procedural plasma texture edge length in pixels. */
const PLASMA_TEXTURE_SIZE = 128;

/** Edge length of the per-tile sample window into the plasma texture. */
const PLASMA_SAMPLE_SIZE = 64;

/** Fallbacks mirroring the CSS custom property defaults in `styles.css`. */
const DEFAULT_FLIP_DURATION_MS = 560;
const DEFAULT_MATCH_DISAPPEAR_DURATION_MS = 500;
const DEFAULT_MATCH_DISAPPEAR_REDUCED_DURATION_MS = 350;
const DEFAULT_ANIMATION_SPEED = 1;
const DEFAULT_TILE_BACK_OPACITY = 0.5;

/** Palette cycle period; mirrors `--plasma-hue-cycle-duration-ms`. */
const PLASMA_HUE_CYCLE_DURATION_MS = 10800;

/** Per-tile sample drift period; mirrors `--plasma-tile-drift-duration-ms`. */
const PLASMA_TILE_DRIFT_DURATION_MS = 90000;

/** Upper bound for a frame delta so background tabs do not fast-forward. */
const MAX_FRAME_DELTA_MS = 100;

/*
 * Canvas 2D has no access to CSS variables, so the colors below mirror the
 * theme tokens in `styles.css` (token names noted inline). Update both
 * places together when the palette changes.
 */
const COLOR_TILE_SIDE_RIGHT = "#253243"; // --color-tile-side-left
const COLOR_TILE_SIDE_BOTTOM = "#1a2432"; // --color-tile-side-bottom
const COLOR_TILE_EDGE_OUTLINE = "rgba(226, 232, 240, 0.22)"; // --color-tile-edge-outline
const COLOR_FRONT_GRADIENT_TOP = "#334155"; // --color-tile-front-bg start
const COLOR_FRONT_GRADIENT_BOTTOM = "#1f2937"; // --color-tile-front-bg end
const COLOR_BACK_GRADIENT_TOP = "#f3f4f6"; // --color-tile-back-bg start
const COLOR_BACK_GRADIENT_BOTTOM = "#d1d5db"; // --color-tile-back-bg end
const COLOR_BLOCKED_GRADIENT_TOP = "#1e293b"; // .tile.blocked .tile-front start
const COLOR_BLOCKED_GRADIENT_BOTTOM = "#0f172a"; // .tile.blocked .tile-front end
const COLOR_FRONT_GLYPH = "rgba(229, 231, 235, 0.9)"; // --color-tile-front-text at 90%
const COLOR_BLOCKED_GLYPH = "rgba(148, 163, 184, 0.75)"; // .tile.blocked .tile-front color
const COLOR_BACK_TEXT = "#111827"; // --color-tile-back-text
const COLOR_MATCHED_GLOW = "rgba(74, 222, 128, 0.86)"; // matched .tile-back glow

/** Font stack mirroring `--font-display` for the front `?` glyph. */
const FONT_DISPLAY = '"Russo One", "Segoe UI", "Arial Black", sans-serif';

/** Font stack mirroring `--font-emoji` for text-emoji back faces. */
const FONT_EMOJI =
  '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Symbol", sans-serif';

const clamp01 = (value: number): number => {
  return Math.min(1, Math.max(0, value));
};

/** Approximation of the CSS flip easing `cubic-bezier(0.2, 0.7, 0.25, 1)`. */
const easeOutCubic = (t: number): number => {
  const inverted = 1 - clamp01(t);

  return 1 - inverted * inverted * inverted;
};

/**
 * Parses a positive CSS numeric custom property — a bare number or a
 * millisecond duration such as `"560ms"` — falling back when unparsable
 * or non-positive.
 */
export const parseCssPositiveNumber = (raw: string, fallback: number): number => {
  const value = Number.parseFloat(raw.trim());

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

/**
 * Reads a CSS custom property from the document root. Inline styles are
 * checked first because runtime config writes them there (`index.ts`),
 * which also makes the values visible in jsdom where computed custom
 * properties are unsupported.
 */
const readRootCssVar = (name: string): string => {
  const inlineValue = document.documentElement.style.getPropertyValue(name);

  if (inlineValue !== "") {
    return inlineValue;
  }

  return window.getComputedStyle(document.documentElement).getPropertyValue(name);
};

/**
 * Builds a seamless plasma height field: a sum of integer-frequency sine
 * waves over the texture, so sampling wraps without visible seams. Values
 * are pre-scaled to the 0..255 palette index range.
 */
export const buildPlasmaField = (size: number): Float32Array => {
  const field = new Float32Array(size * size);
  const tau = Math.PI * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size;
      const ny = y / size;
      const wave =
        Math.sin(tau * (nx * 2 + ny)) +
        Math.sin(tau * (nx - ny * 3) * 0.5) +
        Math.sin(tau * (nx * 3 + ny * 2) * 0.35) +
        Math.sin(tau * Math.sin(tau * nx) * 0.25 + tau * ny);

      // wave ranges roughly -4..4; normalize to 0..255.
      field[y * size + x] = ((wave + 4) / 8) * 255;
    }
  }

  return field;
};

/**
 * Builds a 256-entry RGB palette of phase-shifted sinusoids, producing the
 * vivid magenta/blue/green sweep of the classic plasma effect.
 */
export const buildPlasmaPalette = (): Uint8ClampedArray => {
  const palette = new Uint8ClampedArray(256 * 3);
  const tau = Math.PI * 2;

  for (let index = 0; index < 256; index += 1) {
    const phase = (index / 256) * tau;

    palette[index * 3] = Math.round(128 + 127 * Math.sin(phase));
    palette[index * 3 + 1] = Math.round(128 + 127 * Math.sin(phase + tau / 3));
    palette[index * 3 + 2] = Math.round(128 + 127 * Math.sin(phase + (tau * 2) / 3));
  }

  return palette;
};

export class CanvasBoardView extends BoardView {
  private readonly boardContainer: HTMLElement;

  private readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D | null = null;

  private readonly plasmaCanvas: HTMLCanvasElement;

  private readonly plasmaCtx: CanvasRenderingContext2D | null = null;

  private readonly plasmaField: Float32Array;

  private readonly plasmaPalette: Uint8ClampedArray;

  private plasmaImage: ImageData | null = null;

  /** True once a static plasma frame has been rendered for motionless modes. */
  private plasmaStaticRendered = false;

  private tileStates: CanvasTileState[] = [];

  private hoveredTileIndex: number | null = null;

  private animationFrameId: number | null = null;

  private lastFrameTime: number | null = null;

  private rectsDirty = true;

  /** Re-entrancy guard for synchronous `requestAnimationFrame` test stubs. */
  private inFrame = false;

  private cssWidth = 0;

  private cssHeight = 0;

  private resizeObserver: ResizeObserver | null = null;

  private readonly iconImageCache = new Map<string, HTMLImageElement>();

  private timings: CanvasBoardTimings = {
    flipDurationMs: DEFAULT_FLIP_DURATION_MS,
    matchDisappearDurationMs: DEFAULT_MATCH_DISAPPEAR_DURATION_MS,
    animationSpeed: DEFAULT_ANIMATION_SPEED,
    tileBackOpacity: DEFAULT_TILE_BACK_OPACITY,
  };

  public constructor(container: HTMLElement, onTileSelect: TileSelectHandler) {
    super(container, onTileSelect);

    this.boardContainer = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "board-canvas-layer";
    this.canvas.setAttribute("aria-hidden", "true");
    this.plasmaCanvas = document.createElement("canvas");
    this.plasmaCanvas.width = PLASMA_TEXTURE_SIZE;
    this.plasmaCanvas.height = PLASMA_TEXTURE_SIZE;
    this.plasmaField = buildPlasmaField(PLASMA_TEXTURE_SIZE);
    this.plasmaPalette = buildPlasmaPalette();

    const ctx = this.canvas.getContext("2d");
    const parent = container.parentElement;

    if (ctx === null || parent === null) {
      // No 2D context (or detached container): keep the inherited DOM/CSS
      // rendering as the visible fallback and never start the canvas loop.
      return;
    }

    this.ctx = ctx;
    this.plasmaCtx = this.plasmaCanvas.getContext("2d");
    container.classList.add("board--canvas");
    container.insertAdjacentElement("beforebegin", this.canvas);
    container.addEventListener("pointermove", this.handlePointerMove);
    container.addEventListener("pointerleave", this.handlePointerLeave);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.rectsDirty = true;
      });
      this.resizeObserver.observe(container);
    }

    this.animationFrameId = window.requestAnimationFrame(this.handleFrame);
  }

  public override render(tiles: readonly BoardTileViewModel[], columns: number): void {
    super.render(tiles, columns);

    if (this.ctx === null) {
      return;
    }

    this.refreshTimings();
    this.tileStates.length = Math.min(this.tileStates.length, tiles.length);

    for (const [index, tile] of tiles.entries()) {
      const flipTarget = tile.status === "revealed" || tile.status === "matched" ? 1 : 0;
      const existing = this.tileStates[index];

      if (existing === undefined) {
        // New tiles start at their target so an initial render (or a
        // debug-win board seeded with matched pairs) does not replay flips.
        this.tileStates[index] = {
          icon: tile.icon,
          status: tile.status,
          flip: flipTarget,
          flipTarget,
          dissolve: 0,
          dissolveStartTime: null,
          rect: { x: 0, y: 0, width: 0, height: 0 },
        };
        continue;
      }

      existing.icon = tile.icon;
      existing.status = tile.status;
      existing.flipTarget = flipTarget;

      if (tile.status !== "matched") {
        existing.dissolve = 0;
        existing.dissolveStartTime = null;
      }
    }

    this.rectsDirty = true;
  }

  public override animateMatchedPair(
    firstIndex: number,
    secondIndex: number,
    pauseMs: number,
  ): void {
    super.animateMatchedPair(firstIndex, secondIndex, pauseMs);

    const startTime = performance.now() + pauseMs;

    for (const index of [firstIndex, secondIndex]) {
      const state = this.tileStates[index];

      if (state !== undefined) {
        state.dissolveStartTime = startTime;
      }
    }
  }

  /**
   * Stops the render loop and removes the canvas layer, restoring the
   * inherited DOM/CSS rendering. Safe to call when canvas mode never
   * activated.
   */
  public destroy(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.boardContainer.removeEventListener("pointermove", this.handlePointerMove);
    this.boardContainer.removeEventListener("pointerleave", this.handlePointerLeave);
    this.boardContainer.classList.remove("board--canvas");
    this.canvas.remove();
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("button[data-index]");
    const rawIndex = button?.dataset.index;
    const index = rawIndex === undefined ? Number.NaN : Number.parseInt(rawIndex, 10);

    this.hoveredTileIndex = Number.isNaN(index) ? null : index;
  };

  private readonly handlePointerLeave = (): void => {
    this.hoveredTileIndex = null;
  };

  private readonly handleFrame = (now: number): void => {
    if (this.inFrame) {
      return;
    }

    this.inFrame = true;

    try {
      this.animationFrameId = window.requestAnimationFrame(this.handleFrame);

      const deltaMs =
        this.lastFrameTime === null ? 0 : Math.min(now - this.lastFrameTime, MAX_FRAME_DELTA_MS);

      this.lastFrameTime = now;

      // Skip all work while an ancestor frame is hidden (menu, settings, …).
      if (this.boardContainer.closest("[hidden]") !== null) {
        return;
      }

      if (this.rectsDirty) {
        this.syncCanvasGeometry();
      }

      if (this.cssWidth <= 0 || this.cssHeight <= 0) {
        return;
      }

      this.updateAnimations(now, deltaMs);
      this.drawFrame(now);
    } finally {
      this.inFrame = false;
    }
  };

  private refreshTimings(): void {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const disappearVar = reducedMotion
      ? "--tile-match-disappear-reduced-duration-ms"
      : "--tile-match-disappear-duration-ms";
    const disappearFallback = reducedMotion
      ? DEFAULT_MATCH_DISAPPEAR_REDUCED_DURATION_MS
      : DEFAULT_MATCH_DISAPPEAR_DURATION_MS;

    this.timings = {
      flipDurationMs: parseCssPositiveNumber(
        readRootCssVar("--tile-flip-duration-ms"),
        DEFAULT_FLIP_DURATION_MS,
      ),
      matchDisappearDurationMs: parseCssPositiveNumber(
        readRootCssVar(disappearVar),
        disappearFallback,
      ),
      animationSpeed: parseCssPositiveNumber(
        readRootCssVar("--animation-speed"),
        DEFAULT_ANIMATION_SPEED,
      ),
      tileBackOpacity: parseCssPositiveNumber(
        readRootCssVar("--tile-back-opacity"),
        DEFAULT_TILE_BACK_OPACITY,
      ),
    };
  }

  /** True when plasma and other continuous motion should animate. */
  private isMotionEnabled(): boolean {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }

    const hdHost = this.boardContainer.closest("[data-hd-mode]");

    return hdHost === null || hdHost.getAttribute("data-hd-mode") !== "off";
  }

  /**
   * Resizes the canvas backing store to the board container's border box
   * (device-pixel-ratio aware) and re-measures the tile button rects.
   * Bounding rects are normalized by the container's current on-screen
   * scale so the shell-level `--ui-scale` transform does not skew geometry.
   */
  private syncCanvasGeometry(): void {
    const container = this.boardContainer;
    const ctx = this.ctx;

    if (ctx === null) {
      return;
    }

    this.cssWidth = container.offsetWidth;
    this.cssHeight = container.offsetHeight;
    this.canvas.style.left = `${container.offsetLeft}px`;
    this.canvas.style.top = `${container.offsetTop}px`;
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;

    const devicePixelRatio = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;

    this.canvas.width = Math.round(this.cssWidth * devicePixelRatio);
    this.canvas.height = Math.round(this.cssHeight * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const containerRect = container.getBoundingClientRect();
    const scale =
      containerRect.width > 0 && this.cssWidth > 0 ? containerRect.width / this.cssWidth : 1;
    const buttons = container.querySelectorAll<HTMLButtonElement>("button[data-index]");

    for (const button of buttons) {
      const index = Number.parseInt(button.dataset.index ?? "", 10);
      const state = Number.isNaN(index) ? undefined : this.tileStates[index];

      if (state === undefined) {
        continue;
      }

      const buttonRect = button.getBoundingClientRect();

      state.rect = {
        x: (buttonRect.left - containerRect.left) / scale,
        y: (buttonRect.top - containerRect.top) / scale,
        width: buttonRect.width / scale,
        height: buttonRect.height / scale,
      };
    }

    this.rectsDirty = false;
  }

  private updateAnimations(now: number, deltaMs: number): void {
    const flipStep = deltaMs / this.timings.flipDurationMs;
    const dissolveStep =
      (deltaMs * this.timings.animationSpeed) / this.timings.matchDisappearDurationMs;

    for (const state of this.tileStates) {
      if (state.flip < state.flipTarget) {
        state.flip = Math.min(state.flipTarget, state.flip + flipStep);
      } else if (state.flip > state.flipTarget) {
        state.flip = Math.max(state.flipTarget, state.flip - flipStep);
      }

      if (state.dissolveStartTime !== null && now >= state.dissolveStartTime) {
        state.dissolve = clamp01(state.dissolve + dissolveStep);
      }
    }
  }

  private drawFrame(now: number): void {
    const ctx = this.ctx;

    if (ctx === null) {
      return;
    }

    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const motionEnabled = this.isMotionEnabled();

    if (motionEnabled) {
      this.renderPlasmaTexture(
        ((now % PLASMA_HUE_CYCLE_DURATION_MS) / PLASMA_HUE_CYCLE_DURATION_MS) * 256,
      );
    } else if (!this.plasmaStaticRendered) {
      this.renderPlasmaTexture(0);
      this.plasmaStaticRendered = true;
    }

    const drift =
      ((now % PLASMA_TILE_DRIFT_DURATION_MS) / PLASMA_TILE_DRIFT_DURATION_MS) *
      PLASMA_SAMPLE_SIZE;

    for (const [index, state] of this.tileStates.entries()) {
      this.drawTile(ctx, state, index, motionEnabled ? drift : 0);
    }
  }

  /** Writes one plasma frame into the offscreen texture canvas. */
  private renderPlasmaTexture(paletteShift: number): void {
    const plasmaCtx = this.plasmaCtx;

    if (plasmaCtx === null) {
      return;
    }

    if (this.plasmaImage === null) {
      this.plasmaImage = plasmaCtx.createImageData(PLASMA_TEXTURE_SIZE, PLASMA_TEXTURE_SIZE);
    }

    const data = this.plasmaImage.data;
    const field = this.plasmaField;
    const palette = this.plasmaPalette;
    const shift = paletteShift | 0;

    for (let index = 0; index < field.length; index += 1) {
      const paletteIndex = ((field[index] | 0) + shift) & 255;
      const offset = index * 4;

      data[offset] = palette[paletteIndex * 3];
      data[offset + 1] = palette[paletteIndex * 3 + 1];
      data[offset + 2] = palette[paletteIndex * 3 + 2];
      data[offset + 3] = 255;
    }

    plasmaCtx.putImageData(this.plasmaImage, 0, 0);
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    state: CanvasTileState,
    index: number,
    drift: number,
  ): void {
    const { rect } = state;

    if (state.dissolve >= 1 || rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const flipEased = easeOutCubic(state.flip);
    const showBack = flipEased > 0.5;
    const faceScaleX = Math.abs(Math.cos(flipEased * Math.PI));

    if (faceScaleX <= 0.001) {
      return;
    }

    const isHoverLifted =
      this.hoveredTileIndex === index && state.status === "hidden" && state.flipTarget === 0;

    ctx.save();
    ctx.globalAlpha = 1 - easeOutCubic(state.dissolve);
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);

    if (isHoverLifted) {
      ctx.translate(0, -HOVER_LIFT_PX);
    }

    ctx.scale(faceScaleX, 1);

    const w = rect.width;
    const h = rect.height;

    this.drawExtrusion(ctx, w, h, isHoverLifted);

    if (showBack) {
      this.drawBackFace(ctx, state, index, w, h, drift);
    } else {
      this.drawFrontFace(ctx, state, index, w, h, drift);
    }

    // Edge outline and bevel, mirroring the .game-block inset highlights.
    ctx.strokeStyle = COLOR_TILE_EDGE_OUTLINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1, h / 2 - 1);
    ctx.lineTo(-w / 2 + 1, -h / 2 + 1);
    ctx.lineTo(w / 2 - 1, -h / 2 + 1);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Head-on block extrusion: right/bottom depth faces, darker far-edge
   * shading, and a soft grounded contact shadow — the canvas equivalent of
   * the layered `box-shadow` stack on `.game-block`.
   */
  private drawExtrusion(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    isHoverLifted: boolean,
  ): void {
    const depth = TILE_DEPTH_PX;
    const edge = depth + 2;

    // Grounded contact shadow (expands slightly while hover-lifted).
    ctx.save();
    ctx.shadowColor = isHoverLifted ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = isHoverLifted ? 16 : 10;
    ctx.shadowOffsetX = isHoverLifted ? edge + 2 : edge;
    ctx.shadowOffsetY = isHoverLifted ? edge + 2 : edge;
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(-w / 2 + edge, -h / 2, w, h);
    ctx.restore();

    // Far-edge shading behind the depth faces.
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(-w / 2, -h / 2 + edge, w, h);

    // Right and bottom depth faces.
    ctx.fillStyle = COLOR_TILE_SIDE_RIGHT;
    ctx.fillRect(-w / 2 + depth, -h / 2, w, h);
    ctx.fillStyle = COLOR_TILE_SIDE_BOTTOM;
    ctx.fillRect(-w / 2, -h / 2 + depth, w, h);
  }

  private drawFrontFace(
    ctx: CanvasRenderingContext2D,
    state: CanvasTileState,
    index: number,
    w: number,
    h: number,
    drift: number,
  ): void {
    const isBlocked = state.status === "blocked";
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);

    gradient.addColorStop(0, isBlocked ? COLOR_BLOCKED_GRADIENT_TOP : COLOR_FRONT_GRADIENT_TOP);
    gradient.addColorStop(
      1,
      isBlocked ? COLOR_BLOCKED_GRADIENT_BOTTOM : COLOR_FRONT_GRADIENT_BOTTOM,
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    if (!isBlocked) {
      // Plasma multiplied to ~50% brightness, mirroring the DOM front face
      // (`background-color: #808080` + `background-blend-mode: multiply`).
      this.drawPlasmaSample(ctx, index, w, h, drift, 1);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    // Specular highlight from the top-left light source.
    const specular = ctx.createRadialGradient(
      -w * 0.28,
      -h * 0.32,
      0,
      -w * 0.28,
      -h * 0.32,
      w * 0.8,
    );

    specular.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    specular.addColorStop(0.4, "rgba(255, 255, 255, 0.06)");
    specular.addColorStop(0.72, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = specular;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Front glyph with the dark outline treatment required by the style
    // guide (plasma swirls include near-white regions).
    ctx.save();
    ctx.font = `700 ${Math.round(w * 0.62)}px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = isBlocked ? COLOR_BLOCKED_GLYPH : COLOR_FRONT_GLYPH;
    ctx.fillText(isBlocked ? "•" : "?", 0, 0);
    ctx.restore();
  }

  private drawBackFace(
    ctx: CanvasRenderingContext2D,
    state: CanvasTileState,
    index: number,
    w: number,
    h: number,
    drift: number,
  ): void {
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);

    gradient.addColorStop(0, COLOR_BACK_GRADIENT_TOP);
    gradient.addColorStop(1, COLOR_BACK_GRADIENT_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Plasma over the light base at the configured back-face visibility,
    // mirroring the white-overlay blend on `.tile-back.plasma-surface`.
    this.drawPlasmaSample(ctx, index, w, h, drift, this.timings.tileBackOpacity);

    ctx.save();

    if (state.status === "matched") {
      ctx.shadowColor = COLOR_MATCHED_GLOW;
      ctx.shadowBlur = 14;
    }

    const iconImage = this.getIconImage(state.icon);

    if (iconImage === null) {
      const fontSize = Math.min(73.6, Math.max(19.2, w * 0.72));

      ctx.font = `${Math.round(fontSize)}px ${FONT_EMOJI}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLOR_BACK_TEXT;
      ctx.fillText(state.icon, 0, 0);
    } else if (iconImage.complete && iconImage.naturalWidth > 0) {
      // 74% contain-fit, mirroring `.tile-back .tile-asset-icon`.
      const iconSize = Math.min(w, h) * 0.74;

      ctx.drawImage(iconImage, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
    }

    ctx.restore();
  }

  /** Draws this tile's window into the shared plasma texture, if available. */
  private drawPlasmaSample(
    ctx: CanvasRenderingContext2D,
    index: number,
    w: number,
    h: number,
    drift: number,
    alpha: number,
  ): void {
    if (this.plasmaCtx === null) {
      return;
    }

    // Stagger tiles through the texture so neighbors do not repeat, then
    // drift the window slowly for the per-tile motion HD mode provides.
    const maxOffset = PLASMA_TEXTURE_SIZE - PLASMA_SAMPLE_SIZE;
    const sourceX = ((index * 17) + drift) % maxOffset;
    const sourceY = (index * 29) % maxOffset;

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * alpha;
    ctx.drawImage(
      this.plasmaCanvas,
      sourceX,
      sourceY,
      PLASMA_SAMPLE_SIZE,
      PLASMA_SAMPLE_SIZE,
      -w / 2,
      -h / 2,
      w,
      h,
    );
    ctx.restore();
  }

  /**
   * Resolves an icon token to a drawable image (OpenMoji asset or flag SVG),
   * or null when the icon is a plain text emoji. Images are cached and drawn
   * on the first frame after they finish loading.
   */
  private getIconImage(icon: string): HTMLImageElement | null {
    const cached = this.iconImageCache.get(icon);

    if (cached !== undefined) {
      return cached;
    }

    const iconAsset = getIconAssetByToken(icon);
    const src = iconAsset !== null ? iconAsset.src : getFlagEmojiSvgUrl(icon);

    if (src === null) {
      return null;
    }

    const image = new Image();

    image.decoding = "async";
    image.src = src;
    this.iconImageCache.set(icon, image);

    return image;
  }
}
