import { describe, expect, it } from "vitest";
import {
  clampTileMultiplier,
  computeTileLayout,
  resolveTileMultiplierForTileCount,
} from "../src/tile-layout.js";
import type { DifficultyConfig } from "../src/difficulty.js";

const makeDifficulty = (rows: number, columns: number): DifficultyConfig => ({
  id: "test",
  label: "Test",
  rows,
  columns,
  scoreMultiplier: 1,
});

describe("clampTileMultiplier", () => {
  it("returns 1 for values below 1", () => {
    expect(clampTileMultiplier(0)).toBe(1);
    expect(clampTileMultiplier(-5)).toBe(1);
  });

  it("returns 3 for values above 3", () => {
    expect(clampTileMultiplier(4)).toBe(3);
    expect(clampTileMultiplier(100)).toBe(3);
  });

  it("rounds fractional values before clamping", () => {
    expect(clampTileMultiplier(1.4)).toBe(1);
    expect(clampTileMultiplier(1.6)).toBe(2);
    expect(clampTileMultiplier(2.5)).toBe(3);
    expect(clampTileMultiplier(0.4)).toBe(1);
    expect(clampTileMultiplier(3.4)).toBe(3);
  });

  it("returns the value unchanged when already in range", () => {
    expect(clampTileMultiplier(1)).toBe(1);
    expect(clampTileMultiplier(2)).toBe(2);
    expect(clampTileMultiplier(3)).toBe(3);
  });
});

describe("resolveTileMultiplierForTileCount", () => {
  it("returns 1 when tileCount is less than 2", () => {
    expect(resolveTileMultiplierForTileCount(0, 3)).toBe(1);
    expect(resolveTileMultiplierForTileCount(1, 3)).toBe(1);
  });

  it("caps multiplier to half the tile count", () => {
    // 4 tiles → max multiplier is 2
    expect(resolveTileMultiplierForTileCount(4, 3)).toBe(2);
    // 2 tiles → max multiplier is 1
    expect(resolveTileMultiplierForTileCount(2, 3)).toBe(1);
  });

  it("uses selectedTileMultiplier when within bounds", () => {
    expect(resolveTileMultiplierForTileCount(30, 1)).toBe(1);
    expect(resolveTileMultiplierForTileCount(30, 2)).toBe(2);
    expect(resolveTileMultiplierForTileCount(30, 3)).toBe(3);
  });

  it("clamps the final value via clampTileMultiplier", () => {
    // Even though selected=10, max for 100 tiles is floor(100/2)=50, but clamp caps at 3
    expect(resolveTileMultiplierForTileCount(100, 10)).toBe(3);
  });
});

describe("computeTileLayout", () => {
  it("computes a standard 5x6 board with multiplier 1", () => {
    const result = computeTileLayout(makeDifficulty(5, 6), 1);
    expect(result.tileCount).toBe(30);
    expect(result.multiSetCopies).toBe(2);
    expect(result.multiSetCount).toBe(15);
    expect(result.pairSetCount).toBe(0);
  });

  it("computes a 5x8 board with multiplier 1", () => {
    const result = computeTileLayout(makeDifficulty(5, 8), 1);
    expect(result.tileCount).toBe(40);
    expect(result.multiSetCopies).toBe(2);
    expect(result.multiSetCount).toBe(20);
    expect(result.pairSetCount).toBe(0);
  });

  it("computes a 5x10 board with multiplier 1", () => {
    const result = computeTileLayout(makeDifficulty(5, 10), 1);
    expect(result.tileCount).toBe(50);
    expect(result.multiSetCopies).toBe(2);
    expect(result.multiSetCount).toBe(25);
    expect(result.pairSetCount).toBe(0);
  });

  it("increases copies per icon with higher multiplier", () => {
    const result = computeTileLayout(makeDifficulty(5, 6), 2);
    // 30 tiles, multiplier 2 → 4 copies per icon → 7 multi-sets + 1 pair
    expect(result.tileCount).toBe(30);
    expect(result.multiSetCopies).toBe(4);
    expect(result.multiSetCount).toBe(7);
    expect(result.pairSetCount).toBe(1);
  });

  it("handles multiplier 3", () => {
    const result = computeTileLayout(makeDifficulty(5, 6), 3);
    // 30 tiles, multiplier 3 → 6 copies per icon → 5 multi-sets + 0 pairs
    expect(result.tileCount).toBe(30);
    expect(result.multiSetCopies).toBe(6);
    expect(result.multiSetCount).toBe(5);
    expect(result.pairSetCount).toBe(0);
  });

  it("caps multiplier for small boards", () => {
    // 2x2 board = 4 tiles: max multiplier is 2
    const result = computeTileLayout(makeDifficulty(2, 2), 3);
    expect(result.tileCount).toBe(4);
    expect(result.multiSetCopies).toBe(4);
    expect(result.multiSetCount).toBe(1);
    expect(result.pairSetCount).toBe(0);
  });

  it("returns multiplier 1 for degenerate boards", () => {
    const result = computeTileLayout(makeDifficulty(1, 1), 3);
    expect(result.tileCount).toBe(1);
    expect(result.multiSetCopies).toBe(2);
    expect(result.multiSetCount).toBe(0);
    expect(result.pairSetCount).toBe(0);
  });
});
