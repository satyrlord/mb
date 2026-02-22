// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_SHADOW_CONFIG,
  loadShadowConfig,
  shadowConfigTesting,
  type ShadowConfig,
} from "../src/shadow-config.ts";
import { createMockTextResponse } from "./test-helpers.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shadowConfigTesting", () => {
  test("parseCfgNumber returns null for invalid numeric inputs", () => {
    expect(shadowConfigTesting.parseCfgNumber("0.5")).toBe(0.5);
    expect(shadowConfigTesting.parseCfgNumber("abc")).toBeNull();
  });

  test("applyShadowConfigValue updates all supported keys and ignores unknown keys", () => {
    const target: Partial<ShadowConfig> = {};

    shadowConfigTesting.applyShadowConfigValue(target, "leftOffsetPx", 1);
    shadowConfigTesting.applyShadowConfigValue(target, "leftBlurPx", 3);
    shadowConfigTesting.applyShadowConfigValue(target, "leftOpacity", 0.7);
    shadowConfigTesting.applyShadowConfigValue(target, "unknownKey", 99);

    expect(target.leftOffsetPx).toBe(1);
    expect(target.leftBlurPx).toBe(3);
    expect(target.leftOpacity).toBe(0.7);
    expect((target as Record<string, unknown>).unknownKey).toBeUndefined();
  });

  test("parseShadowConfig parses active preset and valid preset values", () => {
    const cfg = `
      activePreset=soft
      preset.soft.leftOffsetPx=1
      preset.soft.leftOpacity=0.75
      preset.soft.badValue=oops
    `;

    const parsed = shadowConfigTesting.parseShadowConfig(cfg);

    expect(parsed.activePreset).toBe("soft");
    expect(parsed.presets.get("soft")?.leftOffsetPx).toBe(1);
    expect(parsed.presets.get("soft")?.leftOpacity).toBe(0.75);
    expect(parsed.presets.get("soft")?.badValue).toBeUndefined();
  });

  test("parseShadowConfig ignores malformed numeric values in preset keys", () => {
    const cfg = `
      activePreset=soft
      preset.soft.leftOpacity=bad-number
      preset.soft.leftBlurPx=0.42
    `;

    const parsed = shadowConfigTesting.parseShadowConfig(cfg);
    const softPreset = parsed.presets.get("soft");

    expect(softPreset?.leftOpacity).toBeUndefined();
    expect(softPreset?.leftBlurPx).toBe(0.42);
  });

  test("default shadow config remains stable for fallback behavior", () => {
    expect(DEFAULT_SHADOW_CONFIG).toEqual({
      leftOffsetPx: 0,
      leftBlurPx: 0,
      leftOpacity: 0.85,
    });
  });

  test("loadShadowConfig loads active preset from fetched config", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "activePreset=soft",
        "preset.soft.leftOffsetPx=1",
        "preset.soft.leftBlurPx=2",
        "preset.soft.leftOpacity=0.3",
      ].join("\n")),
    );

    const loaded = await loadShadowConfig();

    expect(loaded).toEqual({
      leftOffsetPx: 1,
      leftBlurPx: 2,
      leftOpacity: 0.3,
    });
  });

  test("loadShadowConfig falls back when fetch fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("network"));

    const loaded = await loadShadowConfig();

    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
    warnSpy.mockRestore();
  });

  test("loadShadowConfig falls back when response is not ok", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({ ok: false } as Response);

    const loaded = await loadShadowConfig();

    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
  });

  test("loadShadowConfig warns and falls back when requested preset is missing but balanced exists", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "activePreset=nonexistent",
        "preset.balanced.leftOffsetPx=2",
        "preset.balanced.leftOpacity=0.6",
      ].join("\n")),
    );

    const loaded = await loadShadowConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("nonexistent"));
    expect(loaded.leftOffsetPx).toBe(2);
    expect(loaded.leftOpacity).toBe(0.6);
    warnSpy.mockRestore();
  });

  test("loadShadowConfig warns and returns defaults when both requested and fallback preset are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "activePreset=nonexistent",
        "preset.other.leftOffsetPx=5",
      ].join("\n")),
    );

    const loaded = await loadShadowConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("also missing"));
    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
    warnSpy.mockRestore();
  });

  test("loadShadowConfig warns and returns defaults when no activePreset and balanced preset is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "preset.other.leftOffsetPx=5",
      ].join("\n")),
    );

    const loaded = await loadShadowConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("fallback preset"));
    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
    warnSpy.mockRestore();
  });

  test("parseShadowConfig ignores preset key with too few parts", () => {
    // "preset.only" splits into only 2 parts — should be skipped
    const cfg = "preset.only=5";
    const parsed = shadowConfigTesting.parseShadowConfig(cfg);
    expect(parsed.presets.size).toBe(0);
  });

  test("parseShadowConfig ignores non-preset non-activePreset keys", () => {
    // A key that doesn't start with "preset." triggers the early return in applyPresetEntry
    const cfg = "shadowDepth=10";
    const parsed = shadowConfigTesting.parseShadowConfig(cfg);
    expect(parsed.presets.size).toBe(0);
    expect(parsed.activePreset).toBeNull();
  });

  test("parseShadowConfig ignores preset key with empty preset name", () => {
    // "preset..key" splits into ["preset", "", "key"] — presetName.length === 0 should be skipped
    const cfg = "preset..leftOpacity=0.5";
    const parsed = shadowConfigTesting.parseShadowConfig(cfg);
    expect(parsed.presets.size).toBe(0);
  });

  test("loadShadowConfig uses balanced fallback when no activePreset is set", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      createMockTextResponse([
        "preset.balanced.leftOffsetPx=3",
        "preset.balanced.leftBlurPx=4",
      ].join("\n")),
    );

    const loaded = await loadShadowConfig();

    expect(loaded.leftOffsetPx).toBe(3);
    expect(loaded.leftBlurPx).toBe(4);
  });
});
