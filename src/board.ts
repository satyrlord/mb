import { getFlagEmojiCountryName, getFlagEmojiSvgUrl } from "./flag-emoji.js";

type TileSelectHandler = (index: number) => void;

export type BoardTileStatus = "hidden" | "revealed" | "matched" | "blocked";

export interface BoardTileViewModel {
  icon: string;
  status: BoardTileStatus;
}

export interface BoardLayoutConfig {
  minTileSizePx: number;
  targetTileSizePx: number;
  tileGapPx: number;
  boardHorizontalPaddingPx: number;
}

export const DEFAULT_BOARD_LAYOUT_CONFIG: BoardLayoutConfig = {
  minTileSizePx: 44,
  targetTileSizePx: 84,
  tileGapPx: 10,
  boardHorizontalPaddingPx: 16,
};

/**
 * DOM child-order contract for the four 3D block tile faces.
 * CSS `nth-child` selectors and automated tests reference these positional
 * indices (0-based). Do not reorder without updating the CSS and test suite.
 */
export const TILE_FACE_ORDER = ["right", "top", "front", "back"] as const;

/** Base CSS class applied to every tile face element. */
const TILE_FACE_BASE_CLASS = "tile-face";

/**
 * Additional CSS classes applied to the front and back faces that carry the
 * plasma-surface visual treatment and physical drop-shadow utility.
 */
const TILE_FACE_PLASMA_CLASSES = "plasma-surface u-shadow-physical";

/** Full class string for the right face (depth-illusion side panel). */
const TILE_FACE_RIGHT_CLASS = `${TILE_FACE_BASE_CLASS} tile-right`;

/** Full class string for the top face (depth-illusion top panel). */
const TILE_FACE_TOP_CLASS = `${TILE_FACE_BASE_CLASS} tile-top`;

/** Full class string for the front (question-mark) face with plasma treatment. */
const TILE_FACE_FRONT_CLASS = `${TILE_FACE_BASE_CLASS} tile-front ${TILE_FACE_PLASMA_CLASSES}`;

/** Full class string for the back (emoji) face with plasma treatment. */
const TILE_FACE_BACK_CLASS = `${TILE_FACE_BASE_CLASS} tile-back ${TILE_FACE_PLASMA_CLASSES}`;

/**
 * Renders a tile's back-face icon as either plain text emoji or flag image.
 *
 * @param element - The tile element to render the icon into.
 * @param icon - The emoji or flag emoji string to render.
 * @param accessibleFlagLabel - Accessible label for flag images, or `null` for non-flag icons.
 *
 * @remarks
 * Flag images receive an `alt` attribute and `aria-hidden="false"`, but both
 * are inert from an accessibility-tree perspective: tile face elements are
 * created with `aria-hidden="true"` (see {@link BoardView.createTileFace}),
 * and a parent element with `aria-hidden="true"` hides all descendants
 * regardless of their own `aria-hidden` value. Accessibility for flag-emoji
 * tiles is provided by the tile button's `aria-label`, not by the image itself.
 */
const renderTileBackIcon = (
  element: HTMLElement,
  icon: string,
  accessibleFlagLabel: string | null,
): void => {
  const flagUrl = getFlagEmojiSvgUrl(icon);

  if (flagUrl === null) {
    element.textContent = icon;

    return;
  }

  const image = document.createElement("img");
  image.className = "flag-emoji";
  image.draggable = false;
  image.decoding = "async";
  image.src = flagUrl;

  if (accessibleFlagLabel === null) {
    // Fallback: derive a readable label for flag emoji so screen readers have
    // something meaningful if the image fails to load.
    const countryName = getFlagEmojiCountryName(icon);
    image.alt = countryName !== null ? `${countryName} flag` : "flag";
  } else {
    image.alt = accessibleFlagLabel;
  }

  image.setAttribute("aria-hidden", "false");
  element.replaceChildren(image);
};

export class BoardView {
  private static calculateBoardWidth(columns: number, layoutConfig: BoardLayoutConfig): number {
    return (columns * layoutConfig.targetTileSizePx)
      + ((columns - 1) * layoutConfig.tileGapPx)
      + (layoutConfig.boardHorizontalPaddingPx * 2);
  }

