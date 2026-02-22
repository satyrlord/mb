// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_UI_RUNTIME_CONFIG,
  DEFAULT_WIN_FX_RUNTIME_CONFIG,
  loadUiRuntimeConfig,
  loadWinFxRuntimeConfig,
  runtimeConfigTesting,
} from "../src/runtime-config.ts";
import { createMockTextResponse } from "./test-helpers.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runtimeConfigTesting", () => {
  test("parseCfgLines keeps valid entries and ignores comments/invalid lines", () => {
    const content = `
      # comment
      animation.defaultSpeed=1.25
      invalid line
      winFx.durationMs = 5000
      key-with-empty=
    `;

    const parsed = runtimeConfigTesting.parseCfgLines(content);

    expect(parsed.get("animation.defaultSpeed")).toBe("1.25");
    expect(parsed.get("winFx.durationMs")).toBe("5000");
    expect(parsed.get("key-with-empty")).toBe("");
    expect(parsed.has("invalid line")).toBe(false);
  });

  test("parseCfgNumber and parseCfgInteger handle invalid values", () => {
    expect(runtimeConfigTesting.parseCfgNumber(" 2.5 ")).toBe(2.5);
    expect(runtimeConfigTesting.parseCfgNumber("NaN")).toBeNull();
    expect(runtimeConfigTesting.parseCfgInteger(" 42 ")).toBe(42);
    expect(runtimeConfigTesting.parseCfgInteger("not-int")).toBeNull();
  });

  test("parseCfgList trims and drops empty values", () => {
    expect(runtimeConfigTesting.parseCfgList("a, b, , c ,, d")).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  test("parseCfgList returns an empty array for all-commas input", () => {
    expect(runtimeConfigTesting.parseCfgList(",,,")).toEqual([]);
  });

  test("parseCfgList returns an empty array for whitespace-only input", () => {
    expect(runtimeConfigTesting.parseCfgList("   ")).toEqual([]);
  });

  test("parseCfgList returns an empty array for commas-and-whitespace-only input", () => {
    expect(runtimeConfigTesting.parseCfgList(", ,  , ")).toEqual([]);
  });

  test("parseEmojiPackParityMode accepts valid values", () => {
    expect(runtimeConfigTesting.parseEmojiPackParityMode("warn")).toBe("warn");
    expect(runtimeConfigTesting.parseEmojiPackParityMode(" ERROR ")).toBe("error");
    expect(runtimeConfigTesting.parseEmojiPackParityMode("strict")).toBeNull();
  });

  test("parseCfgLines preserves values with multiple equals signs", () => {
    const content = "token=part1=part2=part3";

    const parsed = runtimeConfigTesting.parseCfgLines(content);

    expect(parsed.get("token")).toBe("part1=part2=part3");
  });

  test("parseCfgLines ignores entries whose keys are only whitespace", () => {
    const content = "   =value\nvalid.key=42";

    const parsed = runtimeConfigTesting.parseCfgLines(content);

    expect(parsed.has("")).toBe(false);
    expect(parsed.get("valid.key")).toBe("42");
  });

  test("parseCfgLines supports Windows-style CRLF line endings", () => {
    const content = "alpha=1\r\nbeta=2\r\n#comment\r\ngamma=3\r\n";

    const parsed = runtimeConfigTesting.parseCfgLines(content);

    expect(parsed.get("alpha")).toBe("1");
    expect(parsed.get("beta")).toBe("2");
    expect(parsed.get("gamma")).toBe("3");
  });

  test("parseCfgLines supports mixed LF and CRLF line endings", () => {
    const content = "alpha=1\n beta=2\r\n#comment\ngamma=3\r\n";

    const parsed = runtimeConfigTesting.parseCfgLines(content);

    expect(parsed.get("alpha")).toBe("1");
    expect(parsed.get("beta")).toBe("2");
    expect(parsed.get("gamma")).toBe("3");
  });
});

describe("runtime config loaders", () => {
  test("loadUiRuntimeConfig loads and parses fetched config", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "ui.fixedWindowAspectRatio=1.5",
        "ui.emojiPackParityMode=warn",
        "flags.twemojiCdnBaseUrl=https://example.com/twemoji/svg",
        "ui.tileGlobalOpacity=0.65",
        "ui.tileFrontOpacity=0.2",
        "ui.tileBackOpacity=0.35",
        "ui.appMaxWidthPx=1040",
        "ui.leaderboardVisibleRowCount=42",
        "ui.namePromptFadeOutMs=180",
        "board.minTileSizePx=46",
        "board.targetTileSizePx=90",
        "board.tileGapPx=12",
        "board.boardHorizontalPaddingPx=20",
        "window.baseMinWidthPx=900",
        "window.baseMinHeightPx=600",
        "window.defaultScale=1.2",
        "window.minScale=0.8",
        "window.maxScale=1.7",
        "window.viewportPaddingPx=20",
        "animation.defaultSpeed=1.4",
        "animation.minSpeed=0.5",
        "animation.maxSpeed=2.5",
        "animation.tileFlipDurationMs=620",
        "plasma.backgroundDriftDurationMs=15000",
        "plasma.hueCycleDurationMs=9200",
        "plasma.tileDriftDurationMs=78000",
        "plasma.tileIndexOffsetDelayMs=5300",
        "plasma.glowSweepDurationMs=11100",
        "plasma.flaresShiftDurationMs=6400",
        "plasma.glowOpacity=0.62",
        "plasma.flaresOpacity=0.28",
        "gameplay.mismatchDelayMs=750",
        "gameplay.reducedMotionMismatchExtraDelayMs=220",
        "gameplay.matchedDisappearPauseMs=1100",
        "gameplay.matchedDisappearDurationMs=540",
        "gameplay.reducedMotionMatchedDisappearDurationMs=380",
        "gameplay.winCanvasFadeDurationMs=700",
        "gameplay.autoMatchSecondSelectionDelayMs=520",
        "gameplay.autoMatchBootDelayMs=1080",
        "gameplay.autoMatchBetweenPairsDelayMs=980",
        "gameplay.uiTimerUpdateIntervalMs=300",
      ].join("\n")),
    );

    const loaded = await loadUiRuntimeConfig();

    expect(loaded.fixedWindowAspectRatio).toBe(1.5);
    expect(loaded.emojiPackParityMode).toBe("warn");
    expect(loaded.flagEmojiCdnBaseUrl).toBe("https://example.com/twemoji/svg");
    expect(loaded.tileGlobalOpacity).toBe(0.65);
    expect(loaded.tileFrontOpacity).toBe(0.2);
    expect(loaded.tileBackOpacity).toBe(0.35);
    expect(loaded.appMaxWidthPx).toBe(1040);
    expect(loaded.leaderboardVisibleRowCount).toBe(42);
    expect(loaded.namePromptFadeOutMs).toBe(180);
    expect(loaded.boardLayout).toEqual({
      minTileSizePx: 46,
      targetTileSizePx: 90,
      tileGapPx: 12,
      boardHorizontalPaddingPx: 20,
    });
    expect(loaded.windowBaseSize).toEqual({ minWidthPx: 900, minHeightPx: 600 });
    expect(loaded.windowResizeLimits).toEqual({
      defaultScale: 1.2,
      minScale: 0.8,
      maxScale: 1.7,
      viewportPaddingPx: 20,
    });
    expect(loaded.animationSpeed).toEqual({
      defaultSpeed: 1.4,
      minSpeed: 0.5,
      maxSpeed: 2.5,
    });
    expect(loaded.visualEffects).toEqual({
      tileFlipDurationMs: 620,
      plasmaBackgroundDriftDurationMs: 15000,
      plasmaHueCycleDurationMs: 9200,
      plasmaTileDriftDurationMs: 78000,
      plasmaTileIndexOffsetDelayMs: 5300,
      plasmaGlowSweepDurationMs: 11100,
      plasmaFlaresShiftDurationMs: 6400,
      plasmaGlowOpacity: 0.62,
      plasmaFlaresOpacity: 0.28,
    });
    expect(loaded.gameplayTiming).toEqual({
      mismatchDelayMs: 750,
      reducedMotionMismatchExtraDelayMs: 220,
      matchedDisappearPauseMs: 1100,
      matchedDisappearDurationMs: 540,
      reducedMotionMatchedDisappearDurationMs: 380,
      winCanvasFadeDurationMs: 700,
      autoMatchSecondSelectionDelayMs: 520,
      autoMatchBootDelayMs: 1080,
      autoMatchBetweenPairsDelayMs: 980,
      uiTimerUpdateIntervalMs: 300,
    });
  });

  test("loadUiRuntimeConfig falls back to defaults when fetch fails", async () => {
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("network"));

    const loaded = await loadUiRuntimeConfig();

    expect(loaded).toEqual(DEFAULT_UI_RUNTIME_CONFIG);
  });

  test("loadUiRuntimeConfig clamps ui.tileGlobalOpacity into 0..1", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse("ui.tileGlobalOpacity=1.4"),
    );

    const loaded = await loadUiRuntimeConfig();

    expect(loaded.tileGlobalOpacity).toBe(1);
  });

  test("loadUiRuntimeConfig falls back per-face opacity keys to ui.tileGlobalOpacity", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse("ui.tileGlobalOpacity=0.4"),
    );

    const loaded = await loadUiRuntimeConfig();

    expect(loaded.tileGlobalOpacity).toBe(0.4);
    expect(loaded.tileFrontOpacity).toBe(0.4);
    expect(loaded.tileBackOpacity).toBe(0.4);
  });

  test("loadUiRuntimeConfig clamps per-face opacity keys into 0..1", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "ui.tileGlobalOpacity=0.5",
        "ui.tileFrontOpacity=-0.2",
        "ui.tileBackOpacity=1.8",
      ].join("\n")),
    );

    const loaded = await loadUiRuntimeConfig();

    expect(loaded.tileFrontOpacity).toBe(0);
    expect(loaded.tileBackOpacity).toBe(1);
  });

  test("loadUiRuntimeConfig clamps plasma opacity keys into 0..1", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "plasma.glowOpacity=1.4",
        "plasma.flaresOpacity=-0.2",
      ].join("\n")),
    );

    const loaded = await loadUiRuntimeConfig();

    expect(loaded.visualEffects.plasmaGlowOpacity).toBe(1);
    expect(loaded.visualEffects.plasmaFlaresOpacity).toBe(0);
  });

  test("loadWinFxRuntimeConfig loads and parses fetched config", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "winFx.durationMs=1111",
        "winFx.maxTilePieces=7",
        "winFx.wavesPerTile=3",
        "winFx.waveDelayMs=9",
        "winFx.sparksPerTile=2",
        "winFx.particleDelayJitterMs=10",
        "winFx.centerFinaleDelayMs=11",
        "winFx.centerFinaleWaves=2",
        "winFx.centerFinaleWaveDelayMs=12",
        "winFx.centerFinaleCount=13",
        "winFx.confettiRainDelayMs=14",
        "winFx.confettiRainCount=15",
        "winFx.confettiRainSpreadMs=16",
        "winFx.colors=#010203,#111213",
        "winFx.textOptions=A,B",
        "winFx.rainColors=#abc,#def",
      ].join("\n")),
    );

    const loaded = await loadWinFxRuntimeConfig();

    expect(loaded.options.durationMs).toBe(1111);
    expect(loaded.options.maxTilePieces).toBe(7);
    expect(loaded.options.colors).toEqual(["#010203", "#111213"]);
    expect(loaded.textOptions).toEqual(["A", "B"]);
    expect(loaded.rainColors).toEqual(["#abc", "#def"]);
  });

  test("loadWinFxRuntimeConfig falls back to defaults on non-ok response", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({ ok: false } as Response);

    const loaded = await loadWinFxRuntimeConfig();

    expect(loaded).toEqual(DEFAULT_WIN_FX_RUNTIME_CONFIG);
  });
});
