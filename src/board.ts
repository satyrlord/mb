import type { Tile } from "./game.js";

type TileSelectHandler = (index: number) => void;

export class BoardView {
  /**
   * 44px is the minimum tile size that keeps the densest 5x10 board usable
   * on smaller desktop widths while aligning with WCAG 2.1 SC 2.5.5 (Target
   * Size) Level AAA touch target guidance (44x44 CSS px) for tap/click targets
   * across typical board and container dimensions.
   */
  private static readonly MIN_TILE_SIZE_PX = 44;

  private readonly container: HTMLElement;

  private readonly onTileSelect: TileSelectHandler;

  private columns = 8;

  private tileCount = 0;

  private buttons: HTMLButtonElement[] = [];

  private matchAnimationTimers = new Map<number, number>();

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

  public render(tiles: Tile[], columns: number): void {
    this.columns = columns;
    this.tileCount = tiles.length;

    this.container.style.gridTemplateColumns = `repeat(${columns}, minmax(${BoardView.MIN_TILE_SIZE_PX}px, 1fr))`;
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

      if (backFace !== null) {
        backFace.textContent = tile.icon;
      }

      button.dataset.index = index.toString();
      button.setAttribute(
        "aria-label",
        isBlocked ? `Blocked tile ${index + 1}` : `Tile ${index + 1}`,
      );
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

  private ensureButtonCount(count: number): void {
    if (this.buttons.length === count) {
      return;
    }

    this.clearAllAnimationTimers();

    this.container.replaceChildren();
    this.buttons = [];

    for (let index = 0; index < count; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tile";
      button.dataset.index = index.toString();
      button.setAttribute("aria-label", `Tile ${index + 1}`);
      button.setAttribute("aria-pressed", "false");

      const frontFace = document.createElement("span");
      frontFace.className = "tile-face tile-front";
      frontFace.setAttribute("aria-hidden", "true");
      frontFace.textContent = "?";

      const backFace = document.createElement("span");
      backFace.className = "tile-face tile-back";
      backFace.setAttribute("aria-hidden", "true");

      button.append(frontFace, backFace);
      this.container.append(button);
      this.buttons.push(button);
    }
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
