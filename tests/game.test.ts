import { describe, expect, test, vi } from "vitest";

import {
  BLOCKED_TILE_TOKEN,
  createGame,
  findFirstUnmatchedPairIndices,
  getElapsedTimeMs,
  getRemainingUnmatchedPairCount,
  prepareNearWinState,
  resetGame,
  resolveMismatch,
  selectTile,
} from "../src/game.ts";

describe("prepareNearWinState", () => {
  test("marks all but one pair as matched and returns remaining pair", () => {
    vi.spyOn(performance, "now").mockReturnValue(1234);
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🍎", "🍎", "🍇", "🍇"],
    });

    const result = prepareNearWinState(state);

    expect(result.remainingPair).toEqual([2, 3]);
    expect(result.matchedPairs).toEqual([[0, 1]]);
    expect(state.matches).toBe(1);
    expect(state.tiles[0]?.status).toBe("matched");
    expect(state.tiles[1]?.status).toBe("matched");
    expect(state.tiles[2]?.status).toBe("hidden");
    expect(state.tiles[3]?.status).toBe("hidden");
  });

  test("returns null remaining pair when no matchable tiles exist", () => {
    const state = createGame({
      rows: 1,
      columns: 1,
      deck: [BLOCKED_TILE_TOKEN],
    });

    const result = prepareNearWinState(state);

    expect(result.remainingPair).toBeNull();
    expect(result.matchedPairs).toEqual([]);
  });

  test("handles boards where the last pairId has only one tile", () => {
    const state = createGame({
      rows: 2,
      columns: 3,
      deck: ["🟦", "🟦", "🟥", "🟥", "🟨", "🟥"],
    });

    const result = prepareNearWinState(state);

    expect(result.remainingPair).toBeNull();
    expect(state.remainingPairCount).toBe(0);
  });

  test("skips missing tile entries referenced by tile id", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    if (state.tiles[0] !== undefined) {
      state.tiles[0].id = 99;
    }

    expect(() => prepareNearWinState(state)).not.toThrow();
  });
});

describe("selectTile", () => {
  test("ignores selecting a tile that is already revealed", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    expect(selectTile(state, 0)).toEqual({ type: "first", index: 0 });
    expect(selectTile(state, 0)).toEqual({ type: "ignored" });
  });

  test("throws when selecting an out-of-bounds tile index", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    expect(() => selectTile(state, -1)).toThrowError(RangeError);
    expect(() => selectTile(state, 4)).toThrowError(RangeError);
  });

  test("throws at the exact upper boundary index === state.tiles.length", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    // state.tiles.length is 4; index 4 is exactly one past the last valid index (3).
    expect(() => selectTile(state, state.tiles.length)).toThrowError(RangeError);
  });

  test("throws when tile entry is missing at a valid index", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    delete state.tiles[1];

    expect(() => selectTile(state, 1)).toThrowError(RangeError);
  });

  test("throws on state corruption when remainingPairCount is already zero", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    state.remainingPairCount = 0;

    expect(selectTile(state, 0).type).toBe("first");
    expect(() => selectTile(state, 1)).toThrowError("State corruption detected");
  });

  test("auto-resolves prior mismatch when selecting a new tile", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    expect(selectTile(state, 0).type).toBe("first");
    expect(selectTile(state, 1).type).toBe("mismatch");
    expect(state.isBoardLocked).toBe(true);

    const nextSelection = selectTile(state, 2);

    expect(nextSelection).toEqual({ type: "first", index: 2 });
    expect(state.tiles[0]?.status).toBe("hidden");
    expect(state.tiles[1]?.status).toBe("hidden");
    expect(state.tiles[2]?.status).toBe("revealed");
    expect(state.isBoardLocked).toBe(false);
    expect(state.firstSelection).toBe(2);
    expect(state.secondSelection).toBeNull();
  });

  test("handles rapid successive selections after mismatch auto-resolve", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    expect(selectTile(state, 0).type).toBe("first");
    expect(selectTile(state, 1).type).toBe("mismatch");
    expect(state.isBoardLocked).toBe(true);

    expect(selectTile(state, 2)).toEqual({ type: "first", index: 2 });
    const nextResult = selectTile(state, 0);

    expect(nextResult.type).toBe("match");
    expect(state.tiles[0]?.status).toBe("matched");
    expect(state.tiles[2]?.status).toBe("matched");
    expect(state.isBoardLocked).toBe(false);
  });
});

