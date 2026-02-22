// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  LeaderboardClient,
  leaderboardTesting,
  loadLeaderboardRuntimeConfig,
} from "../src/leaderboard.ts";
import { createMockTextResponse } from "./test-helpers.ts";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("leaderboard runtime config", () => {
  test("loadLeaderboardRuntimeConfig parses valid config values", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "leaderboard.enabled=true",
        "leaderboard.maxEntries=15",
        "leaderboard.scorePenaltyFactor=0.2",
        "leaderboard.attemptsPenaltyMs=900",
        "leaderboard.baseScoreDividend=1200000",
        "leaderboard.scoreScaleFactor=800",
        "leaderboard.debugScoreExtraReductionFactor=0.09",
        "leaderboard.debugWinModeReductionFactor=0.45",
        "leaderboard.debugTilesModeReductionFactor=0.25",
      ].join("\n")),
    );

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded).toEqual({
      enabled: true,
      maxEntries: 15,
      scoring: {
        scorePenaltyFactor: 0.2,
        attemptsPenaltyMs: 900,
        baseScoreDividend: 1200000,
        scoreScaleFactor: 800,
        debugScoreExtraReductionFactor: 0.09,
        debugWinModeReductionFactor: 0.45,
        debugTilesModeReductionFactor: 0.25,
      },
    });
  });

  test("loadLeaderboardRuntimeConfig clamps scorePenaltyFactor to 0..1", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse("leaderboard.scorePenaltyFactor=1.5"),
    );

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded.scoring.scorePenaltyFactor).toBe(1);
  });

  test("loadLeaderboardRuntimeConfig clamps debug reduction factors to 0..1", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "leaderboard.debugScoreExtraReductionFactor=-0.2",
        "leaderboard.debugWinModeReductionFactor=1.7",
        "leaderboard.debugTilesModeReductionFactor=0.35",
      ].join("\n")),
    );

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded.scoring.debugScoreExtraReductionFactor).toBe(0);
    expect(loaded.scoring.debugWinModeReductionFactor).toBe(1);
    expect(loaded.scoring.debugTilesModeReductionFactor).toBe(0.35);
  });

  test("loadLeaderboardRuntimeConfig falls back to defaults when fetch fails", async () => {
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("network"));

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded).toEqual(DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
  });

  test("parseCfgBoolean accepts only true and false", () => {
    expect(leaderboardTesting.parseCfgBoolean("true")).toBe(true);
    expect(leaderboardTesting.parseCfgBoolean(" FALSE ")).toBe(false);
    expect(leaderboardTesting.parseCfgBoolean("yes")).toBeNull();
  });

  test("difficulty multipliers are mapped by level", () => {
    expect(leaderboardTesting.getDifficultyScoreMultiplier("easy", "Easy")).toBe(1.2);
    expect(leaderboardTesting.getDifficultyScoreMultiplier("normal", "Normal")).toBe(1.8);
    expect(leaderboardTesting.getDifficultyScoreMultiplier("hard", "Hard")).toBe(2.4);
    expect(leaderboardTesting.getDifficultyScoreMultiplier("debug", "Debug")).toBe(1);
  });

  test("applyLeaderboardScorePenalty applies a 10% score retention (90% penalty)", () => {
    expect(leaderboardTesting.applyLeaderboardScorePenalty(500)).toBe(50);
    expect(leaderboardTesting.applyLeaderboardScorePenalty(49)).toBe(5);
    expect(leaderboardTesting.applyLeaderboardScorePenalty(0)).toBe(0);
  });
});

const makeTestClientConfig = (
  overrides: Partial<{ enabled: boolean; maxEntries: number }> = {},
) => ({
  ...DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  enabled: true,
  maxEntries: 10,
  ...overrides,
});

