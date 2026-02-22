import { BoardView } from "./board.js";
import { setFlagEmojiCdnBaseUrl } from "./flag-emoji.js";
import {
  BLOCKED_TILE_TOKEN,
} from "./game.js";
import {
  createGameplayEngine,
  type GameplayEngine,
} from "./gameplay.js";
import {
  DEFAULT_EMOJI_PACK_ID,
  generateEmojiDeck,
  getEmojiPacks,
  validateMinPackIconCount,
  validateUniquePackIcons,
  type EmojiPackId,
} from "./icons.js";
import { createGamePresentationModel } from "./presentation.js";
import {
  DEFAULT_UI_RUNTIME_CONFIG,
  type UiRuntimeConfig,
  loadUiRuntimeConfig,
  loadWinFxRuntimeConfig,
} from "./runtime-config.js";
import {
  DEFAULT_SHADOW_CONFIG,
  type ShadowConfig,
  loadShadowConfig,
} from "./shadow-config.js";
import {
  applyLeaderboardScorePenalty,
  calculateLeaderboardScore,
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  LeaderboardClient,
  loadLeaderboardRuntimeConfig,
  type LeaderboardRuntimeConfig,
  type LeaderboardScoreEntry,
} from "./leaderboard.js";
import { normalizeScoreFlagsForPlayerSelection } from "./session-score.js";
import { UiView } from "./ui.js";
import { clamp, formatElapsedTime, shuffle } from "./utils.js";
import { WinFxController } from "./win-fx.js";

const WINDOW_SCALE_STORAGE_KEY = "memoryblox-window-scale";
const EMOJI_PACK_STORAGE_KEY = "memoryblox-emoji-pack";
const PLAYER_NAME_STORAGE_KEY = "memoryblox-player-name";
interface AppRuntimeState {
  ui: UiRuntimeConfig;
}

const runtimeState: AppRuntimeState = {
  ui: {
    ...DEFAULT_UI_RUNTIME_CONFIG,
    boardLayout: { ...DEFAULT_UI_RUNTIME_CONFIG.boardLayout },
    gameplayTiming: { ...DEFAULT_UI_RUNTIME_CONFIG.gameplayTiming },
    visualEffects: { ...DEFAULT_UI_RUNTIME_CONFIG.visualEffects },
    windowBaseSize: { ...DEFAULT_UI_RUNTIME_CONFIG.windowBaseSize },
    windowResizeLimits: { ...DEFAULT_UI_RUNTIME_CONFIG.windowResizeLimits },
    animationSpeed: { ...DEFAULT_UI_RUNTIME_CONFIG.animationSpeed },
  },
};

const DEFAULT_DIFFICULTY_ID = "normal";

interface DifficultyConfig {
  id: string;
  label: string;
  rows: number;
  columns: number;
  scoreMultiplier: number;
}

const DEBUG_TILES_DIFFICULTY: DifficultyConfig = {
  id: "debug-tiles",
  label: "Debug Tiles",
  rows: 1,
  columns: 2,
  scoreMultiplier: 0,
};

interface TileLayout {
  tileCount: number;
  hasBlockedTile: boolean;
  matchableTileCount: number;
  pairCount: number;
}

interface ActiveGameSession {
  mode: "game" | "debug-tiles";
  difficulty: DifficultyConfig;
  emojiSetId: EmojiPackId;
  emojiSetLabel: string;
  gameplay: GameplayEngine;
  scoreCategory: "standard" | "debug";
  isAutoDemoScore: boolean;
}

type AppSession =
  | {
    mode: "menu";
  }
  | ActiveGameSession;

interface WindowResizeState {
  baseWidthPx: number;
  baseHeightPx: number;
  aspectRatio: number;
  scale: number;
}

interface WindowResizeDragState {
  pointerId: number;
  startX: number;
  startY: number;
  startWidthPx: number;
  startHeightPx: number;
}

// Fallback shadow values are defined in `src/shadow-config.ts` and intentionally
// match the `balanced` preset in `config/shadow.cfg`.

const DIFFICULTIES: DifficultyConfig[] = [
  { id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 },
  { id: "normal", label: "Normal", rows: 5, columns: 8, scoreMultiplier: 1.8 },
  { id: "hard", label: "Hard", rows: 5, columns: 10, scoreMultiplier: 2.4 },
];

const requireElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
};

const boardElement = requireElement<HTMLElement>("#board");
const appShellElement = requireElement<HTMLElement>("#appShell");
const appWindowElement = requireElement<HTMLElement>("#appWindow");
const timeValueElement = requireElement<HTMLElement>("#timeValue");
const attemptsValueElement = requireElement<HTMLElement>("#attemptsValue");
const statusMessageElement = requireElement<HTMLElement>("#statusMessage");
const topbarMenuLabel = requireElement<HTMLElement>("#topbarMenuLabel");
const topbarActionsElement = requireElement<HTMLElement>(".topbar-actions");
const menuBottomRepo = requireElement<HTMLElement>("#menuBottomRepo");
const debugMenuRoot = requireElement<HTMLElement>("#debugMenuRoot");
const debugMenuButton = requireElement<HTMLButtonElement>("#debugMenuButton");
const debugMenuPanel = requireElement<HTMLElement>("#debugMenuPanel");
const debugDemoButton = requireElement<HTMLButtonElement>("#debugDemoButton");
const debugWinButton = requireElement<HTMLButtonElement>("#debugWinButton");
const debugTilesButton = requireElement<HTMLButtonElement>("#debugTilesButton");
const menuButton = requireElement<HTMLButtonElement>("#menuButton");
const menuHighScoresButton = requireElement<HTMLButtonElement>("#menuHighScoresButton");
const menuSettingsButton = requireElement<HTMLButtonElement>("#menuSettingsButton");
const leaderboardStatusElement = requireElement<HTMLElement>("#leaderboardStatus");
const leaderboardTableWrapElement = requireElement<HTMLElement>("#leaderboardTableWrap");
const leaderboardListElement = requireElement<HTMLTableSectionElement>("#leaderboardList");
const leaderboardBackButton = requireElement<HTMLButtonElement>("#leaderboardBackButton");
const namePromptOverlayElement = requireElement<HTMLElement>("#namePromptOverlay");
const namePromptInputElement = requireElement<HTMLInputElement>("#namePromptInput");
const namePromptOkButton = requireElement<HTMLButtonElement>("#namePromptOkButton");
const difficultyMenu = requireElement<HTMLElement>("#difficultyMenu");
const menuFrame = requireElement<HTMLElement>("#menuFrame");
const leaderboardFrame = requireElement<HTMLElement>("#leaderboardFrame");
const settingsFrame = requireElement<HTMLElement>("#settingsFrame");
const settingsPackListElement = requireElement<HTMLElement>("#settingsPackList");
const settingsApplyButton = requireElement<HTMLButtonElement>("#settingsApplyButton");
const gameFrame = requireElement<HTMLElement>("#gameFrame");
const debugTilesFrame = requireElement<HTMLElement>("#debugTilesFrame");
const debugTilesBoardElement = requireElement<HTMLElement>("#debugTilesBoard");
const resizeHandleElement = requireElement<HTMLElement>(".resize-handle");
const winFxLayerElement = requireElement<HTMLElement>("#winFxLayer");
const winFxParticlesElement = requireElement<HTMLElement>("#winFxParticles");
const winFxTextElement = requireElement<HTMLElement>("#winFxText");
const difficultyButtons = Array.from(
  difficultyMenu.querySelectorAll<HTMLButtonElement>("button[data-difficulty]"),
);

