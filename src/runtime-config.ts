import { clamp } from "./utils.js";
import { parseCfgInteger, parseCfgLines, parseCfgNumber } from "./cfg.js";

export interface WindowBaseSize {
  minWidthPx: number;
  minHeightPx: number;
}

export interface WindowResizeLimits {
  defaultScale: number;
  minScale: number;
  maxScale: number;
  viewportPaddingPx: number;
}

export interface AnimationSpeedLimits {
  defaultSpeed: number;
  minSpeed: number;
  maxSpeed: number;
}

export interface GameplayTimingConfig {
  mismatchDelayMs: number;
  reducedMotionMismatchExtraDelayMs: number;
  matchedDisappearPauseMs: number;
  matchedDisappearDurationMs: number;
  reducedMotionMatchedDisappearDurationMs: number;
  winCanvasFadeDurationMs: number;
  autoMatchSecondSelectionDelayMs: number;
  autoMatchBootDelayMs: number;
  autoMatchBetweenPairsDelayMs: number;
  uiTimerUpdateIntervalMs: number;
}

export interface BoardLayoutConfig {
  minTileSizePx: number;
  targetTileSizePx: number;
  tileGapPx: number;
  boardHorizontalPaddingPx: number;
}

export interface VisualEffectsConfig {
  tileFlipDurationMs: number;
  plasmaBackgroundDriftDurationMs: number;
  plasmaHueCycleDurationMs: number;
  plasmaTileDriftDurationMs: number;
  plasmaTileIndexOffsetDelayMs: number;
  plasmaGlowSweepDurationMs: number;
  plasmaFlaresShiftDurationMs: number;
  plasmaGlowOpacity: number;
  plasmaFlaresOpacity: number;
}

export interface UiRuntimeConfig {
  fixedWindowAspectRatio: number;
  emojiPackParityMode: "error" | "warn";
  flagEmojiCdnBaseUrl: string;
  tileGlobalOpacity: number;
  tileFrontOpacity: number;
  tileBackOpacity: number;
  appMaxWidthPx: number;
  leaderboardVisibleRowCount: number;
  namePromptFadeOutMs: number;
  boardLayout: BoardLayoutConfig;
  gameplayTiming: GameplayTimingConfig;
  visualEffects: VisualEffectsConfig;
  windowBaseSize: WindowBaseSize;
  windowResizeLimits: WindowResizeLimits;
  animationSpeed: AnimationSpeedLimits;
}

export interface WinFxOptions {
  durationMs: number;
  maxTilePieces: number;
  wavesPerTile: number;
  waveDelayMs: number;
  sparksPerTile: number;
  particleDelayJitterMs: number;
  centerFinaleDelayMs: number;
  centerFinaleWaves: number;
  centerFinaleWaveDelayMs: number;
  centerFinaleCount: number;
  confettiRainDelayMs: number;
  confettiRainCount: number;
  confettiRainSpreadMs: number;
  colors: readonly string[];
}

export interface WinFxRuntimeConfig {
  options: WinFxOptions;
  textOptions: readonly string[];
  rainColors: readonly string[];
}

export const DEFAULT_WIN_FX_TEXT = "YOU WIN!";

export const RUNTIME_CONFIG_PATHS = {
  ui: "./config/ui.cfg",
  shadow: "./config/shadow.cfg",
  winFx: "./config/win-fx.cfg",
  leaderboard: "./config/leaderboard.cfg",
} as const;