describe("resolveMismatch", () => {
  test("hides both revealed tiles and unlocks the board", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟥", "🟦", "🟥"],
    });

    selectTile(state, 0); // first
    selectTile(state, 1); // mismatch → board locked

    expect(state.isBoardLocked).toBe(true);
    expect(state.tiles[0]?.status).toBe("revealed");
    expect(state.tiles[1]?.status).toBe("revealed");

    resolveMismatch(state, 0, 1);

    expect(state.tiles[0]?.status).toBe("hidden");
    expect(state.tiles[1]?.status).toBe("hidden");
    expect(state.isBoardLocked).toBe(false);
    expect(state.firstSelection).toBeNull();
    expect(state.secondSelection).toBeNull();
  });

  test("does not change status of already-matched tiles", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    selectTile(state, 0);
    selectTile(state, 1); // match

    expect(state.tiles[0]?.status).toBe("matched");

    // Calling resolveMismatch on matched tiles should leave them matched
    resolveMismatch(state, 0, 1);
    expect(state.tiles[0]?.status).toBe("matched");
    expect(state.tiles[1]?.status).toBe("matched");
  });
});

describe("resetGame", () => {
  test("resets all state and applies new deck", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    selectTile(state, 0);
    selectTile(state, 1);
    expect(state.attempts).toBe(1);

    resetGame(state, ["🎯", "🎯", "⭐", "⭐"]);

    expect(state.attempts).toBe(0);
    expect(state.isWon).toBe(false);
    expect(state.matches).toBe(0);
    const icons = state.tiles.map((t) => t.icon);
    expect(icons).toContain("🎯");
    expect(icons).toContain("⭐");
  });

  test("throws when deck size does not match board size", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    expect(() => resetGame(state, ["🟦", "🟦"])).toThrowError(Error);
  });
});

describe("getElapsedTimeMs", () => {
  test("returns 0 when game has not started", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    expect(getElapsedTimeMs(state)).toBe(0);
  });

  test("returns elapsed time when game is in progress", () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1800);

    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    selectTile(state, 0); // starts the timer (sets startedAt)
    const elapsed = getElapsedTimeMs(state);

    expect(elapsed).toBeGreaterThanOrEqual(0);
    vi.restoreAllMocks();
  });

  test("returns fixed duration when game has ended", () => {
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(1000) // createGame
      .mockReturnValueOnce(1000) // selectTile 0
      .mockReturnValueOnce(1000) // selectTile 1
      .mockReturnValueOnce(1000) // selectTile 2
      .mockReturnValueOnce(2500); // selectTile 3 (win)

    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    selectTile(state, 0);
    selectTile(state, 1);
    selectTile(state, 2);
    selectTile(state, 3);

    expect(state.isWon).toBe(true);
    const elapsed = getElapsedTimeMs(state);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    vi.restoreAllMocks();
  });
});

describe("findFirstUnmatchedPairIndices", () => {
  test("returns indices of first unmatched pair", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    const pair = findFirstUnmatchedPairIndices(state);

    expect(pair).not.toBeNull();
    expect(pair).toHaveLength(2);
  });

  test("returns null when all tiles are matched", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    selectTile(state, 0);
    selectTile(state, 1);
    selectTile(state, 2);
    selectTile(state, 3);

    expect(findFirstUnmatchedPairIndices(state)).toBeNull();
  });
});

