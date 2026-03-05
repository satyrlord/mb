import { BoardView } from "./board.js";
import {
  DEBUG_TILES_DIFFICULTY,
  DEFAULT_DIFFICULTY_ID,
  getDifficultyById,
  type DifficultyConfig,
} from "./difficulty.js";
import { setFlagEmojiCdnBaseUrl } from "./flag-emoji.js";
import {
  createGameplayEngine,
  type GameplayEngine,
} from "./gameplay.js";
import {
  DEFAULT_EMOJI_PACK_ID,
  generateEmojiDeck,
  getEmojiPacks,
  MIN_COPIES_PER_ICON,
  OPENMOJI_IMPORTED_ICON_TOKENS,
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
  computeGameScoreResult,
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  LeaderboardClient,
  loadLeaderboardRuntimeConfig,
  type LeaderboardRuntimeConfig,
  type LeaderboardScoreEntry,
} from "./leaderboard.js";
import { normalizeScoreFlagsForPlayerSelection } from "./session-score.js";
import {
  clampTileMultiplier,
  computeTileLayout,
} from "./tile-layout.js";
import { UiView } from "./ui.js";
import {
  clamp,
  enableHorizontalWheelScroll,
  enableSliderWheelScroll,
  formatElapsedTime,
  requireElement,
  sanitizePlayerName,
  shuffle,
} from "./utils.js";
import { WinFxController } from "./win-fx.js";
import { SoundManager } from "./sound-manager.js";
import { WindowResizeController } from "./window-resize.js";

const EMOJI_PACK_STORAGE_KEY = "memoryblox-emoji-pack";
const TILE_MULTIPLIER_STORAGE_KEY = "memoryblox-tile-multiplier";
const ANIMATION_SPEED_STORAGE_KEY = "memoryblox-animation-speed";
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

/** When true, render() overrides all tile statuses to "revealed" without matching them. */
let debugFlipAllTiles = false;

interface ActiveGameSession {
  mode: "game" | "debug-tiles";
  difficulty: DifficultyConfig;
  emojiSetId: EmojiPackId;
  emojiSetLabel: string;
  tileMultiplier: number;
  gameplay: GameplayEngine;
  scoreCategory: "standard" | "debug";
  isAutoDemoScore: boolean;
  usedFlipTiles: boolean;
}

type AppSession =
  | {
    mode: "menu";
  }
  | ActiveGameSession;

// Fallback shadow values are defined in `src/shadow-config.ts` and intentionally
// match the `balanced` preset in `config/shadow.cfg`.


const boardElement = requireElement<HTMLElement>("#board");
const appShellElement = requireElement<HTMLElement>("#appShell");
const appWindowElement = requireElement<HTMLElement>("#appWindow");
const timeValueElement = requireElement<HTMLElement>("#timeValue");
const attemptsValueElement = requireElement<HTMLElement>("#attemptsValue");
const statusMessageElement = requireElement<HTMLElement>("#statusMessage");
const plasmaWarningElement = requireElement<HTMLElement>("#plasmaWarning");
const audioUnlockNoticeElement = requireElement<HTMLElement>("#audioUnlockNotice");
const topbarMenuLabel = requireElement<HTMLElement>("#topbarMenuLabel");
const topbarActionsElement = requireElement<HTMLElement>(".topbar-actions");
const menuBottomRepo = requireElement<HTMLElement>("#menuBottomRepo");
const debugMenuRoot = requireElement<HTMLElement>("#debugMenuRoot");
const debugMenuButton = requireElement<HTMLButtonElement>("#debugMenuButton");
const debugMenuPanel = requireElement<HTMLElement>("#debugMenuPanel");
const debugDemoButton = requireElement<HTMLButtonElement>("#debugDemoButton");
const debugWinButton = requireElement<HTMLButtonElement>("#debugWinButton");
const debugTilesButton = requireElement<HTMLButtonElement>("#debugTilesButton");
const debugSvgImportsButton = requireElement<HTMLButtonElement>("#debugSvgImportsButton");
const debugFlipTilesButton = requireElement<HTMLButtonElement>("#debugFlipTilesButton");
const muteMusicButton = requireElement<HTMLButtonElement>("#muteMusicButton");
const muteMusicIconOn = requireElement<HTMLElement>("#muteMusicIconOn");
const muteMusicIconOff = requireElement<HTMLElement>("#muteMusicIconOff");
const muteMusicStateText = requireElement<HTMLElement>("#muteMusicStateText");
const muteSoundButton = requireElement<HTMLButtonElement>("#muteSoundButton");
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
const settingsTileMultiplierInput = requireElement<HTMLInputElement>("#settingsTileMultiplier");
const settingsAnimationSpeedInput = requireElement<HTMLInputElement>("#settingsAnimationSpeed");
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