export const DEFAULT_UI_RUNTIME_CONFIG: UiRuntimeConfig = {
  fixedWindowAspectRatio: 16 / 10,
  emojiPackParityMode: "error",
  flagEmojiCdnBaseUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg",
  tileGlobalOpacity: 0.5,
  tileFrontOpacity: 0.5,
  tileBackOpacity: 0.5,
  appMaxWidthPx: 979,
  leaderboardVisibleRowCount: 99,
  namePromptFadeOutMs: 220,
  boardLayout: {
    minTileSizePx: 44,
    targetTileSizePx: 84,
    tileGapPx: 10,
    boardHorizontalPaddingPx: 16,
  },
  gameplayTiming: {
    mismatchDelayMs: 700,
    reducedMotionMismatchExtraDelayMs: 200,
    matchedDisappearPauseMs: 1000,
    matchedDisappearDurationMs: 500,
    reducedMotionMatchedDisappearDurationMs: 350,
    winCanvasFadeDurationMs: 640,
    autoMatchSecondSelectionDelayMs: 495,
    autoMatchBootDelayMs: 1013,
    autoMatchBetweenPairsDelayMs: 945,
    uiTimerUpdateIntervalMs: 250,
  },
  visualEffects: {
    tileFlipDurationMs: 560,
    plasmaBackgroundDriftDurationMs: 18000,
    plasmaHueCycleDurationMs: 10800,
    plasmaTileDriftDurationMs: 90000,
    plasmaTileIndexOffsetDelayMs: 6185,
    plasmaGlowSweepDurationMs: 12400,
    plasmaFlaresShiftDurationMs: 7600,
    plasmaGlowOpacity: 0.7,
    plasmaFlaresOpacity: 0.34,
  },
  windowBaseSize: {
    minWidthPx: 1024,
    minHeightPx: 640,
  },
  windowResizeLimits: {
    defaultScale: 1,
    minScale: 0.72,
    maxScale: 1.5,
    viewportPaddingPx: 16,
  },
  animationSpeed: {
    defaultSpeed: 1,
    minSpeed: 1,
    maxSpeed: 3,
  },
};

export const DEFAULT_WIN_FX_RUNTIME_CONFIG: WinFxRuntimeConfig = {
  options: {
    durationMs: 5460,
    maxTilePieces: 56,
    wavesPerTile: 2,
    waveDelayMs: 64,
    sparksPerTile: 1,
    particleDelayJitterMs: 180,
    centerFinaleDelayMs: 730,
    centerFinaleWaves: 3,
    centerFinaleWaveDelayMs: 112,
    centerFinaleCount: 52,
    confettiRainDelayMs: 1050,
    confettiRainCount: 124,
    confettiRainSpreadMs: 1640,
    colors: [
      "#26ccff",
      "#a25afd",
      "#ff5e7e",
      "#88ff5a",
      "#fcff42",
      "#ffa62d",
      "#ff36ff",
    ],
  },
  textOptions: [
    DEFAULT_WIN_FX_TEXT,
    "LEGENDARY!",
    "EPIC CLEAR!",
    "MEMORY MASTER!",
  ],
  rainColors: [
    "#26ccff",
    "#a25afd",
    "#ff5e7e",
    "#88ff5a",
    "#fcff42",
    "#ffa62d",
    "#ff36ff",
    "#6b1a10",
    "#4b170f",
    "#2f1218",
    "#3a2416",
  ],
};

/**
 * Parses a comma-separated config string into a string array,
 * trimming whitespace from each item and filtering out empty values.
 *
 * @param value - The raw config string to parse.
 * @returns An array of non-empty trimmed strings.
 */
const parseCfgList = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

// Accepts RGB (#RGB, #RRGGBB) and RGBA (#RRGGBBAA) hex color formats.
const HEX_COLOR_PATTERN = /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6}|[\dA-Fa-f]{8})$/u;

const isHexColor = (value: string): boolean => {
  return HEX_COLOR_PATTERN.test(value.trim());
};

const parseCfgHexColorList = (value: string): string[] => {
  return parseCfgList(value).filter((item) => isHexColor(item));
};

const parseEmojiPackParityMode = (value: string): "error" | "warn" | null => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "error" || normalized === "warn") {
    return normalized;
  }

  return null;
};

const readCfgFile = async (path: string): Promise<Map<string, string> | null> => {
  try {
    const response = await window.fetch(path, { cache: "no-cache" });

    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    return parseCfgLines(content);
  } catch {
    return null;
  }
};

