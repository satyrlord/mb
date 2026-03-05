import { describe, expect, test } from "vitest";

import {
  DEBUG_TILES_DIFFICULTY,
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTIES,
  getDifficultyById,
} from "../src/difficulty.ts";

describe("DIFFICULTIES", () => {
  test("contains easy, normal, and hard presets", () => {
    const ids = DIFFICULTIES.map((d) => d.id);

    expect(ids).toContain("easy");
    expect(ids).toContain("normal");
    expect(ids).toContain("hard");
  });

  test("every difficulty has positive rows, columns, and scoreMultiplier", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(difficulty.rows).toBeGreaterThan(0);
      expect(difficulty.columns).toBeGreaterThan(0);
      expect(difficulty.scoreMultiplier).toBeGreaterThan(0);
    }
  });

  test("difficulties are ordered easy < normal < hard by scoreMultiplier", () => {
    const [easy, normal, hard] = DIFFICULTIES;

    expect(easy?.scoreMultiplier).toBeLessThan(normal?.scoreMultiplier ?? 0);
    expect(normal?.scoreMultiplier).toBeLessThan(hard?.scoreMultiplier ?? 0);
  });

  test("DIFFICULTIES array is frozen and cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DIFFICULTIES)).toBe(true);
  });
});

describe("getDifficultyById", () => {
  test("returns the matching difficulty config for a known id", () => {
    const difficulty = getDifficultyById("easy");

    expect(difficulty).not.toBeNull();
    expect(difficulty?.id).toBe("easy");
    expect(difficulty?.label).toBe("Easy");
  });

  test("returns null for an unknown id", () => {
    expect(getDifficultyById("extreme")).toBeNull();
    expect(getDifficultyById("")).toBeNull();
  });

  test("returns a config for the default difficulty id", () => {
    const difficulty = getDifficultyById(DEFAULT_DIFFICULTY_ID);

    expect(difficulty).not.toBeNull();
    expect(difficulty?.id).toBe(DEFAULT_DIFFICULTY_ID);
  });
});

describe("DEFAULT_DIFFICULTY_ID", () => {
  test("matches an entry in DIFFICULTIES", () => {
    expect(getDifficultyById(DEFAULT_DIFFICULTY_ID)).not.toBeNull();
  });
});

describe("DEBUG_TILES_DIFFICULTY", () => {
  test("has scoreMultiplier of 0", () => {
    expect(DEBUG_TILES_DIFFICULTY.scoreMultiplier).toBe(0);
  });

  test("has minimal board dimensions (1 row, 2 columns)", () => {
    expect(DEBUG_TILES_DIFFICULTY.rows).toBe(1);
    expect(DEBUG_TILES_DIFFICULTY.columns).toBe(2);
  });
});
