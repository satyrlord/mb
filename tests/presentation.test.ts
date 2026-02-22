import { describe, expect, test } from "vitest";

import { createGamePresentationModel } from "../src/presentation.ts";
import type { GameplayEngine } from "../src/gameplay.ts";

describe("createGamePresentationModel", () => {
  test("maps gameplay state into board model and HUD values", () => {
    const gameplay: GameplayEngine = {
      state: {} as GameplayEngine["state"],
      selectTile: () => ({ type: "ignored" }),
      resolveMismatch: () => {},
      reset: () => {},
      getElapsedTimeMs: () => 125000,
      getTiles: () => [
        { id: 0, pairId: 1, icon: "🧠", status: "revealed" },
        { id: 1, pairId: 1, icon: "🧠", status: "matched" },
      ],
      getColumns: () => 8,
      getAttempts: () => 7,
      isWon: () => false,
      findFirstUnmatchedPairIndices: () => null,
      getRemainingUnmatchedPairCount: () => 0,
      prepareNearWinState: () => ({ remainingPair: null, matchedPairs: [] }),
    };

    const model = createGamePresentationModel(gameplay);

    expect(model.columns).toBe(8);
    expect(model.attempts).toBe(7);
    expect(model.elapsedTime).toBe("02:05");
    expect(model.boardTiles).toEqual([
      { icon: "🧠", status: "revealed" },
      { icon: "🧠", status: "matched" },
    ]);
  });
});
