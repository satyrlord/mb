import { describe, expect, test, vi } from "vitest";

import {
  BLOCKED_TILE_TOKEN,
  createGame,
  prepareNearWinState,
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
});

describe("selectTile", () => {
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
