// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { BoardView, type BoardTileViewModel } from "../src/board.ts";

const createTiles = (count: number): BoardTileViewModel[] => {
  return Array.from({ length: count }, () => ({
    icon: "🧠",
    status: "hidden",
  }));
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
});