  private readonly container: HTMLElement;

  private readonly onTileSelect: TileSelectHandler;

  private columns = 8;

  private tileCount = 0;

  private buttons: HTMLButtonElement[] = [];

  private boardLayout: BoardLayoutConfig = { ...DEFAULT_BOARD_LAYOUT_CONFIG };

  private matchAnimationTimers = new Map<number, number>();

  // Tracks back-face elements that have already had their icon rendered so
  // the lazy-render check in render() does not re-render on every call.
  // Reset via resetBackFaceCache() whenever a new game starts (before render)
  // so reused DOM elements do not retain icons from a previous game's pack.
  // Also reset on each board rebuild in ensureButtonCount.
  private renderedBackFaces = new WeakSet<HTMLElement>();

  // Caches the childElementCount at which all container children were last
  // confirmed to be <button> elements. needsRebuild() skips the element-type
  // loop when the current count matches this value, avoiding a full scan on
  // every render call in the common case where the board DOM is unmodified.
  private lastValidatedChildElementCount = -1;

  public constructor(container: HTMLElement, onTileSelect: TileSelectHandler) {
    this.container = container;
    this.onTileSelect = onTileSelect;

    this.container.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest<HTMLButtonElement>("button[data-index]");

      const index = this.parseIndexFromButton(button);

      if (index === null) {
        return;
      }

      this.onTileSelect(index);
    });

    this.container.addEventListener("keydown", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      if (!target.matches("button[data-index]")) {
        return;
      }

      const index = this.parseIndexFromButton(target);

      if (index === null) {
        return;
      }

      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = index + 1 < this.tileCount ? index + 1 : null;
          break;
        case "ArrowLeft":
          nextIndex = index - 1 >= 0 ? index - 1 : null;
          break;
        case "ArrowDown":
          nextIndex = index + this.columns < this.tileCount ? index + this.columns : null;
          break;
        case "ArrowUp":
          nextIndex = index - this.columns >= 0 ? index - this.columns : null;
          break;
        default:
          break;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();

      const nextButton = this.container.querySelector<HTMLButtonElement>(
        `button[data-index="${nextIndex}"]`,
      );

      nextButton?.focus();
    });
  }

  public render(tiles: readonly BoardTileViewModel[], columns: number): void {
    this.columns = columns;
    this.tileCount = tiles.length;

    const targetBoardWidthPx = BoardView.calculateBoardWidth(columns, this.boardLayout);

    this.container.style.width = `min(${targetBoardWidthPx}px, 100%)`;

    this.container.style.gridTemplateColumns = `repeat(${columns}, minmax(${this.boardLayout.minTileSizePx}px, 1fr))`;
    this.ensureButtonCount(tiles.length);

    for (const [index, tile] of tiles.entries()) {
      const button = this.buttons[index];

      if (button === undefined) {
        continue;
      }

      const frontFace = button.querySelector<HTMLElement>(".tile-front");
      const backFace = button.querySelector<HTMLElement>(".tile-back");
      const isBlocked = tile.status === "blocked";

      if (frontFace !== null) {
        frontFace.textContent = isBlocked ? "•" : "?";
      }

      const countryName = getFlagEmojiCountryName(tile.icon);
      const hasAccessibleFlagName = countryName !== null;
      const accessibleFlagLabel = hasAccessibleFlagName
        ? `${countryName} flag`
        : null;

      if (
        backFace !== null &&
        tile.status !== "hidden" &&
        !this.renderedBackFaces.has(backFace)
      ) {
        // Lazily render the back face only for tiles that are revealed or matched
        // to avoid unnecessary DOM work and image fetches for tiles that remain
        // hidden throughout the game. Once rendered, the back face is intentionally
        // kept in the DOM even if the tile transitions back to "hidden" — the icon
        // content is static, so preserving the rendered element avoids a redundant
        // re-render and image re-fetch on each reveal. Only visibility changes,
        // not content, so there is no correctness cost to retaining it.
        renderTileBackIcon(backFace, tile.icon, accessibleFlagLabel);
        this.renderedBackFaces.add(backFace);
      }
      const ariaLabel = isBlocked
        ? `Blocked tile ${index + 1}`
        : hasAccessibleFlagName
          ? `Tile ${index + 1}: ${countryName} flag`
          : `Tile ${index + 1}`;

      button.dataset.index = index.toString();
      button.setAttribute("aria-label", ariaLabel);
      button.setAttribute(
        "aria-pressed",
        String(!isBlocked && tile.status !== "hidden"),
      );

      const shouldBeRevealed =
        tile.status === "revealed" || tile.status === "matched";
      const shouldBeMatched = tile.status === "matched";

      button.classList.toggle("blocked", isBlocked);
      button.classList.toggle("revealed", shouldBeRevealed);

      if (shouldBeMatched && !button.classList.contains("matched")) {
        button.classList.add("matched");
      }

      if (!shouldBeMatched) {
        button.classList.remove("matched");
        button.classList.remove("matched-disappearing");
        this.clearAnimationTimer(index);
      }

      button.disabled = shouldBeMatched || isBlocked;
    }
  }

  /**
   * Clears the back-face lazy-render cache so that all tile back faces are
   * re-rendered on the next {@link render} call.
   *
   * Call this at the start of every new game to prevent DOM elements reused
   * from a previous game (same tile count, no rebuild) from retaining stale
   * icons from a different emoji pack.
   */
  public resetBackFaceCache(): void {
    this.renderedBackFaces = new WeakSet<HTMLElement>();
  }

  public setLayoutConfig(layoutConfig: BoardLayoutConfig): void {
    this.boardLayout = {
      minTileSizePx: Math.max(1, Math.round(layoutConfig.minTileSizePx)),
      targetTileSizePx: Math.max(1, Math.round(layoutConfig.targetTileSizePx)),
      tileGapPx: Math.max(0, Math.round(layoutConfig.tileGapPx)),
      boardHorizontalPaddingPx: Math.max(0, Math.round(layoutConfig.boardHorizontalPaddingPx)),
    };
  }

  public animateMatchedPair(
    firstIndex: number,
    secondIndex: number,
    pauseMs: number,
  ): void {
    const indices = [firstIndex, secondIndex];

    for (const index of indices) {
      const button = this.buttons[index];

      if (button === undefined) {
        continue;
      }

      this.clearAnimationTimer(index);

      const timer = window.setTimeout(() => {
        button.classList.add("matched-disappearing");
        this.matchAnimationTimers.delete(index);
      }, pauseMs);

      this.matchAnimationTimers.set(index, timer);
    }
  }

  /**
   * Creates a single tile face `<span>` with the given CSS class string.
   * Replaces inline element-creation logic that was previously duplicated as
   * an IIFE for each face key (`right`, `top`, `front`, `back`) inside
   * `ensureButtonCount`, keeping face initialisation co-located with the
   * build loop while eliminating the repetition.
   *
   * @param className - Full CSS class string for the face element.
   * @param textContent - Optional initial text content (e.g. `"?"` for the front face).
   * @returns A new `<span>` element configured with the given class and `aria-hidden="true"`.
   *
   * @remarks
   * All tile face elements are intentionally hidden from the accessibility tree
   * (`aria-hidden="true"`). Tile accessibility is provided by the parent button's
   * `aria-label`. This means that for flag-emoji tiles, the `alt` text and
   * `aria-hidden="false"` set on the child `<img>` in {@link renderTileBackIcon}
   * are inert — a parent with `aria-hidden="true"` suppresses all descendants
   * regardless of their own `aria-hidden` value.
   */
  private static createTileFace(className: string, textContent?: string): HTMLSpanElement {
    const el = document.createElement("span");
    el.className = className;
    el.setAttribute("aria-hidden", "true");
    if (textContent !== undefined) {
      el.textContent = textContent;
    }
    return el;
  }

  private ensureButtonCount(count: number): void {
    // Rebuild the DOM if the container was externally cleared or the child count no longer matches.
    if (!this.needsRebuild(count)) {
      return;
    }

    this.clearAllAnimationTimers();

    // Reset the lazy-render tracker so stale back-face references from the
    // previous DOM tree cannot accumulate in the WeakSet across rebuilds.
    this.renderedBackFaces = new WeakSet<HTMLElement>();

    this.container.replaceChildren();
    this.buttons = [];

    for (let index = 0; index < count; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      // `game-block` is a reusable 3D block visual primitive defined in the shared CSS;
      // in the current implementation it is applied here to board tiles via the `tile` role class.
      // See the `.game-block` rules in the shared stylesheet for the canonical 3D block styling.
      button.className = "tile game-block";
      button.dataset.index = index.toString();
      button.style.setProperty("--tile-index", index.toString());
      button.setAttribute("aria-label", `Tile ${index + 1}`);
      button.setAttribute("aria-pressed", "false");

      // Append faces in the order mandated by TILE_FACE_ORDER.
      // CSS rules and automated tests reference child indices — do not reorder.
      // Faces are built directly inside facesByKey so no free-standing variable
      // can be appended out-of-order above this block.
      // Typed as Record<(typeof TILE_FACE_ORDER)[number], ...> so TypeScript
      // enforces that every key in TILE_FACE_ORDER has a corresponding entry here.
      // Each call to createTileFace replaces an IIFE that was previously inlined
      // here; the helper keeps the logic identical while reducing repetition.
      const facesByKey: Record<(typeof TILE_FACE_ORDER)[number], HTMLSpanElement> = {
        right: BoardView.createTileFace(TILE_FACE_RIGHT_CLASS),
        top: BoardView.createTileFace(TILE_FACE_TOP_CLASS),
        front: BoardView.createTileFace(TILE_FACE_FRONT_CLASS, "?"),
        back: BoardView.createTileFace(TILE_FACE_BACK_CLASS),
      };

      for (const faceKey of TILE_FACE_ORDER) {
        const face = facesByKey[faceKey];

        button.append(face);
      }
      this.container.append(button);
      this.buttons.push(button);
    }
  }

  /**
   * Determines whether the tile button DOM needs to be rebuilt.
   *
   * In addition to comparing the expected tile count with the internal
   * `buttons` array, this also checks `container.childElementCount` so that
   * we detect cases where the container's DOM was externally cleared or
   * modified (for example, the container losing all children). When that
   * happens, `ensureButtonCount` will rebuild the tile elements.
   *
   * As an extra sanity check, this also verifies that all child elements
   * are `<button>` elements. This guards against cases where the container's
   * children are replaced with non-button elements while keeping the same
   * child count.
   *
   * @remarks
   * This full validation is acceptable for MEMORYBLOX because the maximum
   * board size is small (5 rows × 10 columns in hard mode). The element-type loop is skipped when
   * `container.childElementCount` matches the last count at which all
   * children were confirmed to be `<button>` elements, so normal render
   * cycles incur no per-child overhead.
   */
  private needsRebuild(count: number): boolean {
    if (this.buttons.length !== count || this.container.childElementCount !== count) {
      return true;
    }

    if (this.container.childElementCount === this.lastValidatedChildElementCount) {
      return false;
    }

    const children = this.container.children;

    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];

      if (child.tagName !== "BUTTON") {
        return true;
      }
    }

    // All children confirmed as <button> elements — cache the count.
    this.lastValidatedChildElementCount = this.container.childElementCount;

    // No rebuild needed when counts match and all children are valid button elements.
    return false;
  }

  private parseIndexFromButton(
    button: HTMLButtonElement | null,
  ): number | null {
    if (button === null) {
      return null;
    }

    const indexAttribute = button.dataset.index;

    if (indexAttribute === undefined) {
      return null;
    }

    const index = Number.parseInt(indexAttribute, 10);

    if (Number.isNaN(index)) {
      return null;
    }

    return index;
  }

  private clearAnimationTimer(index: number): void {
    const existingTimer = this.matchAnimationTimers.get(index);

    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      this.matchAnimationTimers.delete(index);
    }
  }

  private clearAllAnimationTimers(): void {
    for (const timer of this.matchAnimationTimers.values()) {
      window.clearTimeout(timer);
    }

    this.matchAnimationTimers.clear();
  }
}