export const loadUiRuntimeConfig = async (): Promise<UiRuntimeConfig> => {
  const entries = await readCfgFile(RUNTIME_CONFIG_PATHS.ui);

  if (entries === null) {
    return DEFAULT_UI_RUNTIME_CONFIG;
  }

  const defaultWindowResizeLimits = DEFAULT_UI_RUNTIME_CONFIG.windowResizeLimits;
  const rawMinScale = parseCfgNumber(entries.get("window.minScale") ?? "")
    ?? defaultWindowResizeLimits.minScale;
  const rawMaxScale = parseCfgNumber(entries.get("window.maxScale") ?? "")
    ?? defaultWindowResizeLimits.maxScale;
  const windowMaxScale = Math.max(rawMinScale, rawMaxScale);
  const windowMinScale = Math.min(rawMinScale, windowMaxScale);

  const defaultAnimationSpeed = DEFAULT_UI_RUNTIME_CONFIG.animationSpeed;
  const rawMinSpeed = parseCfgNumber(entries.get("animation.minSpeed") ?? "")
    ?? defaultAnimationSpeed.minSpeed;
  const rawMaxSpeed = parseCfgNumber(entries.get("animation.maxSpeed") ?? "")
    ?? defaultAnimationSpeed.maxSpeed;
  const speedMax = Math.max(rawMinSpeed, rawMaxSpeed);
  const speedMin = Math.min(rawMinSpeed, speedMax);
  const rawDefaultSpeed = parseCfgNumber(entries.get("animation.defaultSpeed") ?? "")
    ?? defaultAnimationSpeed.defaultSpeed;
  const defaultBoardLayout = DEFAULT_UI_RUNTIME_CONFIG.boardLayout;
  const defaultGameplayTiming = DEFAULT_UI_RUNTIME_CONFIG.gameplayTiming;
  const defaultVisualEffects = DEFAULT_UI_RUNTIME_CONFIG.visualEffects;
  const tileGlobalOpacity = clamp(
    parseCfgNumber(entries.get("ui.tileGlobalOpacity") ?? "")
      ?? DEFAULT_UI_RUNTIME_CONFIG.tileGlobalOpacity,
    0,
    1,
  );
  const tileFrontOpacity = clamp(
    parseCfgNumber(entries.get("ui.tileFrontOpacity") ?? "")
      ?? tileGlobalOpacity,
    0,
    1,
  );
  const tileBackOpacity = clamp(
    parseCfgNumber(entries.get("ui.tileBackOpacity") ?? "")
      ?? tileGlobalOpacity,
    0,
    1,
  );

  return {
    fixedWindowAspectRatio: parseCfgNumber(entries.get("ui.fixedWindowAspectRatio") ?? "")
      ?? DEFAULT_UI_RUNTIME_CONFIG.fixedWindowAspectRatio,
    emojiPackParityMode:
      parseEmojiPackParityMode(entries.get("ui.emojiPackParityMode") ?? "")
      ?? DEFAULT_UI_RUNTIME_CONFIG.emojiPackParityMode,
    flagEmojiCdnBaseUrl: (entries.get("flags.twemojiCdnBaseUrl") ?? "").trim()
      || DEFAULT_UI_RUNTIME_CONFIG.flagEmojiCdnBaseUrl,
    tileGlobalOpacity,
    tileFrontOpacity,
    tileBackOpacity,
    appMaxWidthPx: Math.max(
      1,
      parseCfgInteger(entries.get("ui.appMaxWidthPx") ?? "")
        ?? DEFAULT_UI_RUNTIME_CONFIG.appMaxWidthPx,
    ),
    leaderboardVisibleRowCount: Math.max(
      1,
      parseCfgInteger(entries.get("ui.leaderboardVisibleRowCount") ?? "")
        ?? DEFAULT_UI_RUNTIME_CONFIG.leaderboardVisibleRowCount,
    ),
    namePromptFadeOutMs: Math.max(
      0,
      parseCfgInteger(entries.get("ui.namePromptFadeOutMs") ?? "")
        ?? DEFAULT_UI_RUNTIME_CONFIG.namePromptFadeOutMs,
    ),
    boardLayout: {
      minTileSizePx: Math.max(
        1,
        parseCfgInteger(entries.get("board.minTileSizePx") ?? "")
          ?? defaultBoardLayout.minTileSizePx,
      ),
      targetTileSizePx: Math.max(
        1,
        parseCfgInteger(entries.get("board.targetTileSizePx") ?? "")
          ?? defaultBoardLayout.targetTileSizePx,
      ),
      tileGapPx: Math.max(
        0,
        parseCfgInteger(entries.get("board.tileGapPx") ?? "")
          ?? defaultBoardLayout.tileGapPx,
      ),
      boardHorizontalPaddingPx: Math.max(
        0,
        parseCfgInteger(entries.get("board.boardHorizontalPaddingPx") ?? "")
          ?? defaultBoardLayout.boardHorizontalPaddingPx,
      ),
    },
    gameplayTiming: {
      mismatchDelayMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.mismatchDelayMs") ?? "")
          ?? defaultGameplayTiming.mismatchDelayMs,
      ),
      reducedMotionMismatchExtraDelayMs: Math.max(
        0,
        parseCfgInteger(entries.get("gameplay.reducedMotionMismatchExtraDelayMs") ?? "")
          ?? defaultGameplayTiming.reducedMotionMismatchExtraDelayMs,
      ),
      matchedDisappearPauseMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.matchedDisappearPauseMs") ?? "")
          ?? defaultGameplayTiming.matchedDisappearPauseMs,
      ),
      matchedDisappearDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.matchedDisappearDurationMs") ?? "")
          ?? defaultGameplayTiming.matchedDisappearDurationMs,
      ),
      reducedMotionMatchedDisappearDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.reducedMotionMatchedDisappearDurationMs") ?? "")
          ?? defaultGameplayTiming.reducedMotionMatchedDisappearDurationMs,
      ),
      winCanvasFadeDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.winCanvasFadeDurationMs") ?? "")
          ?? defaultGameplayTiming.winCanvasFadeDurationMs,
      ),
      autoMatchSecondSelectionDelayMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.autoMatchSecondSelectionDelayMs") ?? "")
          ?? defaultGameplayTiming.autoMatchSecondSelectionDelayMs,
      ),
      autoMatchBootDelayMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.autoMatchBootDelayMs") ?? "")
          ?? defaultGameplayTiming.autoMatchBootDelayMs,
      ),
      autoMatchBetweenPairsDelayMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.autoMatchBetweenPairsDelayMs") ?? "")
          ?? defaultGameplayTiming.autoMatchBetweenPairsDelayMs,
      ),
      uiTimerUpdateIntervalMs: Math.max(
        1,
        parseCfgInteger(entries.get("gameplay.uiTimerUpdateIntervalMs") ?? "")
          ?? defaultGameplayTiming.uiTimerUpdateIntervalMs,
      ),
    },
    visualEffects: {
      tileFlipDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("animation.tileFlipDurationMs") ?? "")
          ?? defaultVisualEffects.tileFlipDurationMs,
      ),
      plasmaBackgroundDriftDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.backgroundDriftDurationMs") ?? "")
          ?? defaultVisualEffects.plasmaBackgroundDriftDurationMs,
      ),
      plasmaHueCycleDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.hueCycleDurationMs") ?? "")
          ?? defaultVisualEffects.plasmaHueCycleDurationMs,
      ),
      plasmaTileDriftDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.tileDriftDurationMs") ?? "")
          ?? defaultVisualEffects.plasmaTileDriftDurationMs,
      ),
      plasmaTileIndexOffsetDelayMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.tileIndexOffsetDelayMs") ?? "")
          ?? defaultVisualEffects.plasmaTileIndexOffsetDelayMs,
      ),
      plasmaGlowSweepDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.glowSweepDurationMs") ?? "")
          ?? defaultVisualEffects.plasmaGlowSweepDurationMs,
      ),
      plasmaFlaresShiftDurationMs: Math.max(
        1,
        parseCfgInteger(entries.get("plasma.flaresShiftDurationMs") ?? "")
          ?? defaultVisualEffects.plasmaFlaresShiftDurationMs,
      ),
      plasmaGlowOpacity: clamp(
        parseCfgNumber(entries.get("plasma.glowOpacity") ?? "")
          ?? defaultVisualEffects.plasmaGlowOpacity,
        0,
        1,
      ),
      plasmaFlaresOpacity: clamp(
        parseCfgNumber(entries.get("plasma.flaresOpacity") ?? "")
          ?? defaultVisualEffects.plasmaFlaresOpacity,
        0,
        1,
      ),
    },
    windowBaseSize: {
      minWidthPx: Math.max(
        1,
        parseCfgInteger(entries.get("window.baseMinWidthPx") ?? "")
          ?? DEFAULT_UI_RUNTIME_CONFIG.windowBaseSize.minWidthPx,
      ),
      minHeightPx: Math.max(
        1,
        parseCfgInteger(entries.get("window.baseMinHeightPx") ?? "")
          ?? DEFAULT_UI_RUNTIME_CONFIG.windowBaseSize.minHeightPx,
      ),
    },
    windowResizeLimits: {
      defaultScale: clamp(
        parseCfgNumber(entries.get("window.defaultScale") ?? "")
          ?? defaultWindowResizeLimits.defaultScale,
        windowMinScale,
        windowMaxScale,
      ),
      minScale: windowMinScale,
      maxScale: windowMaxScale,
      viewportPaddingPx: Math.max(
        0,
        parseCfgInteger(entries.get("window.viewportPaddingPx") ?? "")
          ?? defaultWindowResizeLimits.viewportPaddingPx,
      ),
    },
    animationSpeed: {
      defaultSpeed: clamp(rawDefaultSpeed, speedMin, speedMax),
      minSpeed: speedMin,
      maxSpeed: speedMax,
    },
  };
};

