/**
 * Tile layout computation for MEMORYBLOX.
 *
 * Pure functions that resolve tile counts, set distributions, and multiplier
 * clamping for a given difficulty configuration. Extracted from `src/index.ts`
 * to keep the bootstrap layer focused on wiring and DOM interaction.
 */

import { clamp } from "./utils";
import type { DifficultyConfig } from "./difficulty";

export interface TileLayout {
  tileCount: number;
  multiSetCount: number;
  pairSetCount: number;
  multiSetCopies: number;
}

export const clampTileMultiplier = (value: number): number => {
  const rounded = Math.round(value);
  return clamp(rounded, 1, 3);
};

export const resolveTileMultiplierForTileCount = (
  tileCount: number,
  selectedTileMultiplier: number,
): number => {
  if (tileCount < 2) {
    return 1;
  }

  const maxMultiplier = Math.max(1, Math.floor(tileCount / 2));
  return clampTileMultiplier(Math.min(selectedTileMultiplier, maxMultiplier));
};

export const computeTileLayout = (
  difficulty: DifficultyConfig,
  selectedTileMultiplier: number,
): TileLayout => {
  const tileCount = difficulty.rows * difficulty.columns;
  const effectiveMultiplier = resolveTileMultiplierForTileCount(tileCount, selectedTileMultiplier);
  const multiSetCopies = effectiveMultiplier * 2;
  const multiSetCount = Math.floor(tileCount / multiSetCopies);
  const remainderTiles = tileCount - (multiSetCount * multiSetCopies);
  const pairSetCount = Math.floor(remainderTiles / 2);

  return {
    tileCount,
    multiSetCount,
    pairSetCount,
    multiSetCopies,
  };
};