describe("leaderboard client (localStorage)", () => {
  test("fetchTopScores returns empty array when storage is empty", async () => {
    const client = new LeaderboardClient(makeTestClientConfig());
    const entries = await client.fetchTopScores();
    expect(entries).toEqual([]);
  });

  test("fetchTopScores returns empty array when disabled", async () => {
    const client = new LeaderboardClient(makeTestClientConfig({ enabled: false }));
    await client.submitScore({
      playerName: "Alice",
      timeMs: 5000,
      attempts: 5,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.2,
      scoreValue: 1000,
    });
    // Even if somehow storage was written, fetch should return empty
    const entries = await client.fetchTopScores();
    expect(entries).toEqual([]);
  });

  test("submitScore writes score to localStorage and fetchTopScores reads it back", async () => {
    const client = new LeaderboardClient(makeTestClientConfig());

    await client.submitScore({
      playerName: "  Alice  ",
      timeMs: 10456.9,
      attempts: 18.2,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "space-astronomy",
      emojiSetLabel: "Space Astronomy",
      scoreMultiplier: 1.2,
      scoreValue: 1234,
    });

    const entries = await client.fetchTopScores();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.playerName).toBe("Alice");
    expect(entries[0]?.timeMs).toBe(10457);
    expect(entries[0]?.attempts).toBe(18);
    expect(entries[0]?.scoreValue).toBe(1234);
    expect(entries[0]?.emojiSetLabel).toBe("Space Astronomy");
  });

  test("submitScore does nothing when disabled", async () => {
    const client = new LeaderboardClient(makeTestClientConfig({ enabled: false }));

    await client.submitScore({
      playerName: "Bob",
      timeMs: 5000,
      attempts: 5,
      difficultyId: "normal",
      difficultyLabel: "Normal",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.8,
      scoreValue: 500,
    });

    expect(window.localStorage.getItem(leaderboardTesting.LEADERBOARD_STORAGE_KEY)).toBeNull();
  });

  test("fetchTopScores sorts by highest score then recency", async () => {
    const client = new LeaderboardClient(makeTestClientConfig());

    await client.submitScore({
      playerName: "EasyFast",
      timeMs: 8500,
      attempts: 8,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.2,
      scoreValue: leaderboardTesting.calculateLeaderboardScore({ timeMs: 8500, attempts: 8, scoreMultiplier: 1.2 }),
      createdAt: "2026-01-02T00:00:00.000Z",
    } as never);

    await client.submitScore({
      playerName: "HardRun",
      timeMs: 12000,
      attempts: 10,
      difficultyId: "hard",
      difficultyLabel: "Hard",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 2.4,
      scoreValue: leaderboardTesting.calculateLeaderboardScore({ timeMs: 12000, attempts: 10, scoreMultiplier: 2.4 }),
    });

    const entries = await client.fetchTopScores();

    expect(entries[0]?.playerName).toBe("HardRun");
    expect(entries[1]?.playerName).toBe("EasyFast");
  });

  test("fetchTopScores respects maxEntries cap", async () => {
    const client = new LeaderboardClient(makeTestClientConfig({ maxEntries: 2 }));

    for (let i = 0; i < 5; i++) {
      await client.submitScore({
        playerName: `Player${i}`,
        timeMs: 5000 + i * 1000,
        attempts: 5,
        difficultyId: "easy",
        difficultyLabel: "Easy",
        emojiSetId: "set-a",
        emojiSetLabel: "Set A",
        scoreMultiplier: 1.2,
        scoreValue: 1000 - i * 100,
      });
    }

    const entries = await client.fetchTopScores();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.scoreValue).toBe(1000);
  });

  test("fetchTopScores recovers gracefully from corrupted localStorage", async () => {
    window.localStorage.setItem(leaderboardTesting.LEADERBOARD_STORAGE_KEY, "not-valid-json{");
    const client = new LeaderboardClient(makeTestClientConfig());
    const entries = await client.fetchTopScores();
    expect(entries).toEqual([]);
  });

  test("fetchTopScores falls back to legacy emoji set label when label is missing", async () => {
    window.localStorage.setItem(
      leaderboardTesting.LEADERBOARD_STORAGE_KEY,
      JSON.stringify([{
        playerName: "PackFallback",
        timeMs: 7000,
        attempts: 7,
        difficultyId: "normal",
        difficultyLabel: "Normal",
        emojiSetId: "religious-symbols",
        emojiSetLabel: "",
        scoreMultiplier: 1.8,
        scoreValue: 500,
        isAutoDemo: false,
        createdAt: "2026-01-04T00:00:00.000Z",
      }]),
    );

    const client = new LeaderboardClient(makeTestClientConfig());
    const entries = await client.fetchTopScores();

    expect(entries[0]?.emojiSetLabel).toBe("Legacy Set");
  });

  test("submitScore sets isAutoDemo=false when not provided", async () => {
    const client = new LeaderboardClient(makeTestClientConfig());

    await client.submitScore({
      playerName: "Auto",
      timeMs: 3000,
      attempts: 1,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.2,
      scoreValue: 2000,
    });

    const entries = await client.fetchTopScores();
    expect(entries[0]?.isAutoDemo).toBe(false);
  });
});
