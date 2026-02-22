// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  LeaderboardClient,
  leaderboardTesting,
  loadLeaderboardRuntimeConfig,
} from "../src/leaderboard.ts";
import { createMockTextResponse } from "./test-helpers.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("leaderboard runtime config", () => {
  test("loadLeaderboardRuntimeConfig parses valid config values", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "leaderboard.enabled=true",
        "leaderboard.endpointUrl=https://example.com/leaderboard",
        "leaderboard.autoEndpointPort=9999",
        "leaderboard.apiKey=test-key",
        "leaderboard.maxEntries=15",
        "leaderboard.timeoutMs=2300",
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
      endpointUrl: "https://example.com/leaderboard",
      autoEndpointPort: 9999,
      apiKey: "test-key",
      maxEntries: 15,
      timeoutMs: 2300,
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

  test("normalizeLeaderboardEndpointUrl resolves auto endpoint", () => {
    expect(leaderboardTesting.normalizeLeaderboardEndpointUrl(""))
      .toBe("");
    expect(leaderboardTesting.normalizeLeaderboardEndpointUrl("https://example.com/leaderboard"))
      .toBe("https://example.com/leaderboard");
    expect(leaderboardTesting.normalizeLeaderboardEndpointUrl("auto", 8787))
      .toBe("http://localhost:8787/leaderboard");
    expect(leaderboardTesting.normalizeLeaderboardEndpointUrl("auto", 9999))
      .toBe("http://localhost:9999/leaderboard");
  });

  test("isLocalHost matches localhost and loopback hostnames", () => {
    expect(leaderboardTesting.isLocalHost("localhost")).toBe(true);
    expect(leaderboardTesting.isLocalHost("127.0.0.1")).toBe(true);
    expect(leaderboardTesting.isLocalHost(" LOCALHOST ")).toBe(true);
    expect(leaderboardTesting.isLocalHost("example.com")).toBe(false);
  });

  test("getLeaderboardEndpointCandidates falls back to :80 for http endpoints without a port", () => {
    const candidates = leaderboardTesting.getLeaderboardEndpointCandidates({
      ...DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
      enabled: true,
      endpointUrl: "http://example.com/leaderboard",
    });

    expect(candidates).toEqual([
      "http://example.com/leaderboard",
      "http://example.com:80/leaderboard",
      "http://localhost:80/leaderboard",
      "http://127.0.0.1:80/leaderboard",
    ]);
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
  overrides: Partial<{ enabled: boolean; endpointUrl: string; apiKey: string | null; maxEntries: number; timeoutMs: number }> = {},
) => ({
  ...DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  enabled: true,
  endpointUrl: "https://example.com/leaderboard",
  apiKey: null as string | null,
  maxEntries: 10,
  timeoutMs: 500,
  ...overrides,
});

describe("leaderboard client", () => {
  test("fetchTopScores sorts by highest score, then recency", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          playerName: "EasyFast",
          timeMs: 8500,
          attempts: 8,
          difficultyId: "easy",
          difficultyLabel: "Easy",
          emojiSetId: "space-astronomy",
          emojiSetLabel: "Space Astronomy",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
        {
          playerName: "HardRun",
          timeMs: 12000,
          attempts: 10,
          difficultyId: "hard",
          difficultyLabel: "Hard",
          emojiSetId: "space-astronomy",
          emojiSetLabel: "Space Astronomy",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          playerName: "DebugRun",
          timeMs: 3000,
          attempts: 1,
          difficultyId: "debug",
          difficultyLabel: "Debug",
          emojiSetId: "space-astronomy",
          emojiSetLabel: "Space Astronomy",
          createdAt: "2026-01-03T00:00:00.000Z",
        },
      ]),
    } as Response);

    const client = new LeaderboardClient(makeTestClientConfig());

    const entries = await client.fetchTopScores();
    const expectedDebugScore = leaderboardTesting.applyLeaderboardScorePenalty(
      leaderboardTesting.calculateLeaderboardScore({
        timeMs: 3000,
        attempts: 1,
        scoreMultiplier: 1,
      }),
    );

    expect(entries[0]?.playerName).toBe("HardRun");
    expect(entries[1]?.playerName).toBe("EasyFast");
    expect(entries[2]?.playerName).toBe("DebugRun");
    expect(entries[2]?.scoreValue).toBe(expectedDebugScore);
  });

  test("fetchTopScores falls back to legacy emoji set label when label is missing", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          playerName: "PackFallback",
          timeMs: 7000,
          attempts: 7,
          difficultyId: "normal",
          difficultyLabel: "Normal",
          emojiSetId: "religious-symbols",
          createdAt: "2026-01-04T00:00:00.000Z",
        },
      ]),
    } as Response);

    const client = new LeaderboardClient(makeTestClientConfig());

    const entries = await client.fetchTopScores();

    expect(entries[0]?.emojiSetLabel).toBe("Legacy Set");
  });

  test("fetchTopScores handles { entries: [...] } wrapped response format", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            playerName: "WrappedPlayer",
            timeMs: 9000,
            attempts: 9,
            difficultyId: "normal",
            difficultyLabel: "Normal",
            emojiSetId: "space-astronomy",
            emojiSetLabel: "Space Astronomy",
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      }),
    } as Response);

    const client = new LeaderboardClient(makeTestClientConfig());

    const entries = await client.fetchTopScores();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.playerName).toBe("WrappedPlayer");
    expect(entries[0]?.difficultyId).toBe("normal");
  });

  test("fetchTopScores keeps legacy entries when emoji set fields are missing", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          playerName: "LegacyDemo",
          timeMs: 12000,
          attempts: 10,
          difficultyId: "debug",
          difficultyLabel: "Debug",
          scoreMultiplier: 0.2,
          scoreValue: 3,
          createdAt: "2026-01-05T00:00:00.000Z",
        },
      ]),
    } as Response);

    const client = new LeaderboardClient(makeTestClientConfig());

    const entries = await client.fetchTopScores();

    expect(entries[0]?.playerName).toBe("LegacyDemo");
    expect(entries[0]?.emojiSetId).toBe("legacy");
    expect(entries[0]?.emojiSetLabel).toBe("Legacy Set");
  });

  test("submitScore posts normalized score payload", async () => {
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue({ ok: true } as Response);

    const client = new LeaderboardClient(makeTestClientConfig({ apiKey: "key-1" }));

    await client.submitScore({
      playerName: "  Alice  ",
      timeMs: 10456.9,
      attempts: 18.2,
      difficultyId: "debug",
      difficultyLabel: "Debug",
      emojiSetId: "space-astronomy",
      emojiSetLabel: "Space Astronomy",
      scoreMultiplier: 0,
      scoreValue: 0,
      isAutoDemo: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0] ?? [];
    const request = options as RequestInit;
    expect(request.method).toBe("POST");

    const body = JSON.parse(typeof request.body === "string" ? request.body : "{}");
    expect(body).toEqual({
      playerName: "Alice",
      timeMs: 10457,
      attempts: 18,
      difficultyId: "debug",
      difficultyLabel: "Debug",
      emojiSetId: "space-astronomy",
      emojiSetLabel: "Space Astronomy",
      scoreMultiplier: 0,
      scoreValue: 0,
      isAutoDemo: true,
    });
  });
});
