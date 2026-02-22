// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { BoardView, type BoardTileViewModel } from "../src/board.ts";

const createTiles = (count: number): BoardTileViewModel[] => {
  return Array.from({ length: count }, () => ({
    icon: "🧠",
    status: "hidden",
  }));
};

const createTile = (icon: string, status: BoardTileViewModel["status"]): BoardTileViewModel => {
  return { icon, status };
};

describe("BoardView", () => {
  test("render applies expected board width for different column counts", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(6), 6);
    expect(container.style.width).toBe("min(586px, 100%)");

    boardView.render(createTiles(8), 8);
    expect(container.style.width).toBe("min(774px, 100%)");

    boardView.render(createTiles(10), 10);
    expect(container.style.width).toBe("min(962px, 100%)");
  });

  test("render respects runtime layout config overrides", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.setLayoutConfig({
      minTileSizePx: 50,
      targetTileSizePx: 100,
      tileGapPx: 12,
      boardHorizontalPaddingPx: 20,
    });

    boardView.render(createTiles(8), 8);

    expect(container.style.width).toBe("min(924px, 100%)");
    expect(container.style.gridTemplateColumns).toBe("repeat(8, minmax(50px, 1fr))");
  });

  test("render rebuilds tile buttons when container DOM is unexpectedly cleared", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(40), 8);
    expect(container.querySelectorAll("button[data-index]")).toHaveLength(40);

    container.replaceChildren();
    expect(container.querySelectorAll("button[data-index]")).toHaveLength(0);

    boardView.render(createTiles(40), 8);
    expect(container.querySelectorAll("button[data-index]")).toHaveLength(40);
  });

  test("render creates tile faces in the required right/top/front/back order", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(2), 2);

    const firstButton = container.querySelector<HTMLButtonElement>("button[data-index='0']");
    expect(firstButton).not.toBeNull();

    const faceClasses = Array.from(firstButton?.children ?? []).map((child) =>
      (child as HTMLElement).className,
    );

    expect(faceClasses).toEqual([
      "tile-face tile-right",
      "tile-face tile-top",
      "tile-face tile-front plasma-surface u-shadow-physical",
      "tile-face tile-back plasma-surface u-shadow-physical",
    ]);
  });

  test("render updates aria labels, disabled state, and lazy back-face rendering", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render([
      createTile("🇨🇦", "hidden"),
      createTile("🧠", "blocked"),
      createTile("🇨🇦", "revealed"),
      createTile("🧠", "matched"),
    ], 2);

    const tiles = container.querySelectorAll<HTMLButtonElement>("button[data-index]");
    expect(tiles).toHaveLength(4);

    const hiddenFlag = tiles[0];
    const blocked = tiles[1];
    const revealedFlag = tiles[2];
    const matched = tiles[3];

    expect(hiddenFlag.getAttribute("aria-label")).toBe("Tile 1: Canada flag");
    expect(blocked.getAttribute("aria-label")).toBe("Blocked tile 2");
    expect(revealedFlag.getAttribute("aria-label")).toBe("Tile 3: Canada flag");
    expect(matched.getAttribute("aria-label")).toBe("Tile 4");

    expect(blocked.disabled).toBe(true);
    expect(matched.disabled).toBe(true);
    expect(hiddenFlag.disabled).toBe(false);

    const hiddenBackFace = hiddenFlag.querySelector(".tile-back");
    const revealedBackFace = revealedFlag.querySelector(".tile-back");

    expect(hiddenBackFace?.querySelector("img")).toBeNull();
    expect(revealedBackFace?.querySelector("img")).not.toBeNull();
  });

  test("clicking a tile notifies the select handler", () => {
    const container = document.createElement("section");
    const selections: number[] = [];
    const boardView = new BoardView(container, (index) => {
      selections.push(index);
    });

    boardView.render(createTiles(2), 2);
    const button = container.querySelector<HTMLButtonElement>("button[data-index='1']");
    expect(button).not.toBeNull();

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(selections).toEqual([1]);
  });

  describe("animateMatchedPair", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("adds matched-disappearing class after pause elapses", () => {
      vi.useFakeTimers();
      const container = document.createElement("section");
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 2);
      boardView.animateMatchedPair(0, 1, 200);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']");
      const btn1 = container.querySelector<HTMLButtonElement>("button[data-index='1']");

      expect(btn0?.classList.contains("matched-disappearing")).toBe(false);
      expect(btn1?.classList.contains("matched-disappearing")).toBe(false);

      vi.advanceTimersByTime(200);

      expect(btn0?.classList.contains("matched-disappearing")).toBe(true);
      expect(btn1?.classList.contains("matched-disappearing")).toBe(true);
    });

    test("cancels pending timer when animateMatchedPair is called again for same index", () => {
      vi.useFakeTimers();
      const container = document.createElement("section");
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(2), 2);
      boardView.animateMatchedPair(0, 1, 500);
      // Call again before timer fires — should replace the timer
      boardView.animateMatchedPair(0, 1, 100);

      vi.advanceTimersByTime(100);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']");
      expect(btn0?.classList.contains("matched-disappearing")).toBe(true);
    });

    test("does not throw for out-of-range indices", () => {
      vi.useFakeTimers();
      const container = document.createElement("section");
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(2), 2);
      expect(() => boardView.animateMatchedPair(99, 100, 50)).not.toThrow();

      vi.advanceTimersByTime(50);
    });
  });

  describe("keyboard navigation", () => {
    const dispatchArrow = (element: HTMLElement, key: string): void => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };

    test("ArrowRight moves focus to next tile", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 4);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']")!;
      btn0.focus();
      dispatchArrow(btn0, "ArrowRight");

      expect(document.activeElement?.getAttribute("data-index")).toBe("1");
      container.remove();
    });

    test("ArrowLeft moves focus to previous tile", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 4);

      const btn1 = container.querySelector<HTMLButtonElement>("button[data-index='1']")!;
      btn1.focus();
      dispatchArrow(btn1, "ArrowLeft");

      expect(document.activeElement?.getAttribute("data-index")).toBe("0");
      container.remove();
    });

    test("ArrowDown moves focus one row down", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      // 2 cols, 4 tiles → row 0: [0,1], row 1: [2,3]
      boardView.render(createTiles(4), 2);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']")!;
      btn0.focus();
      dispatchArrow(btn0, "ArrowDown");

      expect(document.activeElement?.getAttribute("data-index")).toBe("2");
      container.remove();
    });

    test("ArrowUp moves focus one row up", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 2);

      const btn2 = container.querySelector<HTMLButtonElement>("button[data-index='2']")!;
      btn2.focus();
      dispatchArrow(btn2, "ArrowUp");

      expect(document.activeElement?.getAttribute("data-index")).toBe("0");
      container.remove();
    });

    test("ArrowLeft on first tile does nothing (boundary)", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 4);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']")!;
      btn0.focus();
      dispatchArrow(btn0, "ArrowLeft");

      expect(document.activeElement).toBe(btn0);
      container.remove();
    });

    test("ArrowRight on last tile does nothing (boundary)", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 4);

      const btn3 = container.querySelector<HTMLButtonElement>("button[data-index='3']")!;
      btn3.focus();
      dispatchArrow(btn3, "ArrowRight");

      expect(document.activeElement).toBe(btn3);
      container.remove();
    });

    test("non-arrow key does not move focus", () => {
      const container = document.createElement("section");
      document.body.append(container);
      const boardView = new BoardView(container, () => {});

      boardView.render(createTiles(4), 4);

      const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']")!;
      btn0.focus();
      dispatchArrow(btn0, "Enter");

      expect(document.activeElement).toBe(btn0);
      container.remove();
    });
  });

  test("needsRebuild detects non-button children in container", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(2), 2);
    expect(container.querySelectorAll("button")).toHaveLength(2);

    // Replace children with non-button elements
    container.replaceChildren(document.createElement("div"), document.createElement("div"));
    // Still 2 children but wrong type — should trigger rebuild
    boardView.render(createTiles(2), 2);
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  test("resetBackFaceCache forces re-render of back faces on next render", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    const tiles: BoardTileViewModel[] = [
      { icon: "🧠", status: "revealed" },
      { icon: "🧠", status: "revealed" },
    ];

    boardView.render(tiles, 2);
    const backFace0 = container.querySelector<HTMLElement>("button[data-index='0'] .tile-back")!;
    expect(backFace0.textContent).toBe("🧠");

    boardView.resetBackFaceCache();

    // Change icon content and re-render — should update the back face
    const newTiles: BoardTileViewModel[] = [
      { icon: "🎲", status: "revealed" },
      { icon: "🎲", status: "revealed" },
    ];
    boardView.render(newTiles, 2);
    expect(backFace0.textContent).toBe("🎲");
  });

  test("render handles flag emoji with accessible labels", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    const tiles: BoardTileViewModel[] = [
      { icon: "🇨🇦", status: "revealed" },
      { icon: "🇺🇸", status: "hidden" },
    ];

    boardView.render(tiles, 2);
    const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']");

    expect(btn0?.getAttribute("aria-label")).toContain("Canada");
  });

  test("render handles non-flag emoji correctly", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    const tiles: BoardTileViewModel[] = [
      { icon: "🧠", status: "revealed" },
      { icon: "🎲", status: "hidden" },
    ];

    boardView.render(tiles, 2);
    const backFace0 = container.querySelector<HTMLElement>(".tile-back");

    // Non-flag emoji should render as text, not image
    expect(backFace0?.textContent).toBe("🧠");
    expect(backFace0?.querySelector("img")).toBeNull();
  });

  test("render with single column layout", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(4), 1);
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");

    expect(buttons).toHaveLength(4);
    buttons.forEach((btn, i) => {
      expect(btn.getAttribute("data-index")).toBe(i.toString());
    });
  });

  test("render with many columns", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(10), 10);
    const buttons = container.querySelectorAll<HTMLButtonElement>("button");

    expect(buttons).toHaveLength(10);
  });

  test("animateMatchedPair with edge case indices at boundaries", () => {
    vi.useFakeTimers();
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(10), 5);

    // Animate first and last tiles
    boardView.animateMatchedPair(0, 9, 100);

    vi.advanceTimersByTime(100);

    const btn0 = container.querySelector<HTMLButtonElement>("button[data-index='0']");
    const btn9 = container.querySelector<HTMLButtonElement>("button[data-index='9']");

    expect(btn0?.classList.contains("matched-disappearing")).toBe(true);
    expect(btn9?.classList.contains("matched-disappearing")).toBe(true);
  });

  test("keyboard navigation wraps around within same row", () => {
    const container = document.createElement("section");
    document.body.append(container);
    const boardView = new BoardView(container, () => {});

    // 3 columns, 2 rows: [0,1,2] [3,4,5]
    boardView.render(createTiles(6), 3);

    const btn1 = container.querySelector<HTMLButtonElement>("button[data-index='1']")!;
    btn1.focus();
    // ArrowLeft from 1 should go to 0
    btn1.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(document.activeElement?.getAttribute("data-index")).toBe("0");

    // ArrowRight from 0 should go to 1
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(document.activeElement?.getAttribute("data-index")).toBe("1");

    container.remove();
  });

  test("render detects and rebuilds when DOM is partially cleared", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render(createTiles(4), 2);
    expect(container.querySelectorAll("button")).toHaveLength(4);

    // Clear one child but keep structure
    const firstButton = container.querySelector("button");
    firstButton?.remove();

    // Re-rendering should rebuild
    boardView.render(createTiles(4), 2);
    expect(container.querySelectorAll("button")).toHaveLength(4);
  });

  test("tile click event includes correct index in data attribute", () => {
    const container = document.createElement("section");
    const selections: number[] = [];
    const boardView = new BoardView(container, (index) => {
      selections.push(index);
    });

    boardView.render(createTiles(6), 3);

    // Click tiles at various indices
    [0, 3, 5].forEach((index) => {
      const btn = container.querySelector<HTMLButtonElement>(
        `button[data-index='${index}']`,
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selections).toEqual([0, 3, 5]);
  });

  test("blocked tiles remain disabled after render", () => {
    const container = document.createElement("section");
    const boardView = new BoardView(container, () => {});

    boardView.render([
      createTile("🧠", "blocked"),
      createTile("🎲", "hidden"),
      createTile("🧠", "blocked"),
    ], 3);

    const blockedTiles = container.querySelectorAll<HTMLButtonElement>(
      "button:disabled",
    );

    expect(blockedTiles.length).toBe(2);
  });
});