let session: AppSession = { mode: "menu" };
// Timer cancellation uses an interval id plus a generation counter to prevent
// stale callbacks from affecting UI or game state after restarts or cancels.
/**
 * Timer cancellation strategy.
 *
 * - `timerIntervalId` tracks the currently active `setInterval` handle so it can
 *   be cleared when the timer is stopped or restarted.
 * - `timerIntervalGeneration` is incremented every time we (re)start the timer
 *   and is captured by timer callbacks.
 * - Inside the callback we compare the captured generation with the current one;
 *   if they differ, the callback is considered stale (from a previous timer run)
 *   and returns without touching UI or game state.
 *
 * This prevents race conditions where an old interval fires after a restart or
 * cancel, ensuring only the most recent timer controls the UI.
 */
let timerIntervalId: number | null = null;
let timerIntervalGeneration = 0;
let autoDemoGeneration = 0;
let mismatchResolveTimeoutId: number | null = null;
let mismatchResolveGeneration = 0;
let winSequenceTimeoutId: number | null = null;
let winSequenceGeneration = 0;
let selectedEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
let pendingEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
let selectedAnimationSpeed = runtimeState.ui.animationSpeed.defaultSpeed;
let windowResizeState: WindowResizeState | null = null;
let windowResizeDragState: WindowResizeDragState | null = null;
let shadowConfig: ShadowConfig = DEFAULT_SHADOW_CONFIG;
let leaderboardRuntimeConfig: LeaderboardRuntimeConfig = DEFAULT_LEADERBOARD_RUNTIME_CONFIG;
let leaderboardClient = new LeaderboardClient(DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
let leaderboardEntries: LeaderboardScoreEntry[] = [];
let lastSubmittedLeaderboardEntryKey: string | null = null;
let pendingNamePromptResolve: ((name: string) => void) | null = null;
let pendingNamePromptCleanup: (() => void) | null = null;
const emojiPacks = getEmojiPacks();
const winFxController = new WinFxController({
  appWindowElement,
  boardElement,
  winFxLayerElement,
  winFxParticlesElement,
  winFxTextElement,
});

const applySelectedAnimationSpeed = (speed: number): void => {
  document.documentElement.style.setProperty("--animation-speed", speed.toString());
  winFxController.setAnimationSpeed(speed);
  selectedAnimationSpeed = speed;
};

const getCurrentAnimationSpeed = (): number => {
  return selectedAnimationSpeed;
};

const scaleByAnimationSpeed = (durationMs: number): number => {
  return Math.max(1, Math.round(durationMs / getCurrentAnimationSpeed()));
};

const getGameplayTiming = (): UiRuntimeConfig["gameplayTiming"] => {
  return runtimeState.ui.gameplayTiming;
};

const clearMismatchResolveTimeout = (): void => {
  mismatchResolveGeneration += 1;

  if (mismatchResolveTimeoutId !== null) {
    window.clearTimeout(mismatchResolveTimeoutId);
    mismatchResolveTimeoutId = null;
  }
};

const clearWinSequence = (): void => {
  winSequenceGeneration += 1;

  if (winSequenceTimeoutId !== null) {
    window.clearTimeout(winSequenceTimeoutId);
    winSequenceTimeoutId = null;
  }

  gameFrame.classList.remove("game-canvas-win-fade-out");
  debugTilesFrame.classList.remove("game-canvas-win-fade-out");
};

const getActiveGameCanvasFrame = (): HTMLElement | null => {
  if (!hasActiveGame(session)) {
    return null;
  }

  return session.mode === "debug-tiles"
    ? debugTilesFrame
    : gameFrame;
};

const getScaledMatchedDisappearDuration = (): number => {
  const gameplayTiming = getGameplayTiming();
  const baseDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? gameplayTiming.reducedMotionMatchedDisappearDurationMs
    : gameplayTiming.matchedDisappearDurationMs;

  return scaleByAnimationSpeed(baseDuration);
};

const playWinSequenceWithText = (textOverride?: string): void => {
  clearWinSequence();

  const generation = winSequenceGeneration;
  const gameplayTiming = getGameplayTiming();
  const tileAnimationDuration = scaleByAnimationSpeed(gameplayTiming.matchedDisappearPauseMs)
    + getScaledMatchedDisappearDuration();
  const fadeDuration = scaleByAnimationSpeed(gameplayTiming.winCanvasFadeDurationMs);

  winSequenceTimeoutId = window.setTimeout(() => {
    if (generation !== winSequenceGeneration || !hasActiveGame(session)) {
      return;
    }

    const activeFrame = getActiveGameCanvasFrame();

    if (activeFrame !== null) {
      activeFrame.classList.add("game-canvas-win-fade-out");
    }

    winSequenceTimeoutId = window.setTimeout(() => {
      winSequenceTimeoutId = null;

      if (generation !== winSequenceGeneration || !hasActiveGame(session)) {
        return;
      }

      winFxController.play(() => {
        showMenuFrame();
      }, textOverride);
    }, fadeDuration);
  }, tileAnimationDuration);
};

interface LeaderboardScoreComputationResult {
  difficultyId: string;
  difficultyLabel: string;
  scoreMultiplier: number;
  scoreValue: number;
}

const computeLeaderboardScoreResult = (
  difficulty: DifficultyConfig,
  sessionMode: ActiveGameSession["mode"],
  scoreCategory: "standard" | "debug",
  isAutoDemoScore: boolean,
  timeMs: number,
  attempts: number,
): LeaderboardScoreComputationResult => {
  const difficultyId = scoreCategory === "debug" ? "debug" : difficulty.id;
  const difficultyLabel = scoreCategory === "debug" ? "Debug" : difficulty.label;
  const hasPenalty = scoreCategory === "debug" || isAutoDemoScore;
  const scoringConfig = leaderboardRuntimeConfig.scoring;
  const baseScoreMultiplier = difficulty.scoreMultiplier > 0 ? difficulty.scoreMultiplier : 1;
  const scoreMultiplier = hasPenalty
    ? Number((baseScoreMultiplier * scoringConfig.scorePenaltyFactor).toFixed(2))
    : baseScoreMultiplier;
  const baseScoreValue = calculateLeaderboardScore({
    timeMs,
    attempts,
    scoreMultiplier: baseScoreMultiplier,
  }, scoringConfig);
  let scoreValue = hasPenalty
    ? applyLeaderboardScorePenalty(baseScoreValue, scoringConfig.scorePenaltyFactor)
    : baseScoreValue;

  if (scoreCategory === "debug") {
    scoreValue = Math.max(0, Math.round(scoreValue * scoringConfig.debugScoreExtraReductionFactor));

    if (sessionMode === "debug-tiles") {
      scoreValue = Math.max(0, Math.round(scoreValue * scoringConfig.debugTilesModeReductionFactor));
    } else if (!isAutoDemoScore) {
      scoreValue = Math.max(0, Math.round(scoreValue * scoringConfig.debugWinModeReductionFactor));
    }
  }

  return {
    difficultyId,
    difficultyLabel,
    scoreMultiplier,
    scoreValue,
  };
};

const submitWinToLeaderboard = async (
  playerName: string,
  difficulty: DifficultyConfig,
  sessionMode: ActiveGameSession["mode"],
  emojiSetId: EmojiPackId,
  emojiSetLabel: string,
  scoreCategory: "standard" | "debug",
  isAutoDemoScore: boolean,
  timeMs: number,
  attempts: number,
): Promise<void> => {
  const leaderboardAvailable = isLeaderboardEnabled();

  try {
    const scoreResult = computeLeaderboardScoreResult(
      difficulty,
      sessionMode,
      scoreCategory,
      isAutoDemoScore,
      timeMs,
      attempts,
    );
    const submittedScore = {
      playerName,
      timeMs,
      attempts,
      difficultyId: scoreResult.difficultyId,
      difficultyLabel: scoreResult.difficultyLabel,
      emojiSetId,
      emojiSetLabel,
      scoreMultiplier: scoreResult.scoreMultiplier,
      scoreValue: scoreResult.scoreValue,
      isAutoDemo: isAutoDemoScore,
    };

    await leaderboardClient.submitScore(submittedScore);

    if (leaderboardAvailable) {
      await refreshLeaderboard();
      lastSubmittedLeaderboardEntryKey = resolveLastSubmittedLeaderboardEntryKey(
        leaderboardEntries,
        submittedScore,
      );
      uiView.setStatus("You win! Score saved to local high scores.");
      return;
    }

    uiView.setStatus("You win! Score not saved (high scores disabled).");
  } catch {
    uiView.setStatus("You win! Leaderboard submit failed.");
  }
};

const getScaledMismatchDelay = (): number => {
  const gameplayTiming = getGameplayTiming();
  const reducedMotionExtraDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? gameplayTiming.reducedMotionMismatchExtraDelayMs
    : 0;

  return scaleByAnimationSpeed(gameplayTiming.mismatchDelayMs + reducedMotionExtraDelay);
};

const initializeDropShadow = async (): Promise<void> => {
  shadowConfig = await loadShadowConfig();
  const { leftOffsetPx, leftBlurPx, leftOpacity } = shadowConfig;
  const secondaryBlurPx = Math.max(1, leftBlurPx);
  const secondaryOpacity = clamp(leftOpacity * 0.72, 0, 1);
  const fmt = (n: number): string => n.toFixed(3);
  const shadowValue = `0 ${leftOffsetPx.toFixed(2)}px ${leftBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(leftOpacity)}), 0 0 ${secondaryBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(secondaryOpacity)})`;
  const shadowFilterValue = `drop-shadow(0 ${leftOffsetPx.toFixed(2)}px ${leftBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(leftOpacity)})) drop-shadow(0 0 ${secondaryBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(secondaryOpacity)}))`;

  document.documentElement.style.setProperty("--shadow-text-physical", shadowValue);
  document.documentElement.style.setProperty("--shadow-filter-physical", shadowFilterValue);
};

const readStoredWindowScale = (): number | null => {
  const value = window.localStorage.getItem(WINDOW_SCALE_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const writeStoredWindowScale = (scale: number): void => {
  window.localStorage.setItem(WINDOW_SCALE_STORAGE_KEY, scale.toFixed(4));
};

const getViewportBoundedMaxScale = (state: WindowResizeState): number => {
  const availableWidth = window.innerWidth - (runtimeState.ui.windowResizeLimits.viewportPaddingPx * 2);
  const availableHeight = window.innerHeight - (runtimeState.ui.windowResizeLimits.viewportPaddingPx * 2);

  const widthBound = availableWidth / state.baseWidthPx;
  const heightBound = availableHeight / state.baseHeightPx;

  return Math.min(runtimeState.ui.windowResizeLimits.maxScale, widthBound, heightBound);
};

const clampWindowScale = (state: WindowResizeState, scale: number): number => {
  const maxScale = getViewportBoundedMaxScale(state);
  const minScale = Math.min(runtimeState.ui.windowResizeLimits.minScale, maxScale);

  return clamp(scale, minScale, maxScale);
};

const applyWindowScale = (nextScale: number, persist: boolean): void => {
  if (windowResizeState === null) {
    return;
  }

  const boundedScale = clampWindowScale(windowResizeState, nextScale);
  windowResizeState.scale = boundedScale;

  appShellElement.style.setProperty("--ui-scale", boundedScale.toString());

  if (persist) {
    writeStoredWindowScale(boundedScale);
  }
};

const initializeWindowResizeState = (): void => {
  const bounds = appWindowElement.getBoundingClientRect();
  const measuredWidthPx = Math.round(bounds.width);
  const measuredHeightPx = Math.round(bounds.height);

  if (measuredWidthPx <= 0 || measuredHeightPx <= 0) {
    return;
  }

  const contentSafeHeight = Math.max(measuredHeightPx, runtimeState.ui.windowBaseSize.minHeightPx);
  const widthFromMeasuredHeight = contentSafeHeight * runtimeState.ui.fixedWindowAspectRatio;
  const baseWidthPx = Math.round(
    Math.max(measuredWidthPx, widthFromMeasuredHeight, runtimeState.ui.windowBaseSize.minWidthPx),
  );
  const baseHeightPx = Math.round(baseWidthPx / runtimeState.ui.fixedWindowAspectRatio);

  windowResizeState = {
    baseWidthPx,
    baseHeightPx,
    aspectRatio: runtimeState.ui.fixedWindowAspectRatio,
    scale: runtimeState.ui.windowResizeLimits.defaultScale,
  };

  appShellElement.style.setProperty("--app-base-width", baseWidthPx.toString());
  appShellElement.style.setProperty("--app-base-height", baseHeightPx.toString());
  appShellElement.dataset.resizeReady = "true";

  const restoredScale = readStoredWindowScale() ?? runtimeState.ui.windowResizeLimits.defaultScale;
  applyWindowScale(restoredScale, false);
};

const finishResizeDrag = (): void => {
  if (windowResizeDragState === null || windowResizeState === null) {
    return;
  }

  try {
    if (resizeHandleElement.hasPointerCapture(windowResizeDragState.pointerId)) {
      resizeHandleElement.releasePointerCapture(windowResizeDragState.pointerId);
    }
  } catch {
    // Release failures are non-fatal here; cleanup still runs in finally.
  } finally {
    resizeHandleElement.removeEventListener("pointermove", updateResizeDrag);
    windowResizeDragState = null;
    document.body.style.userSelect = "";
    writeStoredWindowScale(windowResizeState.scale);
  }
};

const beginResizeDrag = (event: PointerEvent): void => {
  if (event.button !== 0 || windowResizeState === null) {
    return;
  }

  event.preventDefault();

  windowResizeDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startWidthPx: windowResizeState.baseWidthPx * windowResizeState.scale,
    startHeightPx: windowResizeState.baseHeightPx * windowResizeState.scale,
  };

  resizeHandleElement.addEventListener("pointermove", updateResizeDrag);
  resizeHandleElement.setPointerCapture(event.pointerId);
  document.body.style.userSelect = "none";
};

const updateResizeDrag = (event: PointerEvent): void => {
  if (windowResizeDragState === null || windowResizeState === null) {
    return;
  }

  if (event.pointerId !== windowResizeDragState.pointerId) {
    return;
  }

  const deltaX = event.clientX - windowResizeDragState.startX;
  const deltaY = event.clientY - windowResizeDragState.startY;

  const widthScale = Math.max(1, windowResizeDragState.startWidthPx + deltaX)
    / windowResizeState.baseWidthPx;
  const equivalentWidthFromHeight =
    Math.max(1, windowResizeDragState.startHeightPx + deltaY)
    * windowResizeState.aspectRatio;
  const heightScale = equivalentWidthFromHeight / windowResizeState.baseWidthPx;

  const nextScale = (widthScale + heightScale) / 2;
  applyWindowScale(nextScale, false);
};

const enableHorizontalWheelScroll = (element: HTMLElement): void => {
  element.addEventListener("wheel", (event) => {
    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;

    if (dominantDelta === 0) {
      return;
    }

    element.scrollLeft += dominantDelta;
    event.preventDefault();
  }, { passive: false });
};

const isEmojiPackId = (value: string): value is EmojiPackId => {
  return emojiPacks.some((pack) => pack.id === value);
};

const readStoredEmojiPackId = (): EmojiPackId | null => {
  const value = window.localStorage.getItem(EMOJI_PACK_STORAGE_KEY);

  if (value === null || !isEmojiPackId(value)) {
    return null;
  }

  return value;
};

const writeStoredEmojiPackId = (packId: EmojiPackId): void => {
  window.localStorage.setItem(EMOJI_PACK_STORAGE_KEY, packId);
};

const getEmojiPackLabel = (packId: EmojiPackId): string => {
  const matchingPack = emojiPacks.find((pack) => pack.id === packId);
  return matchingPack?.name ?? "Unknown";
};

const renderEmojiPackSelection = (): void => {
  const buttons = settingsPackListElement.querySelectorAll<HTMLButtonElement>("button[data-pack-id]");

  for (const button of buttons) {
    const packId = button.dataset.packId;
    const isSelected = packId === pendingEmojiPackId;
    button.setAttribute("aria-checked", String(isSelected));
    button.classList.toggle("btn-secondary", !isSelected);
    button.classList.toggle("active", isSelected);
  }
};

const setPendingEmojiPack = (packId: EmojiPackId): void => {
  pendingEmojiPackId = packId;
  renderEmojiPackSelection();
};

const applyPendingEmojiPack = (): boolean => {
  if (pendingEmojiPackId === selectedEmojiPackId) {
    return false;
  }

  selectedEmojiPackId = pendingEmojiPackId;
  writeStoredEmojiPackId(selectedEmojiPackId);
  renderEmojiPackSelection();
  return true;
};

const initializeEmojiPackSettings = (): void => {
  const storedPackId = readStoredEmojiPackId();
  selectedEmojiPackId = storedPackId ?? DEFAULT_EMOJI_PACK_ID;
  pendingEmojiPackId = selectedEmojiPackId;

  const buttons: HTMLButtonElement[] = [];

  for (const pack of emojiPacks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn settings-pack-btn btn-secondary u-shadow-physical";
    button.dataset.packId = pack.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `Use ${pack.name} emoji pack`);

    const icon = document.createElement("span");
    icon.className = "settings-pack-icon u-shadow-physical";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = pack.previewIcon;

    const label = document.createElement("span");
    label.className = "settings-pack-label u-shadow-physical";
    label.textContent = pack.name;

    button.append(icon, label);

    buttons.push(button);
  }

  settingsPackListElement.replaceChildren(...buttons);
  renderEmojiPackSelection();
};

const readStoredPlayerName = (): string | null => {
  const value = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const writeStoredPlayerName = (name: string): void => {
  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
};

const sanitizePlayerName = (value: string): string => {
  return value
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 20);
};

const closePlayerNamePrompt = (resolvedName?: string): void => {
  pendingNamePromptCleanup?.();
  pendingNamePromptCleanup = null;

  if (pendingNamePromptResolve !== null) {
    const fallbackName = readStoredPlayerName() ?? "Player";
    pendingNamePromptResolve(resolvedName ?? fallbackName);
    pendingNamePromptResolve = null;
  }

  namePromptOverlayElement.classList.remove("is-hiding");
  namePromptOverlayElement.hidden = true;
  namePromptOverlayElement.setAttribute("aria-hidden", "true");
  namePromptInputElement.disabled = false;
  namePromptOkButton.disabled = false;
};

const promptForPlayerNameInUi = (): Promise<string> => {
  closePlayerNamePrompt();

  const storedName = readStoredPlayerName();
  namePromptInputElement.value = storedName ?? "";
  namePromptInputElement.disabled = false;
  namePromptOkButton.disabled = false;
  namePromptOverlayElement.hidden = false;
  namePromptOverlayElement.setAttribute("aria-hidden", "false");
  namePromptOverlayElement.classList.remove("is-hiding");

  return new Promise<string>((resolve) => {
    pendingNamePromptResolve = resolve;

    const submit = (): void => {
      const sanitizedName = sanitizePlayerName(namePromptInputElement.value);
      const resolvedName = sanitizedName.length > 0
        ? sanitizedName
        : (storedName ?? "Player");

      writeStoredPlayerName(resolvedName);
      namePromptInputElement.disabled = true;
      namePromptOkButton.disabled = true;
      namePromptOverlayElement.classList.add("is-hiding");

      window.setTimeout(() => {
        closePlayerNamePrompt(resolvedName);
      }, runtimeState.ui.namePromptFadeOutMs);
    };

    const onInputKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submit();
    };

    const onOkClick = (): void => {
      submit();
    };

    pendingNamePromptCleanup = () => {
      namePromptInputElement.removeEventListener("keydown", onInputKeyDown);
      namePromptOkButton.removeEventListener("click", onOkClick);
    };

    namePromptInputElement.addEventListener("keydown", onInputKeyDown);
    namePromptOkButton.addEventListener("click", onOkClick);

    window.setTimeout(() => {
      if (pendingNamePromptResolve === resolve) {
        namePromptInputElement.focus();
        namePromptInputElement.select();
      }
    }, 0);
  });
};

