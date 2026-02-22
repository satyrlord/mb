import { RUNTIME_CONFIG_PATHS } from "./runtime-config.js";
import { clamp } from "./utils.js";
import { parseCfgLines, parseCfgNumber } from "./cfg.js";

export interface ShadowConfig {
  leftOffsetPx: number;
  leftBlurPx: number;
  leftOpacity: number;
}

export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  leftOffsetPx: 0,
  leftBlurPx: 0,
  leftOpacity: 0.85,
};

const FALLBACK_SHADOW_PRESET = "balanced";

// Maximum clamp values guard against configuration errors that would produce
// invisible or layout-breaking shadow effects. These are intentionally generous
// enough to cover all practical design needs while rejecting clearly invalid
// values (e.g. a typo turning 10px into 10000px).
const MAX_OFFSET_PX = 100;
const MAX_BLUR_PX = 50;

const SHADOW_CONFIG_KEYS = [
  "leftOffsetPx",
  "leftBlurPx",
  "leftOpacity",
] as const;

type ShadowConfigKey = (typeof SHADOW_CONFIG_KEYS)[number];

const isShadowConfigKey = (key: string): key is ShadowConfigKey => {
  return SHADOW_CONFIG_KEYS.includes(key as ShadowConfigKey);
};

const applyShadowConfigValue = (
  target: Partial<ShadowConfig>,
  key: string,
  value: number,
): void => {
  if (isShadowConfigKey(key)) {
    target[key] = value;
  } else {
    console.warn(`[MEMORYBLOX] Unrecognized shadow config key: '${key}'.`);
  }
};

interface ParsedShadowConfig {
  activePreset: string | null;
  presets: Map<string, Partial<ShadowConfig>>;
}

const applyPresetEntry = (
  presets: Map<string, Partial<ShadowConfig>>,
  key: string,
  rawValue: string,
): void => {
  if (!key.startsWith("preset.")) {
    return;
  }

  const parts = key.split(".");

  if (parts.length !== 3) {
    return;
  }

  const presetName = parts[1]?.trim();
  const presetKey = parts[2]?.trim();

  if (presetName === undefined || presetName.length === 0 || presetKey === undefined) {
    return;
  }

  const presetValue = parseCfgNumber(rawValue);

  if (presetValue === null) {
    return;
  }

  const preset = presets.get(presetName) ?? {};
  applyShadowConfigValue(preset, presetKey, presetValue);
  presets.set(presetName, preset);
};

const parseShadowConfig = (content: string): ParsedShadowConfig => {
  const presets = new Map<string, Partial<ShadowConfig>>();
  let activePreset: string | null = null;
  const entries = parseCfgLines(content);

  for (const [key, rawValue] of entries) {
    if (key === "activePreset") {
      activePreset = rawValue.length > 0 ? rawValue : null;
      continue;
    }

    applyPresetEntry(presets, key, rawValue);
  }

  return {
    activePreset,
    presets,
  };
};

/**
 * Normalizes a partial shadow config object into a complete {@link ShadowConfig}
 * by filling missing fields from `DEFAULT_SHADOW_CONFIG` and clamping values
 * to their valid ranges (`leftOffsetPx` clamped to `[0, MAX_OFFSET_PX]`;
 * `leftBlurPx` clamped to `[0, MAX_BLUR_PX]`; `leftOpacity` clamped to `[0, 1]`).
 *
 * @param input - Partial shadow config to normalize. Any missing fields fall
 *   back to the corresponding `DEFAULT_SHADOW_CONFIG` value.
 * @returns A fully populated {@link ShadowConfig} with all values within bounds.
 */
const normalizeShadowConfig = (input: Partial<ShadowConfig>): ShadowConfig => {
  const leftOffsetPx = clamp(input.leftOffsetPx ?? DEFAULT_SHADOW_CONFIG.leftOffsetPx, 0, MAX_OFFSET_PX);
  const leftBlurPx = clamp(input.leftBlurPx ?? DEFAULT_SHADOW_CONFIG.leftBlurPx, 0, MAX_BLUR_PX);
  const leftOpacity = clamp(input.leftOpacity ?? DEFAULT_SHADOW_CONFIG.leftOpacity, 0, 1);

  return {
    leftOffsetPx,
    leftBlurPx,
    leftOpacity,
  };
};

export const shadowConfigTesting = {
  parseCfgNumber,
  applyShadowConfigValue,
  parseShadowConfig,
};

export const loadShadowConfig = async (): Promise<ShadowConfig> => {
  try {
    const response = await window.fetch(RUNTIME_CONFIG_PATHS.shadow, { cache: "no-cache" });

    if (!response.ok) {
      return DEFAULT_SHADOW_CONFIG;
    }

    const content = await response.text();
    const parsed = parseShadowConfig(content);

    const requestedPreset = parsed.activePreset ?? FALLBACK_SHADOW_PRESET;
    const requestedPresetConfig = parsed.presets.get(requestedPreset);
    const fallbackPresetConfig = parsed.presets.get(FALLBACK_SHADOW_PRESET);

    const shouldAttemptFallback =
      parsed.activePreset === null || requestedPresetConfig === undefined;

    const isRequestedMissing =
      parsed.activePreset !== null && requestedPresetConfig === undefined;
    const isFallbackMissing =
      shouldAttemptFallback && fallbackPresetConfig === undefined;

    if (isRequestedMissing && isFallbackMissing) {
      console.warn(
        `[MEMORYBLOX] Shadow preset '${requestedPreset}' not found and fallback preset '${FALLBACK_SHADOW_PRESET}' is also missing; using built-in defaults.`,
      );
    } else if (isRequestedMissing) {
      console.warn(
        `[MEMORYBLOX] Shadow preset '${requestedPreset}' not found; falling back to '${FALLBACK_SHADOW_PRESET}'.`,
      );
    } else if (isFallbackMissing) {
      console.warn(
        `[MEMORYBLOX] Shadow fallback preset '${FALLBACK_SHADOW_PRESET}' is missing; using built-in defaults.`,
      );
    }

    const presetConfig = requestedPresetConfig ?? fallbackPresetConfig;

    if (presetConfig === undefined) {
      return DEFAULT_SHADOW_CONFIG;
    }

    return normalizeShadowConfig({
      ...presetConfig,
    });
  } catch {
    return DEFAULT_SHADOW_CONFIG;
  }
};
