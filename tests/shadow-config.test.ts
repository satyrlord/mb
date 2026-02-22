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
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("network"));

    const loaded = await loadShadowConfig();

    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
  });

  test("loadShadowConfig falls back when response is not ok", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({ ok: false } as Response);

    const loaded = await loadShadowConfig();

    expect(loaded).toEqual(DEFAULT_SHADOW_CONFIG);
  });
});