const isLeaderboardEnabled = (): boolean => {
  return leaderboardClient.isEnabled();
};

const formatLeaderboardTimestampGmt = (createdAt: string): string => {
  const timestamp = new Date(createdAt);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown time (GMT)";
  }

  return timestamp.toUTCString();
};

const createLeaderboardEntryKey = (entry: LeaderboardScoreEntry): string => {
  return [
    entry.playerName,
    entry.timeMs.toString(),
    entry.attempts.toString(),
    entry.difficultyId,
    entry.difficultyLabel,
    entry.emojiSetId,
    entry.emojiSetLabel,
    entry.scoreMultiplier.toString(),
    entry.scoreValue.toString(),
    String(entry.isAutoDemo),
    entry.createdAt,
  ].join("|");
};

type LeaderboardSubmissionIdentity = Pick<
  LeaderboardScoreEntry,
  "playerName"
  | "timeMs"
  | "attempts"
  | "difficultyId"
  | "difficultyLabel"
  | "emojiSetId"
  | "emojiSetLabel"
  | "scoreMultiplier"
  | "scoreValue"
  | "isAutoDemo"
>;

const createLeaderboardSubmissionIdentity = (
  value: LeaderboardSubmissionIdentity,
): string => {
  return [
    value.playerName,
    value.timeMs.toString(),
    value.attempts.toString(),
    value.difficultyId,
    value.difficultyLabel,
    value.emojiSetId,
    value.emojiSetLabel,
    value.scoreMultiplier.toString(),
    value.scoreValue.toString(),
    String(value.isAutoDemo),
  ].join("|");
};