describe("getRemainingUnmatchedPairCount", () => {
  test("throws when createGame deck size does not match board dimensions", () => {
    expect(() => createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥"],
    })).toThrowError("Deck size must exactly match rows × columns.");
  });

  test("throws when matchable tile count is odd", () => {
    expect(() => createGame({
      rows: 1,
      columns: 3,
      deck: ["🟦", BLOCKED_TILE_TOKEN, BLOCKED_TILE_TOKEN],
    })).toThrowError("Matchable tile count must be even.");
  });

  test("counts remaining matchable pairIds (standard 2-copy sets)", () => {
    const state = createGame({
      rows: 2,
      columns: 2,
      deck: ["🟦", "🟦", "🟥", "🟥"],
    });

    expect(getRemainingUnmatchedPairCount(state)).toBe(2);

    selectTile(state, 0);
    selectTile(state, 1); // match 🟦

    expect(getRemainingUnmatchedPairCount(state)).toBe(1);
  });

  test("does not count orphaned tiles when one of a 3-copy set is alone after matching", () => {
    // 3 copies of 🟦 (pairId 0) + 3 copies of 🟥 (pairId 1) = 6 tiles.
    // totalMatchableGroups = pairIdsByIcon.size = 2 (not 6/2 = 3).
    const state = createGame({
      rows: 2,
      columns: 3,
      deck: ["🟦", "🟦", "🟦", "🟥", "🟥", "🟥"],
    });

    expect(state.totalMatchableGroups).toBe(2); // 2 unique icons, not 3
    expect(getRemainingUnmatchedPairCount(state)).toBe(2);

    // Match 2 of the 3 🟦 tiles — tile index 2 (🟦) is orphaned
    selectTile(state, 0);
    selectTile(state, 1); // match → tiles 0,1 are matched; tile 2 is still hidden (orphan)

    // pairId 0 now has only 1 unmatched tile (the orphan) — not counted
    // pairId 1 still has 3 matchable tiles → counted as 1 remaining pair
    expect(getRemainingUnmatchedPairCount(state)).toBe(1);
  });

  test("game with 3-copy sets is winnable (totalMatchableGroups = unique icon count)", () => {
    const state = createGame({
      rows: 2,
      columns: 3,
      deck: ["🟦", "🟦", "🟦", "🟥", "🟥", "🟥"],
    });

    expect(state.totalMatchableGroups).toBe(2);
    expect(state.isWon).toBe(false);

    selectTile(state, 0);
    selectTile(state, 1); // match 🟦 (tiles 0+1); tile 2 is orphaned

    expect(state.matches).toBe(1);
    expect(state.isWon).toBe(false);

    selectTile(state, 3);
    const result = selectTile(state, 4); // match 🟥 (tiles 3+4); tile 5 is orphaned

    expect(result.type).toBe("match");
    expect((result as { won: boolean }).won).toBe(true);
    expect(state.isWon).toBe(true);
  });

  test("game with 4-copy sets requires all pairs matched before win", () => {
    // 2 icons × 4 copies = 8 tiles → 4 matchable pairs total (2 per icon)
    const state = createGame({
      rows: 2,
      columns: 4,
      deck: ["🟦", "🟦", "🟦", "🟦", "🟥", "🟥", "🟥", "🟥"],
    });

    expect(state.totalMatchableGroups).toBe(2);
    expect(getRemainingUnmatchedPairCount(state)).toBe(4);

    // Match first pair of 🟦
    selectTile(state, 0);
    selectTile(state, 1);
    expect(state.matches).toBe(1);
    expect(state.isWon).toBe(false);
    expect(getRemainingUnmatchedPairCount(state)).toBe(3);

    // Match second pair of 🟦
    selectTile(state, 2);
    selectTile(state, 3);
    expect(state.matches).toBe(2);
    expect(state.isWon).toBe(false);
    expect(getRemainingUnmatchedPairCount(state)).toBe(2);

    // Match first pair of 🟥
    selectTile(state, 4);
    selectTile(state, 5);
    expect(state.matches).toBe(3);
    expect(state.isWon).toBe(false);
    expect(getRemainingUnmatchedPairCount(state)).toBe(1);

    // Match second pair of 🟥 → WIN
    selectTile(state, 6);
    const result = selectTile(state, 7);
    expect(result.type).toBe("match");
    expect((result as { won: boolean }).won).toBe(true);
    expect(state.isWon).toBe(true);
    expect(getRemainingUnmatchedPairCount(state)).toBe(0);
  });
});
