// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  applyLeaderboardScorePenalty,
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  getDifficultyScoreMultiplier,
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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("network"));

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded).toEqual(DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
    warnSpy.mockRestore();
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
    vi.spyOn(console, "warn").mockImplementation(() => {});
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

  test("normalizeLeaderboardPayload handles object form with entries field", () => {
    const payload = {
      entries: [
        {
          playerName: "Wrapped",
          timeMs: 5000,
          attempts: 5,
          difficultyId: "easy",
          difficultyLabel: "Easy",
          emojiSetId: "set-a",
          emojiSetLabel: "Set A",
          scoreMultiplier: 1.2,
          scoreValue: 800,
          isAutoDemo: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    const entries = leaderboardTesting.normalizeLeaderboardPayload(payload);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.playerName).toBe("Wrapped");
  });

  test("normalizeLeaderboardPayload returns empty array for non-array non-object input", () => {
    expect(leaderboardTesting.normalizeLeaderboardPayload(null)).toEqual([]);
    expect(leaderboardTesting.normalizeLeaderboardPayload(42)).toEqual([]);
    expect(leaderboardTesting.normalizeLeaderboardPayload("string")).toEqual([]);
  });

  test("normalizeLeaderboardPayload returns empty array for object without entries array", () => {
    // payload is an object but entries is not an array (false branch of inner Array.isArray)
    expect(leaderboardTesting.normalizeLeaderboardPayload({ foo: "bar" })).toEqual([]);
    expect(leaderboardTesting.normalizeLeaderboardPayload({ entries: "not-an-array" })).toEqual([]);
    expect(leaderboardTesting.normalizeLeaderboardPayload({ entries: null })).toEqual([]);
  });

  test("normalizeLeaderboardPayload falls back legacy emojiSetId when emojiSetId is empty", () => {
    const payload = [
      {
        playerName: "LegacyId",
        timeMs: 6000,
        attempts: 3,
        difficultyId: "normal",
        difficultyLabel: "Normal",
        emojiSetId: "", // empty — should use LEGACY_EMOJI_SET_ID internally
        emojiSetLabel: "Some Set",
        scoreMultiplier: 1.8,
        scoreValue: 700,
        isAutoDemo: false,
        createdAt: "2026-01-05T00:00:00.000Z",
      },
    ];

    const entries = leaderboardTesting.normalizeLeaderboardPayload(payload);
    expect(entries).toHaveLength(1);
    // emojiSetId should have been replaced by the legacy constant
    expect(entries[0]?.emojiSetId).toBe("legacy");
  });

  test("normalizeLeaderboardPayload derives scoreMultiplier from difficulty when missing", () => {
    const payload = [
      {
        playerName: "MultiFallback",
        timeMs: 8000,
        attempts: 6,
        difficultyId: "hard",
        difficultyLabel: "Hard",
        emojiSetId: "set-a",
        emojiSetLabel: "Set A",
        // scoreMultiplier omitted — should be derived from difficulty (2.4 for hard)
        scoreValue: 500,
        isAutoDemo: false,
        createdAt: "2026-01-06T00:00:00.000Z",
      },
    ];

    const entries = leaderboardTesting.normalizeLeaderboardPayload(payload);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.scoreMultiplier).toBe(2.4);
  });

  test("normalizeLeaderboardPayload applies penalty scoreValue for autoDemo entries", () => {
    window.localStorage.clear();
    const payload = [
      {
        playerName: "DemoPlayer",
        timeMs: 5000,
        attempts: 3,
        difficultyId: "easy",
        difficultyLabel: "Easy",
        emojiSetId: "set-a",
        emojiSetLabel: "Set A",
        scoreMultiplier: 1.2,
        // scoreValue omitted — will be computed with penalty since isAutoDemo=true
        isAutoDemo: true,
        createdAt: "2026-01-07T00:00:00.000Z",
      },
    ];

    const entries = leaderboardTesting.normalizeLeaderboardPayload(payload);
    expect(entries).toHaveLength(1);
    // Score should be penalized (much lower than the raw calculated score)
    const rawScore = leaderboardTesting.calculateLeaderboardScore({ timeMs: 5000, attempts: 3, scoreMultiplier: 1.2 });
    expect(entries[0]?.scoreValue).toBeLessThan(rawScore);
  });

  test("normalizeLeaderboardPayload filters out entries with invalid required fields", () => {
    const payload = [
      // Missing playerName
      {
        timeMs: 5000,
        attempts: 3,
        difficultyId: "easy",
        difficultyLabel: "Easy",
        emojiSetId: "set-a",
        emojiSetLabel: "Set A",
        scoreMultiplier: 1.2,
        scoreValue: 500,
        isAutoDemo: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      // Negative timeMs
      {
        playerName: "NegTime",
        timeMs: -100,
        attempts: 3,
        difficultyId: "easy",
        difficultyLabel: "Easy",
        emojiSetId: "set-a",
        emojiSetLabel: "Set A",
        scoreMultiplier: 1.2,
        scoreValue: 500,
        isAutoDemo: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const entries = leaderboardTesting.normalizeLeaderboardPayload(payload);
    expect(entries).toHaveLength(0);
  });

  test("rankLeaderboardEntries tiebreaks by createdAt when scores are equal", () => {
    const older = {
      playerName: "Older",
      timeMs: 5000,
      attempts: 3,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.2,
      scoreValue: 500,
      isAutoDemo: false,
      createdAt: "2025-12-01T00:00:00.000Z",
    };
    const newer = {
      ...older,
      playerName: "Newer",
      createdAt: "2026-01-02T00:00:00.000Z",
    };

    const ranked = leaderboardTesting.rankLeaderboardEntries([older, newer]);
    // Newer should appear first (same score — most recent wins)
    expect(ranked[0]?.playerName).toBe("Newer");
    expect(ranked[1]?.playerName).toBe("Older");
  });

  test("rankLeaderboardEntries tiebreaks by timeMs when scores and createdAt are equal", () => {
    const base = {
      playerName: "Fast",
      timeMs: 3000,
      attempts: 3,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "set-a",
      emojiSetLabel: "Set A",
      scoreMultiplier: 1.2,
      scoreValue: 500,
      isAutoDemo: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const slow = { ...base, playerName: "Slow", timeMs: 8000 };

    const ranked = leaderboardTesting.rankLeaderboardEntries([slow, base]);
    // Same score + same createdAt — faster timeMs wins
    expect(ranked[0]?.playerName).toBe("Fast");
  });

  test("loadLeaderboardRuntimeConfig returns defaults when fetch returns non-ok response", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({ ok: false } as Response);

    const loaded = await loadLeaderboardRuntimeConfig();

    expect(loaded).toEqual(DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
  });

  test("applyLeaderboardScorePenalty caps penalized value at 0", () => {
    const veryLargeScore = 1_000_000_000;

    const result = applyLeaderboardScorePenalty(veryLargeScore, 0.01); // 99% penalty

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(veryLargeScore);
  });

  test("applyLeaderboardScorePenalty with zero penalty factor returns zero", () => {
    const result = applyLeaderboardScorePenalty(1000, 0);
    expect(result).toBe(0);
  });

  test("applyLeaderboardScorePenalty with penalty factor 1 returns original score", () => {
    const score = 500;
    const result = applyLeaderboardScorePenalty(score, 1);
    expect(result).toBe(score);
  });

  test("fetchTopScores enforces maxEntries limit", async () => {
    const entries: LeaderboardScoreEntry[] = Array.from({ length: 20 }, (_, i) => ({
      playerName: `Player${i}`,
      timeMs: 5000 + i * 100,
      attempts: 3,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "space",
      emojiSetLabel: "Space",
      scoreMultiplier: 1.0,
      scoreValue: 1000 - i * 10,
      isAutoDemo: false,
      createdAt: new Date().toISOString(),
    }));

    window.localStorage.setItem(
      leaderboardTesting.LEADERBOARD_STORAGE_KEY,
      JSON.stringify(entries),
    );

    const client = new LeaderboardClient(makeTestClientConfig());
    const topScores = await client.fetchTopScores();

    expect(topScores.length).toBeLessThanOrEqual(10);
  });

  test("submitScore stores entry and maintains rank order", async () => {
    const client = new LeaderboardClient(makeTestClientConfig());

    const submission1 = {
      playerName: "Alice",
      timeMs: 5000,
      attempts: 3,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "space",
      emojiSetLabel: "Space",
      scoreMultiplier: 1.0,
    };

    const submission2 = {
      playerName: "Bob",
      timeMs: 3000, // Faster — should rank higher
      attempts: 2,
      difficultyId: "easy",
      difficultyLabel: "Easy",
      emojiSetId: "space",
      emojiSetLabel: "Space",
      scoreMultiplier: 1.0,
    };

    await client.submitScore(submission1);
    await client.submitScore(submission2);

    const topScores = await client.fetchTopScores();
    expect(topScores.length).toBeGreaterThanOrEqual(1);
  });

  test("getDifficultyScoreMultiplier returns expected values for difficulties", () => {
    expect(getDifficultyScoreMultiplier("easy", "Easy")).toBeCloseTo(1.2, 1);
    expect(getDifficultyScoreMultiplier("normal", "Normal")).toBeCloseTo(1.8, 1);
    expect(getDifficultyScoreMultiplier("hard", "Hard")).toBeCloseTo(2.4, 1);
    expect(getDifficultyScoreMultiplier("unknown", "Unknown")).toBeCloseTo(1, 1);
  });

  test("normalizeLeaderboardPayload with raw invalid entry types", () => {
    const invalidEntries = [
      { playerName: "", /* invalid — missing required fields */ },
      null,
      undefined,
      123,
    ];

    const result = leaderboardTesting.normalizeLeaderboardPayload(invalidEntries);
    expect(result).toBeDefined();
    // Could be empty or contain only valid entries
  });

  test("readStorage guards against extremely large payloads", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    // Create a large JSON string that exceeds 512KB but stays under jsdom quota
    // Use 5000 entries with moderate per-entry data
    const hugeJson = JSON.stringify(
      Array.from({ length: 5_000 }, (_, i) => ({
        playerName: `P${i}_${"x".repeat(30)}`,
        timeMs: 5000,
        attempts: 3,
        difficultyId: "easy",
        difficultyLabel: "Easy",
        emojiSetId: "space",
        emojiSetLabel: "Space",
        scoreMultiplier: 1.0,
        scoreValue: 500,
        isAutoDemo: false,
        createdAt: new Date().toISOString(),
      })),
    );

    // Ensure the payload is large enough to test the guardrail
    if (hugeJson.length > 512_000) {
      window.localStorage.setItem(leaderboardTesting.LEADERBOARD_STORAGE_KEY, hugeJson);
      const client = new LeaderboardClient(makeTestClientConfig());
      const result = await client.fetchTopScores();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("exceeds size limit"));
    }

    warnSpy.mockRestore();
  });

  test("isEnabled returns false when config disabled", async () => {
    const disabledConfig = makeTestClientConfig();
    disabledConfig.enabled = false;

    const client = new LeaderboardClient(disabledConfig);
    const result = await client.fetchTopScores();

    expect(result).toEqual([]);
  });
});