const resolveLastSubmittedLeaderboardEntryKey = (
  entries: readonly LeaderboardScoreEntry[],
  submittedScore: LeaderboardSubmissionIdentity,
): string | null => {
  const submittedIdentity = createLeaderboardSubmissionIdentity(submittedScore);
  let mostRecentMatch: LeaderboardScoreEntry | null = null;
  let mostRecentMatchTimestamp = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    if (createLeaderboardSubmissionIdentity(entry) !== submittedIdentity) {
      continue;
    }

    const entryTimestamp = Date.parse(entry.createdAt);

    if (
      mostRecentMatch === null
      || (Number.isFinite(entryTimestamp) && entryTimestamp > mostRecentMatchTimestamp)
      || (!Number.isFinite(entryTimestamp) && entry.createdAt > mostRecentMatch.createdAt)
    ) {
      mostRecentMatch = entry;
      mostRecentMatchTimestamp = entryTimestamp;
    }
  }

  if (mostRecentMatch === null) {
    return null;
  }

  return createLeaderboardEntryKey(mostRecentMatch);
};

const resolveMostRecentLeaderboardEntryKey = (
  entries: readonly LeaderboardScoreEntry[],
): string | null => {
  if (entries.length === 0) {
    return null;
  }

  let mostRecent = entries[0];
  let mostRecentTimestamp = Date.parse(entries[0].createdAt);

  for (let index = 1; index < entries.length; index += 1) {
    const entry = entries[index];
    const entryTimestamp = Date.parse(entry.createdAt);
    const hasValidEntryTimestamp = Number.isFinite(entryTimestamp);
    const hasValidMostRecentTimestamp = Number.isFinite(mostRecentTimestamp);

    if (
      (hasValidEntryTimestamp && !hasValidMostRecentTimestamp)
      || (hasValidEntryTimestamp && hasValidMostRecentTimestamp && entryTimestamp > mostRecentTimestamp)
      || (!hasValidEntryTimestamp && !hasValidMostRecentTimestamp && entry.createdAt > mostRecent.createdAt)
    ) {
      mostRecent = entry;
      mostRecentTimestamp = entryTimestamp;
    }
  }

  return createLeaderboardEntryKey(mostRecent);
};

