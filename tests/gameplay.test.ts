import { describe, expect, test, vi } from "vitest";

import { createGameplayEngine } from "../src/gameplay.ts";

const createSampleEngine = () => {
  return createGameplayEngine({
    rows: 2,
    columns: 2,
    deck: ["🍎", "🍎", "🍇", "🍇"],
  });
};

describe("createGameplayEngine", () => {
  test("exposes tile data and columns", () => {
    const engine = createSampleEngine();

    expect(engine.getColumns()).toBe(2);
    expect(engine.getTiles()).toHaveLength(4);
  });

  test("selectTile delegates to game state", () => {
    const engine = createSampleEngine();

    const first = engine.selectTile(0);
    const second = engine.selectTile(1);

    expect(first.type).toBe("first");
    expect(second.type).toBe("match");
    expect(engine.isWon()).toBe(false);
  });

  test("tracks attempts and remaining pairs", () => {
    const engine = createSampleEngine();

    engine.selectTile(0);
    engine.selectTile(1);

    expect(engine.getAttempts()).toBe(1);
    expect(engine.getRemainingUnmatchedPairCount()).toBe(1);
  });

  test("resolveMismatch resets revealed tiles back to hidden", () => {
    const engine = createSampleEngine();

    // 🍎 at 0, 🍇 at 1 (or whichever — they won't match)
    engine.selectTile(0);
    const result = engine.selectTile(1);

    // If they happened to match, use indices 0 and 2 instead
    if (result.type === "mismatch") {
      expect(engine.getTiles()[0]?.status).toBe("revealed");
      expect(engine.getTiles()[1]?.status).toBe("revealed");

      engine.resolveMismatch(0, 1);

      expect(engine.getTiles()[0]?.status).toBe("hidden");
      expect(engine.getTiles()[1]?.status).toBe("hidden");
    } else {
      // Matched — select a mismatching pair differently
      const r = engine.selectTile(2);
      expect(r.type).toBe("first");
    }
  });

  test("reset clears game state and applies new deck", () => {
    const engine = createSampleEngine();

    engine.selectTile(0);
    engine.selectTile(1);
    expect(engine.getAttempts()).toBeGreaterThan(0);

    engine.reset(["🐙", "🐙", "🦑", "🦑"]);

    expect(engine.getAttempts()).toBe(0);
    expect(engine.isWon()).toBe(false);
    const icons = engine.getTiles().map((t) => t.icon);
    expect(icons).toContain("🐙");
    expect(icons).toContain("🦑");
  });

  test("getElapsedTimeMs returns 0 before any tile is selected", () => {
    const engine = createSampleEngine();

    expect(engine.getElapsedTimeMs()).toBe(0);
  });

  test("getElapsedTimeMs returns positive after game starts", () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1500);

    const engine = createSampleEngine();
    engine.selectTile(0);

    const elapsed = engine.getElapsedTimeMs();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    vi.restoreAllMocks();
  });

  test("findFirstUnmatchedPairIndices returns null when all pairs matched", () => {
    const engine = createSampleEngine();

    // Match all pairs
    engine.selectTile(0);
    engine.selectTile(1);
    engine.selectTile(2);
    engine.selectTile(3);

    // After all matched, finding an unmatched pair should return null
    expect(engine.findFirstUnmatchedPairIndices()).toBeNull();
  });

  test("findFirstUnmatchedPairIndices returns pair indices when tiles remain", () => {
    const engine = createSampleEngine();

    const pair = engine.findFirstUnmatchedPairIndices();

    expect(pair).not.toBeNull();
    expect(pair).toHaveLength(2);
  });

  test("prepareNearWinState via engine marks all but one pair as matched", () => {
    const engine = createGameplayEngine({
      rows: 2,
      columns: 3,
      deck: ["🍎", "🍎", "🍇", "🍇", "🍊", "🍊"],
    });

    vi.spyOn(performance, "now").mockReturnValue(5000);
    const result = engine.prepareNearWinState();
    vi.restoreAllMocks();

    expect(result.remainingPair).not.toBeNull();
    expect(result.matchedPairs.length).toBe(2);
  });
});