// ── Frame visibility management ──────────────────────────────────────────────────

type FrameName = "menu" | "leaderboard" | "settings" | "game" | "debugTiles";

const frameElements: Record<FrameName, HTMLElement> = {
  menu: menuFrame,
  leaderboard: leaderboardFrame,
  settings: settingsFrame,
  game: gameFrame,
  debugTiles: debugTilesFrame,
};

/** Sets exactly one frame visible and hides all others. */
const setActiveFrame = (activeFrame: FrameName): void => {
  for (const [name, element] of Object.entries(frameElements)) {
    element.hidden = name !== activeFrame;
  }
};

let session: AppSession = { mode: "menu" };

// ── Cancellable timer & async-sequence state ─────────────────────────────
/**
 * Each cancellable timer or async chain uses an `AbortController` whose
 * signal is captured at the start of the operation and checked inside
 * every callback or continuation.  Calling `.abort()` on the controller
 * instantly marks the signal as aborted, causing all outstanding callbacks
 * to bail out the next time they check `signal.aborted`.
 */
let timerIntervalId: number | null = null;
let timerAbortController: AbortController | null = null;
let autoDemoAbortController: AbortController | null = null;
let mismatchResolveTimeoutId: number | null = null;
let mismatchAbortController: AbortController | null = null;
let winSequenceTimeoutId: number | null = null;
let winSequenceAbortController: AbortController | null = null;

/**
 * Settings state: two-phase commit model.
 *
 * `selected*` fields hold the live configuration applied to active games.
 * `pending*` fields hold uncommitted values shown in the Settings UI.
 * `applyPending*()` commits pending → selected and persists to localStorage.
 * Pending state resets to selected when the Settings frame opens, so
 * cancelling out of Settings discards uncommitted changes.
 */
let selectedEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
let pendingEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
let selectedTileMultiplier = 1;
let pendingTileMultiplier = 1;
let selectedAnimationSpeed = runtimeState.ui.animationSpeed.defaultSpeed;
let pendingAnimationSpeed = runtimeState.ui.animationSpeed.defaultSpeed;

/**
 * Runtime configuration and leaderboard persistence state.
 *
 * `shadowConfig` and `leaderboardRuntimeConfig` are loaded once during
 * bootstrap and may be reloaded via `loadRuntimeConfig()`.
 * `leaderboardClient` is reconstructed whenever the leaderboard config
 * changes. `leaderboardEntries` caches the most recently fetched scores.
 */