const getLeaderboardStatusText = (): string => {
  if (!isLeaderboardEnabled()) {
    return "High scores are disabled.";
  }

  if (leaderboardEntries.length === 0) {
    return "No scores yet. Be the first!";
  }

  return "Sorted by highest score, then most recent time.";
};

const createLeaderboardListRow = (
  entry: LeaderboardScoreEntry,
  index: number,
  isRecent: boolean,
): HTMLTableRowElement => {
  const row = document.createElement("tr");
  row.className = "leaderboard-row";

  if (isRecent) {
    row.classList.add("leaderboard-row-recent");
  }

  const rankCell = document.createElement("td");
  rankCell.className = "leaderboard-cell leaderboard-cell-rank u-shadow-physical";
  rankCell.textContent = String(Math.min(index + 1, runtimeState.ui.leaderboardVisibleRowCount));

  const playerCell = document.createElement("td");
  playerCell.className = "leaderboard-cell leaderboard-cell-player u-shadow-physical";
  playerCell.textContent = entry.playerName;

  if (entry.isAutoDemo || entry.difficultyLabel.toLowerCase() === "debug") {
    const suffix: string[] = [];
    if (entry.difficultyLabel.toLowerCase() === "debug") {
      suffix.push("debug");
    }
    if (entry.isAutoDemo) {
      suffix.push("auto");
    }
    playerCell.textContent = `${entry.playerName} (${suffix.join(", ")})`;
  }

  const scoreCell = document.createElement("td");
  scoreCell.className = "leaderboard-cell leaderboard-cell-score u-shadow-physical";
  scoreCell.textContent = entry.scoreValue.toString();

  const difficultyCell = document.createElement("td");
  difficultyCell.className = "leaderboard-cell u-shadow-physical";
  difficultyCell.textContent = entry.difficultyLabel;

  const emojiSetCell = document.createElement("td");
  emojiSetCell.className = "leaderboard-cell u-shadow-physical";
  emojiSetCell.textContent = entry.emojiSetLabel;

  const timeCell = document.createElement("td");
  timeCell.className = "leaderboard-cell leaderboard-cell-time u-shadow-physical";
  timeCell.textContent = formatLeaderboardTimestampGmt(entry.createdAt);

  row.append(rankCell, playerCell, scoreCell, difficultyCell, emojiSetCell, timeCell);
  return row;
};

const renderLeaderboard = (): void => {
  leaderboardStatusElement.textContent = getLeaderboardStatusText();

  if (!isLeaderboardEnabled()) {
    leaderboardListElement.replaceChildren();
    leaderboardTableWrapElement.hidden = true;
    return;
  }

  const cappedEntries = leaderboardEntries.slice(0, runtimeState.ui.leaderboardVisibleRowCount);
  const hasSubmittedEntryInView =
    lastSubmittedLeaderboardEntryKey !== null
    && cappedEntries.some((entry) => createLeaderboardEntryKey(entry) === lastSubmittedLeaderboardEntryKey);
  const recentLeaderboardEntryKey = hasSubmittedEntryInView
    ? lastSubmittedLeaderboardEntryKey
    : lastSubmittedLeaderboardEntryKey === null
      ? resolveMostRecentLeaderboardEntryKey(cappedEntries)
      : null;
  const rows: HTMLTableRowElement[] = cappedEntries.map((entry, index) =>
    createLeaderboardListRow(
      entry,
      index,
      recentLeaderboardEntryKey !== null && createLeaderboardEntryKey(entry) === recentLeaderboardEntryKey,
    ),
  );

  leaderboardTableWrapElement.hidden = false;
  leaderboardListElement.replaceChildren(...rows);
};

const refreshLeaderboard = async (): Promise<void> => {
  leaderboardEntries = await leaderboardClient.fetchTopScores();
  renderLeaderboard();
};

const showLeaderboardFrame = (): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
  stopHudTimer();
  closeDebugMenu();

  menuFrame.hidden = true;
  leaderboardFrame.hidden = false;
  settingsFrame.hidden = true;
  gameFrame.hidden = true;
  debugTilesFrame.hidden = true;
  topbarMenuLabel.textContent = "High Scores";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  leaderboardBackButton.hidden = false;
  setDifficultySelection("");
  session = { mode: "menu" };
  void refreshLeaderboard();
  uiView.setStatus("Showing local high scores.");
};

const hasActiveGame = (value: AppSession): value is ActiveGameSession => {
  return value.mode !== "menu";
};

const isDebugTilesSession = (
  value: AppSession,
): value is ActiveGameSession & { mode: "debug-tiles" } => {
  return value.mode === "debug-tiles";
};

const computeTileLayout = (difficulty: DifficultyConfig): TileLayout => {
  const tileCount = difficulty.rows * difficulty.columns;
  const blocked = tileCount % 2 !== 0;
  const matchableTileCount = blocked ? tileCount - 1 : tileCount;
  const pairCount = matchableTileCount / 2;

  return {
    tileCount,
    hasBlockedTile: blocked,
    matchableTileCount,
    pairCount,
  };
};