export const runtimeConfigTesting = {
  parseCfgLines,
  parseCfgNumber,
  parseCfgInteger,
  parseCfgList,
  isHexColor,
  parseCfgHexColorList,
  parseEmojiPackParityMode,
};

export const loadWinFxRuntimeConfig = async (): Promise<WinFxRuntimeConfig> => {
  const entries = await readCfgFile(RUNTIME_CONFIG_PATHS.winFx);

  if (entries === null) {
    return DEFAULT_WIN_FX_RUNTIME_CONFIG;
  }

  const defaults = DEFAULT_WIN_FX_RUNTIME_CONFIG;
  const defaultOptions = defaults.options;
  const colors = parseCfgHexColorList(entries.get("winFx.colors") ?? "");
  const textOptions = parseCfgList(entries.get("winFx.textOptions") ?? "");
  const rainColors = parseCfgHexColorList(entries.get("winFx.rainColors") ?? "");

  return {
    options: {
      durationMs: Math.max(
        1,
        parseCfgInteger(entries.get("winFx.durationMs") ?? "") ?? defaultOptions.durationMs,
      ),
      maxTilePieces: Math.max(
        1,
        parseCfgInteger(entries.get("winFx.maxTilePieces") ?? "") ?? defaultOptions.maxTilePieces,
      ),
      wavesPerTile: Math.max(
        1,
        parseCfgInteger(entries.get("winFx.wavesPerTile") ?? "") ?? defaultOptions.wavesPerTile,
      ),
      waveDelayMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.waveDelayMs") ?? "") ?? defaultOptions.waveDelayMs,
      ),
      sparksPerTile: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.sparksPerTile") ?? "") ?? defaultOptions.sparksPerTile,
      ),
      particleDelayJitterMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.particleDelayJitterMs") ?? "")
          ?? defaultOptions.particleDelayJitterMs,
      ),
      centerFinaleDelayMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.centerFinaleDelayMs") ?? "")
          ?? defaultOptions.centerFinaleDelayMs,
      ),
      centerFinaleWaves: Math.max(
        1,
        parseCfgInteger(entries.get("winFx.centerFinaleWaves") ?? "")
          ?? defaultOptions.centerFinaleWaves,
      ),
      centerFinaleWaveDelayMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.centerFinaleWaveDelayMs") ?? "")
          ?? defaultOptions.centerFinaleWaveDelayMs,
      ),
      centerFinaleCount: Math.max(
        1,
        parseCfgInteger(entries.get("winFx.centerFinaleCount") ?? "")
          ?? defaultOptions.centerFinaleCount,
      ),
      confettiRainDelayMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.confettiRainDelayMs") ?? "")
          ?? defaultOptions.confettiRainDelayMs,
      ),
      confettiRainCount: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.confettiRainCount") ?? "")
          ?? defaultOptions.confettiRainCount,
      ),
      confettiRainSpreadMs: Math.max(
        0,
        parseCfgInteger(entries.get("winFx.confettiRainSpreadMs") ?? "")
          ?? defaultOptions.confettiRainSpreadMs,
      ),
      colors: colors.length > 0 ? colors : defaultOptions.colors,
    },
    textOptions: textOptions.length > 0 ? textOptions : defaults.textOptions,
    rainColors: rainColors.length > 0 ? rainColors : defaults.rainColors,
  };
};