let shadowConfig: ShadowConfig = DEFAULT_SHADOW_CONFIG;
let leaderboardRuntimeConfig: LeaderboardRuntimeConfig = DEFAULT_LEADERBOARD_RUNTIME_CONFIG;
let leaderboardClient = new LeaderboardClient(DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
let leaderboardEntries: LeaderboardScoreEntry[] = [];
let lastSubmittedLeaderboardEntryKey: string | null = null;

/**
 * Name-prompt modal state.
 *
 * The prompt is shown once per win. `pendingNamePromptResolve` holds the
 * Promise resolver; `pendingNamePromptCleanup` removes event listeners
 * when the prompt closes. Both reset to `null` via `closePlayerNamePrompt()`.
 */
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
const soundManager = new SoundManager();

const updateAudioUnlockNotice = (): void => {
  const shouldShow = !menuFrame.hidden
    && soundManager.hasMusicTracks()
    && !soundManager.getMusicMuted()
    && !soundManager.isMusicPlaying()
    && !soundManager.isAudioContextRunning();

  audioUnlockNoticeElement.hidden = !shouldShow;
};

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

const clampAnimationSpeed = (speed: number): number => {
  const { minSpeed, maxSpeed } = runtimeState.ui.animationSpeed;
  return clamp(speed, minSpeed, maxSpeed);
};

const getGameplayTiming = (): UiRuntimeConfig["gameplayTiming"] => {
  return runtimeState.ui.gameplayTiming;
};

const clearMismatchResolveTimeout = (): void => {
  mismatchAbortController?.abort();
  mismatchAbortController = null;

  if (mismatchResolveTimeoutId !== null) {
    window.clearTimeout(mismatchResolveTimeoutId);
    mismatchResolveTimeoutId = null;
  }
};

const clearWinSequence = (): void => {
  winSequenceAbortController?.abort();
  winSequenceAbortController = null;

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

  winSequenceAbortController = new AbortController();
  const { signal } = winSequenceAbortController;
  const gameplayTiming = getGameplayTiming();
  const tileAnimationDuration = scaleByAnimationSpeed(gameplayTiming.matchedDisappearPauseMs)
    + getScaledMatchedDisappearDuration();
  const fadeDuration = scaleByAnimationSpeed(gameplayTiming.winCanvasFadeDurationMs);

  winSequenceTimeoutId = window.setTimeout(() => {
    if (signal.aborted || !hasActiveGame(session)) {
      return;
    }

    const activeFrame = getActiveGameCanvasFrame();

    if (activeFrame !== null) {
      activeFrame.classList.add("game-canvas-win-fade-out");
    }

    winSequenceTimeoutId = window.setTimeout(() => {
      winSequenceTimeoutId = null;

      if (signal.aborted || !hasActiveGame(session)) {
        return;
      }

      void (async () => {
        const winSoundDurationMs = await soundManager.playWin();

        if (signal.aborted || !hasActiveGame(session)) {
          return;
        }

        winFxController.play(() => {
          showMenuFrame();
        }, textOverride, winSoundDurationMs ?? undefined);
      })();
    }, fadeDuration);
  }, tileAnimationDuration);
};

interface SubmitWinToLeaderboardInput {
  playerName: string;
  difficulty: DifficultyConfig;
  sessionMode: ActiveGameSession["mode"];
  emojiSetId: EmojiPackId;
  emojiSetLabel: string;
  scoreCategory: "standard" | "debug";
  isAutoDemoScore: boolean;
  tileMultiplier: number;
  timeMs: number;
  attempts: number;
}

const submitWinToLeaderboard = async (
  input: SubmitWinToLeaderboardInput,
): Promise<void> => {
  const {
    playerName,
    difficulty,
    sessionMode,
    emojiSetId,
    emojiSetLabel,
    scoreCategory,
    isAutoDemoScore,
    tileMultiplier,
    timeMs,
    attempts,
  } = input;
  const leaderboardAvailable = isLeaderboardEnabled();

  try {
    const scoreResult = computeGameScoreResult({
      difficulty,
      sessionMode,
      scoreCategory,
      isAutoDemoScore,
      tileMultiplier,
      timeMs,
      attempts,
    }, leaderboardRuntimeConfig.scoring);
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
  } catch (error: unknown) {
    console.warn("[MEMORYBLOX] Leaderboard submission failed:", error);
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

/** Factor applied to primary shadow opacity to derive the secondary (ambient) shadow. */
const SECONDARY_SHADOW_OPACITY_FACTOR = 0.72;

const initializeDropShadow = async (): Promise<void> => {
  shadowConfig = await loadShadowConfig();
  const { leftOffsetPx, leftBlurPx, leftOpacity } = shadowConfig;
  const secondaryBlurPx = Math.max(1, leftBlurPx);
  const secondaryOpacity = clamp(leftOpacity * SECONDARY_SHADOW_OPACITY_FACTOR, 0, 1);
  const fmt = (n: number): string => n.toFixed(3);
  const shadowValue = `0 ${leftOffsetPx.toFixed(2)}px ${leftBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(leftOpacity)}), 0 0 ${secondaryBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(secondaryOpacity)})`;
  const shadowFilterValue = `drop-shadow(0 ${leftOffsetPx.toFixed(2)}px ${leftBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(leftOpacity)})) drop-shadow(0 0 ${secondaryBlurPx.toFixed(2)}px rgba(0,0,0,${fmt(secondaryOpacity)}))`;

  document.documentElement.style.setProperty("--shadow-text-physical", shadowValue);
  document.documentElement.style.setProperty("--shadow-filter-physical", shadowFilterValue);
};

const setPlasmaWarningVisible = (isVisible: boolean): void => {
  plasmaWarningElement.hidden = !isVisible;
};

const checkPlasmaTextureAvailability = async (): Promise<void> => {
  const plasmaUrl = new URL("./textures/plasma.png", window.location.href).toString();

  try {
    const response = await window.fetch(plasmaUrl, { cache: "no-cache" });

    if (!response.ok) {
      setPlasmaWarningVisible(true);
      return;
    }
  } catch (error) {
    console.warn("[MEMORYBLOX] Plasma texture check failed:", error);
    setPlasmaWarningVisible(true);
    return;
  }

  setPlasmaWarningVisible(false);
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

const readStoredTileMultiplier = (): number | null => {
  const value = window.localStorage.getItem(TILE_MULTIPLIER_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampTileMultiplier(parsed);
};

const writeStoredTileMultiplier = (multiplier: number): void => {
  window.localStorage.setItem(TILE_MULTIPLIER_STORAGE_KEY, multiplier.toString());
};

const readStoredAnimationSpeed = (): number | null => {
  const value = window.localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampAnimationSpeed(parsed);
};

const writeStoredAnimationSpeed = (speed: number): void => {
  window.localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, speed.toString());
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

const setPendingTileMultiplier = (multiplier: number): void => {
  pendingTileMultiplier = clampTileMultiplier(multiplier);
  settingsTileMultiplierInput.value = pendingTileMultiplier.toString();
};

const setPendingAnimationSpeed = (speed: number): void => {
  pendingAnimationSpeed = clampAnimationSpeed(speed);
  settingsAnimationSpeedInput.value = pendingAnimationSpeed.toString();
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

const applyPendingTileMultiplier = (): boolean => {
  if (pendingTileMultiplier === selectedTileMultiplier) {
    return false;
  }

  selectedTileMultiplier = pendingTileMultiplier;
  writeStoredTileMultiplier(selectedTileMultiplier);
  return true;
};

const applyPendingAnimationSpeed = (): boolean => {
  if (pendingAnimationSpeed === selectedAnimationSpeed) {
    return false;
  }

  applySelectedAnimationSpeed(pendingAnimationSpeed);
  writeStoredAnimationSpeed(pendingAnimationSpeed);
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
    button.setAttribute("aria-label", `Use ${pack.name} icon pack`);

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

const initializeTileMultiplierSettings = (): void => {
  const storedMultiplier = readStoredTileMultiplier();
  selectedTileMultiplier = clampTileMultiplier(storedMultiplier ?? 1);
  pendingTileMultiplier = selectedTileMultiplier;
  settingsTileMultiplierInput.value = selectedTileMultiplier.toString();
};

const initializeAnimationSpeedSettings = (): void => {
  const storedSpeed = readStoredAnimationSpeed();
  pendingAnimationSpeed = clampAnimationSpeed(
    storedSpeed ?? runtimeState.ui.animationSpeed.defaultSpeed,
  );
  applySelectedAnimationSpeed(pendingAnimationSpeed);
  settingsAnimationSpeedInput.value = pendingAnimationSpeed.toString();
};

const initializeMuteButtonStates = (): void => {
  const musicIsOn = !soundManager.getMusicMuted() && soundManager.isMusicPlaying();
  const soundMuted = soundManager.getSoundMuted();

  setMusicToggleButtonState(musicIsOn);

  muteSoundButton.setAttribute("aria-pressed", String(soundMuted));
  muteSoundButton.setAttribute("aria-label", soundMuted ? "Unmute sound effects" : "Mute sound effects");
  muteSoundButton.setAttribute("title", soundMuted ? "Unmute sound effects" : "Mute sound effects");
};

const setMusicToggleButtonState = (musicIsOn: boolean): void => {
  muteMusicButton.setAttribute("aria-pressed", String(musicIsOn));
  muteMusicButton.setAttribute("aria-label", musicIsOn ? "Pause music" : "Play music");
  muteMusicButton.setAttribute("title", musicIsOn ? "Pause music" : "Play music");
  muteMusicButton.dataset.muted = String(!musicIsOn);
  muteMusicIconOn.hidden = !musicIsOn;
  muteMusicIconOff.hidden = musicIsOn;
  muteMusicStateText.textContent = musicIsOn ? "ON" : "OFF";
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
  return JSON.stringify([
    entry.playerName,
    entry.timeMs,
    entry.attempts,
    entry.difficultyId,
    entry.difficultyLabel,
    entry.emojiSetId,
    entry.emojiSetLabel,
    entry.scoreMultiplier,
    entry.scoreValue,
    entry.isAutoDemo,
    entry.createdAt,
  ]);
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
  return JSON.stringify([
    value.playerName,
    value.timeMs,
    value.attempts,
    value.difficultyId,
    value.difficultyLabel,
    value.emojiSetId,
    value.emojiSetLabel,
    value.scoreMultiplier,
    value.scoreValue,
    value.isAutoDemo,
  ]);
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

const resetActiveEffects = (): void => {
  winFxController.clear();
  cancelAutoDemo();
  clearMismatchResolveTimeout();
  clearWinSequence();
};

/** Full cleanup for starting or restarting a game session. */
const resetForNewGame = (): void => {
  debugFlipAllTiles = false;
  resetActiveEffects();
  boardView.resetBackFaceCache();
  debugBoardView.resetBackFaceCache();
};

const showLeaderboardFrame = (): void => {
  resetActiveEffects();
  stopHudTimer();
  closeDebugMenu();

  setActiveFrame("leaderboard");
  topbarMenuLabel.textContent = "High Scores";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  audioUnlockNoticeElement.hidden = true;
  leaderboardBackButton.hidden = false;
  setDifficultySelection("");
  session = { mode: "menu" };
  void refreshLeaderboard().catch(() => {
    // Silently ignore — leaderboard display is best-effort.
  });
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
  const {
    multiSetCount,
    pairSetCount,
    multiSetCopies,
  } = computeTileLayout(difficulty, selectedTileMultiplier);
  const totalSetCount = multiSetCount + pairSetCount;
  const copiesPerIcon = [
    ...Array.from({ length: multiSetCount }, () => multiSetCopies),
    ...Array.from({ length: pairSetCount }, () => 2),
  ];

  return generateEmojiDeck(totalSetCount, selectedEmojiPackId, copiesPerIcon);
};

const setDifficultySelection = (selectedId: string): void => {
  for (const button of difficultyButtons) {
    const isSelected = button.dataset.difficulty === selectedId;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
};

const stopHudTimer = (): void => {
  timerAbortController?.abort();
  timerAbortController = null;

  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
};

const cancelAutoDemo = (): void => {
  autoDemoAbortController?.abort();
  autoDemoAbortController = null;
};

const startHudTimer = (): void => {
  stopHudTimer();

  timerAbortController = new AbortController();
  const { signal } = timerAbortController;
  const gameplayTiming = getGameplayTiming();

  timerIntervalId = window.setInterval(() => {
    if (signal.aborted || !hasActiveGame(session)) {
      return;
    }

    uiView.setTime(formatElapsedTime(session.gameplay.getElapsedTimeMs()));
  }, gameplayTiming.uiTimerUpdateIntervalMs);
};

const showMenuFrame = (): void => {
  resetActiveEffects();
  stopHudTimer();
  closeDebugMenu();

  setActiveFrame("menu");
  topbarMenuLabel.textContent = "Select a difficulty";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  leaderboardBackButton.hidden = true;
  uiView.setStatus("Select difficulty.");
  setDifficultySelection("");
  session = { mode: "menu" };
  void soundManager.playBackgroundMusic();
  updateAudioUnlockNotice();
};

const initializeMenuMusicAutoplayRecovery = (): void => {
  const removeRecoveryListeners = (): void => {
    document.removeEventListener("pointerdown", handleGestureAttempt);
    document.removeEventListener("keydown", handleGestureAttempt);
    document.removeEventListener("touchstart", handleGestureAttempt);
  };

  const tryStartMenuMusic = async (): Promise<void> => {
    await soundManager.playBackgroundMusic();
    updateAudioUnlockNotice();

    if (soundManager.isMusicPlaying() || soundManager.getMusicMuted()) {
      removeRecoveryListeners();
    }
  };

  const handleGestureAttempt = (): void => {
    void tryStartMenuMusic();
  };

  document.addEventListener("pointerdown", handleGestureAttempt);
  document.addEventListener("keydown", handleGestureAttempt);
  document.addEventListener("touchstart", handleGestureAttempt, { passive: true });
  updateAudioUnlockNotice();
  void tryStartMenuMusic();
};

const showGameFrame = (): void => {
  startHudTimer();
  closeDebugMenu();

  setActiveFrame("game");
  topbarMenuLabel.textContent = "MEMORYBLOX";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = true;
  statusMessageElement.hidden = false;
  audioUnlockNoticeElement.hidden = true;
  leaderboardBackButton.hidden = true;
};

const showDebugTilesFrame = (): void => {
  startHudTimer();
  closeDebugMenu();

  setActiveFrame("debugTiles");
  topbarMenuLabel.textContent = "Debug: Tiles";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = true;
  statusMessageElement.hidden = false;
  audioUnlockNoticeElement.hidden = true;
  leaderboardBackButton.hidden = true;
};

const showSettingsFrame = (): void => {
  resetActiveEffects();
  stopHudTimer();
  closeDebugMenu();

  setActiveFrame("settings");
  topbarMenuLabel.textContent = "Settings";
  topbarMenuLabel.hidden = false;
  menuBottomRepo.hidden = false;
  statusMessageElement.hidden = true;
  audioUnlockNoticeElement.hidden = true;
  leaderboardBackButton.hidden = true;
  uiView.setStatus("Select an icon pack.");
  setDifficultySelection("");
  session = { mode: "menu" };
  pendingEmojiPackId = selectedEmojiPackId;
  renderEmojiPackSelection();
  setPendingTileMultiplier(selectedTileMultiplier);
  setPendingAnimationSpeed(selectedAnimationSpeed);
};

const openDebugMenu = (): void => {
  debugFlipTilesButton.disabled = !hasActiveGame(session);
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
  return `Difficulty: ${difficulty.label}. Find all matching pairs.`;
};

const startGameForDifficulty = (difficulty: DifficultyConfig): void => {
  resetForNewGame();
  session = {
    mode: "game",
    difficulty,
    emojiSetId: selectedEmojiPackId,
    emojiSetLabel: getEmojiPackLabel(selectedEmojiPackId),
    tileMultiplier: selectedTileMultiplier,
    scoreCategory: "standard",
    isAutoDemoScore: false,
    usedFlipTiles: false,
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
  void soundManager.playBackgroundMusic();
  void soundManager.playNewGame();
};

const startDebugTilesMode = (): void => {
  resetForNewGame();
  session = {
    mode: "debug-tiles",
    difficulty: DEBUG_TILES_DIFFICULTY,
    emojiSetId: selectedEmojiPackId,
    emojiSetLabel: getEmojiPackLabel(selectedEmojiPackId),
    tileMultiplier: selectedTileMultiplier,
    scoreCategory: "debug",
    isAutoDemoScore: false,
    usedFlipTiles: false,
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
  void soundManager.playBackgroundMusic();
  void soundManager.playNewGame();
};

/**
 * Launches a Hard (5×10) debug game board populated exclusively from the on-disk
 * OpenMoji SVG import library. All 193 imported tokens are candidates; 25 are picked
 * at random and paired to fill the 50-tile grid. Scored as "debug" to avoid
 * leaderboard impact.
 */
const startDebugSvgImportsMode = (): void => {
  const svgHardDifficulty: DifficultyConfig = {
    id: "hard",
    label: "Hard",
    rows: 5,
    columns: 10,
    scoreMultiplier: 2.4,
  };
  const uniqueIconCount =
    (svgHardDifficulty.rows * svgHardDifficulty.columns) / MIN_COPIES_PER_ICON;
  const shuffledTokens = shuffle([...OPENMOJI_IMPORTED_ICON_TOKENS]);
  const pickedTokens = shuffledTokens.slice(0, uniqueIconCount);
  const deck = shuffle([...pickedTokens, ...pickedTokens]);

  resetForNewGame();
  session = {
    mode: "game",
    difficulty: svgHardDifficulty,
    emojiSetId: selectedEmojiPackId,
    emojiSetLabel: getEmojiPackLabel(selectedEmojiPackId),
    tileMultiplier: selectedTileMultiplier,
    scoreCategory: "debug",
    isAutoDemoScore: false,
    usedFlipTiles: false,
    gameplay: createGameplayEngine({
      rows: svgHardDifficulty.rows,
      columns: svgHardDifficulty.columns,
      deck,
    }),
  };
  showGameFrame();
  setDifficultySelection(svgHardDifficulty.id);
  uiView.setStatus("Debug SVG Imports: Hard board with SVG icons only.");
  render();
  void soundManager.playBackgroundMusic();
  void soundManager.playNewGame();
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

  resetActiveEffects();
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

  if (selectionResult.type === "first") {
    void soundManager.playTileFlip();
    uiView.setStatus("Pick another tile.");
    return;
  }

  if (selectionResult.type === "mismatch") {
    void soundManager.playTileMismatch();
    uiView.setStatus("No match. Try again.");

    mismatchAbortController = new AbortController();
    const { signal: mismatchSignal } = mismatchAbortController;
    const mismatchGameplay = gameplay;
    mismatchResolveTimeoutId = window.setTimeout(() => {
      mismatchResolveTimeoutId = null;

      if (
        mismatchSignal.aborted
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
    void soundManager.playTileMatch();

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
        const scoreResult = computeGameScoreResult({
          difficulty: session.difficulty,
          sessionMode: session.mode,
          scoreCategory: session.scoreCategory,
          isAutoDemoScore: isAutoDemoWin,
          tileMultiplier: session.tileMultiplier,
          timeMs: elapsedTimeMs,
          attempts,
          usedFlipTiles: session.usedFlipTiles,
        }, leaderboardRuntimeConfig.scoring);

        uiView.setStatus("You win!");
        void submitWinToLeaderboard({
          playerName,
          difficulty: session.difficulty,
          sessionMode: session.mode,
          emojiSetId: session.emojiSetId,
          emojiSetLabel: session.emojiSetLabel,
          scoreCategory: session.scoreCategory,
          isAutoDemoScore: isAutoDemoWin,
          tileMultiplier: session.tileMultiplier,
          timeMs: elapsedTimeMs,
          attempts,
        });
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

  // Debug Flip Tiles: override all non-matched tiles to "revealed" so the
  // player can visually inspect the board for icon duplications.
  const renderTiles = debugFlipAllTiles
    ? presentation.boardTiles.map((tile) => ({
      ...tile,
      status: tile.status === "matched" ? tile.status : "revealed" as const,
    }))
    : presentation.boardTiles;

  if (session.mode === "debug-tiles") {
    debugBoardView.render(renderTiles, presentation.columns);
  } else {
    boardView.render(renderTiles, presentation.columns);
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
  signal: AbortSignal,
  gameplay: GameplayEngine,
): void => {
  const gameplayTiming = getGameplayTiming();

  if (
    signal.aborted
    || !hasActiveGame(session)
    || session.gameplay !== gameplay
  ) {
    return;
  }

  handleTileSelect(pair[0], "demo");

  window.setTimeout(() => {
    if (
      signal.aborted
      || !hasActiveGame(session)
      || session.gameplay !== gameplay
    ) {
      return;
    }

    handleTileSelect(pair[1], "demo");
  }, scaleByAnimationSpeed(gameplayTiming.autoMatchSecondSelectionDelayMs));
};

const runAutoMatchDemoStep = (remainingPairs: number, signal: AbortSignal): void => {
  const gameplayTiming = getGameplayTiming();

  if (signal.aborted || !hasActiveGame(session)) {
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
  runAutoMatchPair(pair, signal, session.gameplay);

  window.setTimeout(() => {
    if (signal.aborted || !hasActiveGame(session)) {
      return;
    }

    if (session.gameplay.isWon()) {
      return;
    }

    runAutoMatchDemoStep(remainingPairs - 1, signal);
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
  autoDemoAbortController = new AbortController();
  const { signal } = autoDemoAbortController;
  const targetPairCount = pairCount ?? session.gameplay.getRemainingUnmatchedPairCount();
  runAutoMatchDemoStep(targetPairCount, signal);
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

  const message = "[MEMORYBLOX] Icon pack count is odd; keep it even to preserve the 2-column Settings grid.";

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

debugSvgImportsButton.addEventListener("click", () => {
  closeDebugMenu();
  startDebugSvgImportsMode();
});

debugFlipTilesButton.addEventListener("click", () => {
  closeDebugMenu();

  if (!hasActiveGame(session)) {
    return;
  }

  debugFlipAllTiles = !debugFlipAllTiles;

  if (debugFlipAllTiles) {
    session.usedFlipTiles = true;
  }

  markSessionAsDebugScored();
  uiView.setStatus(
    debugFlipAllTiles
      ? "Debug Flip Tiles: all tiles revealed. Click again to hide."
      : "Debug Flip Tiles off.",
  );
  render();
});

muteMusicButton.addEventListener("click", () => {
  const isOn = muteMusicButton.getAttribute("aria-pressed") === "true";
  const nextIsOn = !isOn;

  setMusicToggleButtonState(nextIsOn);

  if (nextIsOn) {
    soundManager.setMusicMuted(false);
    void soundManager.playBackgroundMusic();
  } else {
    soundManager.setMusicMuted(true);
    soundManager.stopBackgroundMusic();
  }

  updateAudioUnlockNotice();
});

muteSoundButton.addEventListener("click", () => {
  const isPressed = muteSoundButton.getAttribute("aria-pressed") === "true";
  const newState = !isPressed;
  muteSoundButton.setAttribute("aria-pressed", String(newState));
  muteSoundButton.setAttribute("aria-label", newState ? "Unmute sound effects" : "Mute sound effects");
  muteSoundButton.setAttribute("title", newState ? "Unmute sound effects" : "Mute sound effects");
  soundManager.setSoundMuted(newState);
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

settingsTileMultiplierInput.addEventListener("input", () => {
  const multiplier = Number.parseInt(settingsTileMultiplierInput.value, 10);

  if (!Number.isFinite(multiplier)) {
    return;
  }

  setPendingTileMultiplier(multiplier);
  uiView.setStatus("Tile multiplier selected. Click Apply changes to confirm.");
});

settingsAnimationSpeedInput.addEventListener("input", () => {
  const speed = Number.parseFloat(settingsAnimationSpeedInput.value);

  if (!Number.isFinite(speed)) {
    return;
  }

  setPendingAnimationSpeed(speed);
  uiView.setStatus("Animation speed selected. Click Apply changes to confirm.");
});

settingsApplyButton.addEventListener("click", () => {
  const didApplyPack = applyPendingEmojiPack();
  const didApplyTileMultiplier = applyPendingTileMultiplier();
  const didApplySpeed = applyPendingAnimationSpeed();
  const didApplyChanges = didApplyPack || didApplyTileMultiplier || didApplySpeed;
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

  if (!settingsFrame.hidden) {
    showMenuFrame();
    return;
  }

  closeDebugMenu();
});

const windowResizeController = new WindowResizeController(
  appShellElement,
  appWindowElement,
  resizeHandleElement,
  () => ({
    fixedWindowAspectRatio: runtimeState.ui.fixedWindowAspectRatio,
    windowBaseSize: runtimeState.ui.windowBaseSize,
    windowResizeLimits: runtimeState.ui.windowResizeLimits,
  }),
);
windowResizeController.attach();

enableHorizontalWheelScroll(topbarActionsElement);
enableSliderWheelScroll(settingsTileMultiplierInput);
enableSliderWheelScroll(settingsAnimationSpeedInput);

const bootstrap = async (): Promise<void> => {
  validateUniquePackIcons();
  validateMinPackIconCount();
  await soundManager.initialize();
  await loadRuntimeConfig();
  void checkPlasmaTextureAvailability();
  enforceEmojiPackParity();
  initializeEmojiPackSettings();
  initializeTileMultiplierSettings();
  initializeAnimationSpeedSettings();
  initializeMuteButtonStates();
  initializeMenuMusicAutoplayRecovery();
  await initializeDropShadow();
  showMenuFrame();
  render();

  window.requestAnimationFrame(() => {
    windowResizeController.initialize();
  });
};

bootstrap().catch((error: unknown) => {
  console.error("[MEMORYBLOX] Failed to bootstrap application.", error);
});