const getDifficultyById = (id: string): DifficultyConfig | null => {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? null;
};

const getDefaultDifficulty = (): DifficultyConfig => {
  const difficulty = getDifficultyById(DEFAULT_DIFFICULTY_ID);

  if (difficulty === null) {
    throw new Error(
      `Required default difficulty not found: ${DEFAULT_DIFFICULTY_ID}`,
    );
  }

  return difficulty;
};

const createDeckForDifficulty = (difficulty: DifficultyConfig): string[] => {
  const { hasBlockedTile: blocked, pairCount } = computeTileLayout(difficulty);
  const deck = generateEmojiDeck(pairCount, selectedEmojiPackId);

  if (!blocked) {
    return deck;
  }

  return shuffle([...deck, BLOCKED_TILE_TOKEN]);
};

const setDifficultySelection = (selectedId: string): void => {
  for (const button of difficultyButtons) {
    const isSelected = button.dataset.difficulty === selectedId;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
};

const stopHudTimer = (): void => {
  timerIntervalGeneration += 1;

  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
};

const cancelAutoDemo = (): void => {
  autoDemoGeneration += 1;
};

const startHudTimer = (): void => {
  stopHudTimer();

  const generation = timerIntervalGeneration;
  const gameplayTiming = getGameplayTiming();

  timerIntervalId = window.setInterval(() => {
    if (generation !== timerIntervalGeneration || !hasActiveGame(session)) {
      return;
    }

    uiView.setTime(formatElapsedTime(session.gameplay.getElapsedTimeMs()));
  }, gameplayTiming.uiTimerUpdateIntervalMs);
};

const showMenuFrame = (): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
  stopHudTimer();
  closeDebugMenu();

  menuFrame.hidden = false;
  leaderboardFrame.hidden = true;
  settingsFrame.hidden = true;
  gameFrame.hidden = true;
  debugTilesFrame.hidden = true;
  topbarMenuLabel.textContent = "Select a difficulty";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  leaderboardBackButton.hidden = true;
  uiView.setStatus("Select difficulty.");
  setDifficultySelection("");
  session = { mode: "menu" };
};

const showGameFrame = (): void => {
  startHudTimer();
  closeDebugMenu();

  menuFrame.hidden = true;
  leaderboardFrame.hidden = true;
  settingsFrame.hidden = true;
  gameFrame.hidden = false;
  debugTilesFrame.hidden = true;
  topbarMenuLabel.textContent = "MEMORYBLOX";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = true;
  statusMessageElement.hidden = false;
  leaderboardBackButton.hidden = true;
};

const showDebugTilesFrame = (): void => {
  startHudTimer();
  closeDebugMenu();

  menuFrame.hidden = true;
  leaderboardFrame.hidden = true;
  settingsFrame.hidden = true;
  gameFrame.hidden = true;
  debugTilesFrame.hidden = false;
  topbarMenuLabel.textContent = "Debug: Tiles";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = true;
  statusMessageElement.hidden = false;
  leaderboardBackButton.hidden = true;
};

const showSettingsFrame = (): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
  stopHudTimer();
  closeDebugMenu();

  menuFrame.hidden = true;
  leaderboardFrame.hidden = true;
  settingsFrame.hidden = false;
  gameFrame.hidden = true;
  debugTilesFrame.hidden = true;
  topbarMenuLabel.textContent = "Settings";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  leaderboardBackButton.hidden = true;
  uiView.setStatus("Select an emoji pack.");
  setDifficultySelection("");
  session = { mode: "menu" };
  pendingEmojiPackId = selectedEmojiPackId;
  renderEmojiPackSelection();
};

const openDebugMenu = (): void => {
  debugMenuPanel.hidden = false;
  debugMenuButton.setAttribute("aria-expanded", "true");
};

const closeDebugMenu = (): void => {
  debugMenuPanel.hidden = true;
  debugMenuButton.setAttribute("aria-expanded", "false");
};

const toggleDebugMenu = (): void => {
  if (debugMenuPanel.hidden) {
    openDebugMenu();
    return;
  }

  closeDebugMenu();
};

const getDifficultyStatusMessage = (difficulty: DifficultyConfig): string => {
  const suffix = computeTileLayout(difficulty).hasBlockedTile
    ? " One tile is blocked."
    : "";

  return `Difficulty: ${difficulty.label}. Find all matching pairs.${suffix}`;
};

const startGameForDifficulty = (difficulty: DifficultyConfig): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
  boardView.resetBackFaceCache();
  debugBoardView.resetBackFaceCache();
  session = {
    mode: "game",
    difficulty,
    emojiSetId: selectedEmojiPackId,
    emojiSetLabel: getEmojiPackLabel(selectedEmojiPackId),
    scoreCategory: "standard",
    isAutoDemoScore: false,
    gameplay: createGameplayEngine({
      rows: difficulty.rows,
      columns: difficulty.columns,
      deck: createDeckForDifficulty(difficulty),
    }),
  };
  showGameFrame();
  setDifficultySelection(difficulty.id);
  uiView.setStatus(getDifficultyStatusMessage(difficulty));
  render();
};

const startDebugTilesMode = (): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
  boardView.resetBackFaceCache();
  debugBoardView.resetBackFaceCache();
  session = {
    mode: "debug-tiles",
    difficulty: DEBUG_TILES_DIFFICULTY,
    emojiSetId: selectedEmojiPackId,
    emojiSetLabel: getEmojiPackLabel(selectedEmojiPackId),
    scoreCategory: "debug",
    isAutoDemoScore: false,
    gameplay: createGameplayEngine({
      rows: DEBUG_TILES_DIFFICULTY.rows,
      columns: DEBUG_TILES_DIFFICULTY.columns,
      deck: createDeckForDifficulty(DEBUG_TILES_DIFFICULTY),
    }),
  };
  showDebugTilesFrame();
  setDifficultySelection("");
  uiView.setStatus("Debug Tiles: match the pair to test tile visuals.");
  render();
};

const markSessionAsDebugScored = (): void => {
  if (!hasActiveGame(session)) {
    return;
  }

  session.scoreCategory = "debug";
};

const ensureMainGameForDebug = (): void => {
  if (hasActiveGame(session) && !isDebugTilesSession(session)) {
    return;
  }

  startGameForDifficulty(getDefaultDifficulty());
};

const setDebugNearWinState = (): void => {
  ensureMainGameForDebug();

  if (!hasActiveGame(session) || isDebugTilesSession(session)) {
    return;
  }

  clearMismatchResolveTimeout();
  cancelAutoDemo();
  winFxController.clear();
  clearWinSequence();
  markSessionAsDebugScored();

  const nearWinState = session.gameplay.prepareNearWinState();

  if (nearWinState.remainingPair === null) {
    return;
  }

  showGameFrame();
  render();

  for (const [firstIndex, secondIndex] of nearWinState.matchedPairs) {
    boardView.animateMatchedPair(firstIndex, secondIndex, 0);
  }

  uiView.setStatus("Debug Win: match the final pair.");
};

