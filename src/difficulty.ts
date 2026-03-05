/**
 * Difficulty configuration for MEMORYBLOX.
 *
 * Centralises the board-size and score-multiplier presets so that the
 * bootstrap layer (`src/index.ts`) and any future tests or tools can import
 * a single source of truth without depending on the full app entrypoint.
 */

export interface DifficultyConfig {
  id: string;
  label: string;
  rows: number;
  columns: number;
  scoreMultiplier: number;
}

export const DIFFICULTIES: readonly DifficultyConfig[] = Object.freeze([
  Object.freeze({ id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 }),
  Object.freeze({ id: "normal", label: "Normal", rows: 5, columns: 8, scoreMultiplier: 1.8 }),
  Object.freeze({ id: "hard", label: "Hard", rows: 5, columns: 10, scoreMultiplier: 2.4 }),
]);

export const DEFAULT_DIFFICULTY_ID = "normal";

export const DEBUG_TILES_DIFFICULTY: DifficultyConfig = {
  id: "debug-tiles",
  label: "Debug Tiles",
  rows: 1,
  columns: 2,
  scoreMultiplier: 0,
};

/**
 * Finds a difficulty config by id.  Returns `null` when the id is not
 * found so callers can apply their own fallback strategy.
 */
export const getDifficultyById = (id: string): DifficultyConfig | null => {
  return DIFFICULTIES.find((d) => d.id === id) ?? null;
};