/**
 * Handles a tile selection originating from either the player or the auto-demo.
 *
 * The `selectionSource` parameter is critical for demo mode:
 * - When `selectionSource` is `"player"` (the default), any in‑progress auto-demo is cancelled.
 * - When `selectionSource` is `"demo"`, the selection is treated as part of the scripted demo
 *   and does not cancel the auto-demo.
 *
 * This allows the same handler to be reused for both interactive and demo-driven
 * tile selections while preserving correct demo behavior.
 *
 * @param index - Zero-based index of the selected tile within the current board.
 * @param selectionSource - Origin of the selection, which controls whether the auto-demo
 *   should be cancelled (`"player"`) or preserved (`"demo"`).
 */
const handleTileSelect = (
  index: number,
  selectionSource: "player" | "demo" = "player",
): void => {
  if (!hasActiveGame(session)) {
    return;
  }

  clearMismatchResolveTimeout();

  if (selectionSource === "player") {
    cancelAutoDemo();

    const normalizedFlags = normalizeScoreFlagsForPlayerSelection({
      mode: session.mode,
      scoreCategory: session.scoreCategory,
      isAutoDemoScore: session.isAutoDemoScore,
    });

    session.scoreCategory = normalizedFlags.scoreCategory;
    session.isAutoDemoScore = normalizedFlags.isAutoDemoScore;
  }

  const gameplay = session.gameplay;
  const selectionResult = gameplay.selectTile(index);

  if (selectionResult.type === "ignored") {
    return;
  }

  render();

  if (selectionResult.type === "mismatch") {
    uiView.setStatus("No match. Try again.");

    const mismatchGeneration = mismatchResolveGeneration;
    const mismatchGameplay = gameplay;
    mismatchResolveTimeoutId = window.setTimeout(() => {
      mismatchResolveTimeoutId = null;

      if (
        mismatchGeneration !== mismatchResolveGeneration
        || !hasActiveGame(session)
        || session.gameplay !== mismatchGameplay
      ) {
        return;
      }

      mismatchGameplay.resolveMismatch(
        selectionResult.firstIndex,
        selectionResult.secondIndex,
      );
      render();
      uiView.setStatus("Pick another tile.");
    }, getScaledMismatchDelay());

    return;
  }

  if (selectionResult.type === "match") {
    const activeBoardView = session.mode === "debug-tiles" ? debugBoardView : boardView;

    if (selectionResult.won) {
      const winningSession = session;
      const winningGameplay = gameplay;
      const firstIndex = selectionResult.firstIndex;
      const secondIndex = selectionResult.secondIndex;

      void (async () => {
        const isAutoDemoWin = selectionSource === "demo";
        const playerName = isAutoDemoWin ? "Demo" : await promptForPlayerNameInUi();

        if (
          !hasActiveGame(session)
          || session !== winningSession
          || session.gameplay !== winningGameplay
        ) {
          return;
        }

        activeBoardView.animateMatchedPair(
          firstIndex,
          secondIndex,
          scaleByAnimationSpeed(getGameplayTiming().matchedDisappearPauseMs),
        );

        const elapsedTimeMs = winningGameplay.getElapsedTimeMs();
        const attempts = winningGameplay.getAttempts();
        const scoreResult = computeLeaderboardScoreResult(
          session.difficulty,
          session.mode,
          session.scoreCategory,
          isAutoDemoWin,
          elapsedTimeMs,
          attempts,
        );

        uiView.setStatus("You win!");
        void submitWinToLeaderboard(
          playerName,
          session.difficulty,
          session.mode,
          session.emojiSetId,
          session.emojiSetLabel,
          session.scoreCategory,
          isAutoDemoWin,
          elapsedTimeMs,
          attempts,
        );
        playWinSequenceWithText(
          `Congratulations ${playerName}!\nYour score was ${scoreResult.scoreValue.toLocaleString()}`,
        );
      })();
    } else {
      activeBoardView.animateMatchedPair(
        selectionResult.firstIndex,
        selectionResult.secondIndex,
        scaleByAnimationSpeed(getGameplayTiming().matchedDisappearPauseMs),
      );
      uiView.setStatus("Match!");
    }
    return;
  }

  uiView.setStatus("Pick another tile.");
};

const render = (): void => {
  if (!hasActiveGame(session)) {
    uiView.setAttempts(0);
    uiView.setTime("00:00");
    return;
  }

  const presentation = createGamePresentationModel(session.gameplay);

  if (session.mode === "debug-tiles") {
    debugBoardView.render(presentation.boardTiles, presentation.columns);
  } else {
    boardView.render(presentation.boardTiles, presentation.columns);
  }

  uiView.setAttempts(presentation.attempts);
  uiView.setTime(presentation.elapsedTime);
};

const uiView = new UiView(
  timeValueElement,
  attemptsValueElement,
  statusMessageElement,
);

const boardView = new BoardView(boardElement, handleTileSelect);
const debugBoardView = new BoardView(debugTilesBoardElement, handleTileSelect);

const runAutoMatchPair = (
  pair: [number, number],
  generation: number,
  gameplay: GameplayEngine,
): void => {
  const gameplayTiming = getGameplayTiming();

  if (
    generation !== autoDemoGeneration
    || !hasActiveGame(session)
    || session.gameplay !== gameplay
  ) {
    return;
  }

  handleTileSelect(pair[0], "demo");

  window.setTimeout(() => {
    if (
      generation !== autoDemoGeneration
      || !hasActiveGame(session)
      || session.gameplay !== gameplay
    ) {
      return;
    }

    handleTileSelect(pair[1], "demo");
  }, scaleByAnimationSpeed(gameplayTiming.autoMatchSecondSelectionDelayMs));
};

const runAutoMatchDemoStep = (remainingPairs: number, generation: number): void => {
  const gameplayTiming = getGameplayTiming();

  if (generation !== autoDemoGeneration || !hasActiveGame(session)) {
    return;
  }

  if (remainingPairs <= 0) {
    uiView.setStatus("Demo complete.");
    return;
  }

  const pair = session.gameplay.findFirstUnmatchedPairIndices();

  if (pair === null) {
    uiView.setStatus("Demo complete.");
    return;
  }

  uiView.setStatus("Demo running...");
  runAutoMatchPair(pair, generation, session.gameplay);

  window.setTimeout(() => {
    if (generation !== autoDemoGeneration || !hasActiveGame(session)) {
      return;
    }

    if (session.gameplay.isWon()) {
      return;
    }

    runAutoMatchDemoStep(remainingPairs - 1, generation);
  }, scaleByAnimationSpeed(
    gameplayTiming.autoMatchSecondSelectionDelayMs + gameplayTiming.autoMatchBetweenPairsDelayMs,
  ));
};

const runAutoMatchDemo = (pairCount?: number): void => {
  if (!hasActiveGame(session)) {
    uiView.setStatus("Start a game to run the demo.");
    return;
  }

  markSessionAsDebugScored();
  session.isAutoDemoScore = true;
  cancelAutoDemo();
  const generation = autoDemoGeneration;
  const targetPairCount = pairCount ?? session.gameplay.getRemainingUnmatchedPairCount();
  runAutoMatchDemoStep(targetPairCount, generation);
};

const startDemoFromMenu = (): void => {
  const defaultDifficulty = getDefaultDifficulty();
  startGameForDifficulty(defaultDifficulty);
  const gameplayTiming = getGameplayTiming();

  window.setTimeout(() => {
    runAutoMatchDemo();
  }, scaleByAnimationSpeed(gameplayTiming.autoMatchBootDelayMs));
};

const loadRuntimeConfig = async (): Promise<void> => {
  const [uiConfig, winFxConfig, leaderboardConfig] = await Promise.all([
    loadUiRuntimeConfig(),
    loadWinFxRuntimeConfig(),
    loadLeaderboardRuntimeConfig(),
  ]);

  runtimeState.ui = {
    ...uiConfig,
    boardLayout: { ...uiConfig.boardLayout },
    gameplayTiming: { ...uiConfig.gameplayTiming },
    visualEffects: { ...uiConfig.visualEffects },
    windowBaseSize: { ...uiConfig.windowBaseSize },
    windowResizeLimits: { ...uiConfig.windowResizeLimits },
    animationSpeed: { ...uiConfig.animationSpeed },
  };

  document.documentElement.style.setProperty(
    "--animation-speed-default",
    runtimeState.ui.animationSpeed.defaultSpeed.toString(),
  );
  document.documentElement.style.setProperty(
    "--tile-global-opacity",
    runtimeState.ui.tileGlobalOpacity.toString(),
  );
  document.documentElement.style.setProperty(
    "--tile-front-opacity",
    runtimeState.ui.tileFrontOpacity.toString(),
  );
  document.documentElement.style.setProperty(
    "--tile-back-opacity",
    runtimeState.ui.tileBackOpacity.toString(),
  );
  document.documentElement.style.setProperty(
    "--app-max-width-px",
    runtimeState.ui.appMaxWidthPx.toString(),
  );
  document.documentElement.style.setProperty(
    "--tile-flip-duration-ms",
    `${runtimeState.ui.visualEffects.tileFlipDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--tile-match-disappear-duration-ms",
    `${runtimeState.ui.gameplayTiming.matchedDisappearDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--tile-match-disappear-reduced-duration-ms",
    `${runtimeState.ui.gameplayTiming.reducedMotionMatchedDisappearDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-bg-drift-duration-ms",
    `${runtimeState.ui.visualEffects.plasmaBackgroundDriftDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-hue-cycle-duration-ms",
    `${runtimeState.ui.visualEffects.plasmaHueCycleDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-tile-drift-duration-ms",
    `${runtimeState.ui.visualEffects.plasmaTileDriftDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-glow-sweep-duration-ms",
    `${runtimeState.ui.visualEffects.plasmaGlowSweepDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-flares-shift-duration-ms",
    `${runtimeState.ui.visualEffects.plasmaFlaresShiftDurationMs}ms`,
  );
  document.documentElement.style.setProperty(
    "--plasma-glow-opacity",
    runtimeState.ui.visualEffects.plasmaGlowOpacity.toString(),
  );
  document.documentElement.style.setProperty(
    "--plasma-flares-opacity",
    runtimeState.ui.visualEffects.plasmaFlaresOpacity.toString(),
  );
  document.documentElement.style.setProperty(
    "--plasma-tile-index-offset-delay-ms",
    `${runtimeState.ui.visualEffects.plasmaTileIndexOffsetDelayMs}ms`,
  );

  winFxController.setAnimationSpeedBounds(
    runtimeState.ui.animationSpeed.minSpeed,
    runtimeState.ui.animationSpeed.maxSpeed,
  );
  boardView.setLayoutConfig(runtimeState.ui.boardLayout);
  debugBoardView.setLayoutConfig(runtimeState.ui.boardLayout);
  setFlagEmojiCdnBaseUrl(runtimeState.ui.flagEmojiCdnBaseUrl);
  winFxController.configureRuntime(winFxConfig);
  leaderboardRuntimeConfig = {
    ...leaderboardConfig,
    scoring: { ...leaderboardConfig.scoring },
  };
  leaderboardClient = new LeaderboardClient(leaderboardRuntimeConfig);
  renderLeaderboard();
};

const enforceEmojiPackParity = (): void => {
  const packCount = emojiPacks.length;

  if (packCount % 2 === 0) {
    return;
  }

  const message = "[MEMORYBLOX] Emoji pack count is odd; keep it even to preserve the 2-column Settings grid.";

  if (runtimeState.ui.emojiPackParityMode === "warn") {
    console.warn(message);
    return;
  }

  throw new Error(message);
};

const params = new URLSearchParams(window.location.search);

difficultyMenu.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("button[data-difficulty]");

  if (button === null) {
    return;
  }

  const difficultyId = button.dataset.difficulty;

  if (difficultyId === undefined) {
    return;
  }

  const difficulty = getDifficultyById(difficultyId);

  if (difficulty === null) {
    return;
  }

  startGameForDifficulty(difficulty);
});

// Intentional behavior: allow starting the auto-match demo via URL query
// parameter, e.g. https://.../index.html?demo=match. This is primarily a
// debug/demo entry point and is not shown in the in-game UI.
if (params.get("demo") === "match") {
  startDemoFromMenu();
}

menuButton.addEventListener("click", () => {
  closeDebugMenu();
  showMenuFrame();
});

debugMenuButton.addEventListener("click", () => {
  toggleDebugMenu();
});

debugDemoButton.addEventListener("click", () => {
  closeDebugMenu();

  if (hasActiveGame(session)) {
    runAutoMatchDemo();
    return;
  }

  startDemoFromMenu();
});

debugWinButton.addEventListener("click", () => {
  closeDebugMenu();
  setDebugNearWinState();
});

debugTilesButton.addEventListener("click", () => {
  closeDebugMenu();
  startDebugTilesMode();
});

menuSettingsButton.addEventListener("click", () => {
  showSettingsFrame();
});

menuHighScoresButton.addEventListener("click", () => {
  showLeaderboardFrame();
});

leaderboardBackButton.addEventListener("click", () => {
  showMenuFrame();
});

settingsPackListElement.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("button[data-pack-id]");

  if (button === null) {
    return;
  }

  const packId = button.dataset.packId;

  if (packId === undefined || !isEmojiPackId(packId)) {
    return;
  }

  setPendingEmojiPack(packId);
  uiView.setStatus("Pack selected. Click Apply changes to confirm.");
});

settingsApplyButton.addEventListener("click", () => {
  const didApplyChanges = applyPendingEmojiPack();
  showMenuFrame();
  uiView.setStatus(
    didApplyChanges
      ? "Settings changes applied."
      : "No changes to apply.",
  );
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  if (!debugMenuRoot.contains(target)) {
    closeDebugMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!leaderboardFrame.hidden) {
    showMenuFrame();
    return;
  }

  closeDebugMenu();
});

resizeHandleElement.addEventListener("pointerdown", beginResizeDrag);
resizeHandleElement.addEventListener("pointerup", finishResizeDrag);
resizeHandleElement.addEventListener("pointercancel", finishResizeDrag);

window.addEventListener("resize", () => {
  if (windowResizeState === null) {
    return;
  }

  applyWindowScale(windowResizeState.scale, false);
});

enableHorizontalWheelScroll(topbarActionsElement);

const bootstrap = async (): Promise<void> => {
  validateUniquePackIcons();
  validateMinPackIconCount();
  await loadRuntimeConfig();
  enforceEmojiPackParity();
  initializeEmojiPackSettings();
  applySelectedAnimationSpeed(runtimeState.ui.animationSpeed.defaultSpeed);
  await initializeDropShadow();
  showMenuFrame();
  render();

  window.requestAnimationFrame(() => {
    initializeWindowResizeState();
  });
};

bootstrap().catch((error: unknown) => {
  console.error("[MEMORYBLOX] Failed to bootstrap application.", error);
});