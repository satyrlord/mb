import { RUNTIME_CONFIG_PATHS } from "./runtime-config.js";
import { parseCfgBoolean, parseCfgInteger, parseCfgLines, parseCfgNumber, loadCfgFile } from "./cfg.js";

export interface LeaderboardScoringConfig {
  scorePenaltyFactor: number;
  attemptsPenaltyMs: number;
  baseScoreDividend: number;
  scoreScaleFactor: number;
  debugScoreExtraReductionFactor: number;
  debugWinModeReductionFactor: number;
  debugTilesModeReductionFactor: number;
}

export interface LeaderboardRuntimeConfig {
  enabled: boolean;
  maxEntries: number;
  scoring: LeaderboardScoringConfig;
}

export interface LeaderboardScoreEntry {
  playerName: string;
  timeMs: number;
  attempts: number;
  difficultyId: string;
  difficultyLabel: string;
  emojiSetId: string;
  emojiSetLabel: string;
  scoreMultiplier: number;
  scoreValue: number;
  isAutoDemo: boolean;
  createdAt: string;
}

export interface LeaderboardScoreSubmission {
  playerName: string;
  timeMs: number;
  attempts: number;
  difficultyId: string;
  difficultyLabel: string;
  emojiSetId: string;
  emojiSetLabel: string;
  scoreMultiplier: number;
  scoreValue: number;
  isAutoDemo?: boolean;
}

interface LeaderboardScoreComputationInput {
  timeMs: number;
  attempts: number;
  scoreMultiplier: number;
}

export const LEADERBOARD_SCORE_PENALTY_FACTOR = 0.1;
const LEADERBOARD_SCORE_ATTEMPTS_PENALTY_MS = 1500;
const LEADERBOARD_BASE_SCORE_DIVIDEND = 1_000_000;
const LEADERBOARD_SCORE_SCALE_FACTOR = 1_000;
const LEADERBOARD_DEBUG_SCORE_EXTRA_REDUCTION_FACTOR = 0.08;
const LEADERBOARD_DEBUG_WIN_MODE_REDUCTION_FACTOR = 0.4;
const LEADERBOARD_DEBUG_TILES_MODE_REDUCTION_FACTOR = 0.2;
const LEGACY_EMOJI_SET_ID = "legacy";
const LEGACY_EMOJI_SET_LABEL = "Legacy Set";

/** localStorage key used to persist local high scores. */
const LEADERBOARD_STORAGE_KEY = "memoryblox.leaderboard";

export const DEFAULT_LEADERBOARD_RUNTIME_CONFIG: LeaderboardRuntimeConfig = {
  enabled: true,
  maxEntries: 100,
  scoring: {
    scorePenaltyFactor: LEADERBOARD_SCORE_PENALTY_FACTOR,
    attemptsPenaltyMs: LEADERBOARD_SCORE_ATTEMPTS_PENALTY_MS,
    baseScoreDividend: LEADERBOARD_BASE_SCORE_DIVIDEND,
    scoreScaleFactor: LEADERBOARD_SCORE_SCALE_FACTOR,
    debugScoreExtraReductionFactor: LEADERBOARD_DEBUG_SCORE_EXTRA_REDUCTION_FACTOR,
    debugWinModeReductionFactor: LEADERBOARD_DEBUG_WIN_MODE_REDUCTION_FACTOR,
    debugTilesModeReductionFactor: LEADERBOARD_DEBUG_TILES_MODE_REDUCTION_FACTOR,
  },
};

export const getDifficultyScoreMultiplier = (
  difficultyId: string,
  difficultyLabel: string,
): number => {
  const normalizedId = difficultyId.trim().toLowerCase();
  const normalizedLabel = difficultyLabel.trim().toLowerCase();

  if (normalizedId === "hard" || normalizedLabel === "hard") {
    return 2.4;
  }

  if (normalizedId === "normal" || normalizedLabel === "normal") {
    return 1.8;
  }

  if (normalizedId === "easy" || normalizedLabel === "easy") {
    return 1.2;
  }

  return 1;
};

const isDebugDifficulty = (difficultyId: string, difficultyLabel: string): boolean => {
  const normalizedId = difficultyId.trim().toLowerCase();
  const normalizedLabel = difficultyLabel.trim().toLowerCase();

  return normalizedId === "debug"
    || normalizedId === "debug-tiles"
    || normalizedLabel === "debug"
    || normalizedLabel === "debug tiles";
};

const hasLeaderboardScorePenalty = (
  difficultyId: string,
  difficultyLabel: string,
  isAutoDemo: boolean,
): boolean => {
  return isAutoDemo || isDebugDifficulty(difficultyId, difficultyLabel);
};

export const applyLeaderboardScorePenalty = (
  scoreValue: number,
  scorePenaltyFactor = LEADERBOARD_SCORE_PENALTY_FACTOR,
): number => {
  return Math.max(0, Math.round(Math.max(0, scoreValue) * scorePenaltyFactor));
};

export const calculateLeaderboardScore = (
  input: LeaderboardScoreComputationInput,
  scoringConfig: LeaderboardScoringConfig = DEFAULT_LEADERBOARD_RUNTIME_CONFIG.scoring,
): number => {
  if (input.scoreMultiplier <= 0) {
    return 0;
  }

  const weightedDuration = Math.max(1, input.timeMs)
    + (Math.max(0, input.attempts) * scoringConfig.attemptsPenaltyMs);
  return Math.max(
    0,
    Math.round(
      ((scoringConfig.baseScoreDividend / weightedDuration) * input.scoreMultiplier)
      * scoringConfig.scoreScaleFactor,
    ),
  );
};

/**
 * Resolves a display label for an emoji set from an entry's raw label field.
 * Returns the raw label as-is when non-empty; falls back to the legacy
 * constant (`LEGACY_EMOJI_SET_LABEL`) for entries recorded before the emoji
 * set label field was introduced.
 *
 * @param rawLabel - The raw emoji set label string from the entry record.
 * @returns The raw label if non-empty, otherwise the legacy fallback label.
 */
const resolveEmojiSetLabel = (rawLabel: string): string => {
  if (rawLabel.length > 0) {
    return rawLabel;
  }

  return LEGACY_EMOJI_SET_LABEL;
};

const normalizeLeaderboardEntry = (
  value: unknown,
  scoringConfig: LeaderboardScoringConfig,
): LeaderboardScoreEntry | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const playerName = typeof record.playerName === "string" ? record.playerName.trim() : "";
  const difficultyId = typeof record.difficultyId === "string" ? record.difficultyId : "";
  const difficultyLabel = typeof record.difficultyLabel === "string" ? record.difficultyLabel : "";
  const rawEmojiSetId = typeof record.emojiSetId === "string" ? record.emojiSetId.trim() : "";
  const emojiSetId = rawEmojiSetId.length > 0 ? rawEmojiSetId : LEGACY_EMOJI_SET_ID;
  const rawEmojiSetLabel = typeof record.emojiSetLabel === "string" ? record.emojiSetLabel.trim() : "";
  const emojiSetLabel = resolveEmojiSetLabel(rawEmojiSetLabel);
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
  const timeMs = typeof record.timeMs === "number" ? Math.round(record.timeMs) : Number.NaN;
  const attempts = typeof record.attempts === "number" ? Math.round(record.attempts) : Number.NaN;
  const isAutoDemo = record.isAutoDemo === true;
  const parsedScoreMultiplier = typeof record.scoreMultiplier === "number"
    ? record.scoreMultiplier
    : Number.NaN;
  const scoreMultiplier = Number.isFinite(parsedScoreMultiplier)
    ? parsedScoreMultiplier
    : getDifficultyScoreMultiplier(difficultyId, difficultyLabel);
  const parsedScoreValue = typeof record.scoreValue === "number"
    ? Math.round(record.scoreValue)
    : Number.NaN;
  const scoreValue = Number.isFinite(parsedScoreValue)
    ? parsedScoreValue
    : (
      hasLeaderboardScorePenalty(difficultyId, difficultyLabel, isAutoDemo)
        ? applyLeaderboardScorePenalty(
          calculateLeaderboardScore({ timeMs, attempts, scoreMultiplier }, scoringConfig),
          scoringConfig.scorePenaltyFactor,
        )
        : calculateLeaderboardScore({ timeMs, attempts, scoreMultiplier }, scoringConfig)
    );

  if (
    playerName.length === 0
    || difficultyId.length === 0
    || difficultyLabel.length === 0
    || emojiSetLabel.length === 0
    || createdAt.length === 0
    || !Number.isFinite(timeMs)
    || !Number.isFinite(attempts)
    || timeMs < 0
    || attempts < 0
    || !Number.isFinite(scoreMultiplier)
    || scoreMultiplier < 0
    || !Number.isFinite(scoreValue)
    || scoreValue < 0
  ) {
    return null;
  }

  return {
    playerName,
    timeMs,
    attempts,
    difficultyId,
    difficultyLabel,
    emojiSetId,
    emojiSetLabel,
    scoreMultiplier,
    scoreValue,
    isAutoDemo,
    createdAt,
  };
};

const normalizeLeaderboardPayload = (
  payload: unknown,
  scoringConfig: LeaderboardScoringConfig = DEFAULT_LEADERBOARD_RUNTIME_CONFIG.scoring,
): LeaderboardScoreEntry[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => normalizeLeaderboardEntry(entry, scoringConfig))
      .filter((entry): entry is LeaderboardScoreEntry => entry !== null);
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    const entries = record.entries;

    if (Array.isArray(entries)) {
      return entries
        .map((entry) => normalizeLeaderboardEntry(entry, scoringConfig))
        .filter((entry): entry is LeaderboardScoreEntry => entry !== null);
    }
  }

  return [];
};

const rankLeaderboardEntries = (entries: readonly LeaderboardScoreEntry[]): LeaderboardScoreEntry[] => {
  return [...entries].sort((left, right) => {
    if (left.scoreValue !== right.scoreValue) {
      return right.scoreValue - left.scoreValue;
    }

    const leftTimestamp = Date.parse(left.createdAt);
    const rightTimestamp = Date.parse(right.createdAt);
    const leftHasValidTimestamp = Number.isFinite(leftTimestamp);
    const rightHasValidTimestamp = Number.isFinite(rightTimestamp);

    if (leftHasValidTimestamp && rightHasValidTimestamp && leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    if (leftHasValidTimestamp !== rightHasValidTimestamp) {
      return leftHasValidTimestamp ? -1 : 1;
    }

    if (left.createdAt !== right.createdAt) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (left.timeMs !== right.timeMs) {
      return left.timeMs - right.timeMs;
    }

    return left.attempts - right.attempts;
  });
};

export const loadLeaderboardRuntimeConfig = async (): Promise<LeaderboardRuntimeConfig> => {
  const entries = await loadCfgFile(RUNTIME_CONFIG_PATHS.leaderboard);

  if (entries === null) {
    return DEFAULT_LEADERBOARD_RUNTIME_CONFIG;
  }

  const enabled = parseCfgBoolean(entries.get("leaderboard.enabled") ?? "")
    ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.enabled;
  const defaultScoring = DEFAULT_LEADERBOARD_RUNTIME_CONFIG.scoring;

  return {
    enabled,
    maxEntries: Math.max(
      1,
      parseCfgInteger(entries.get("leaderboard.maxEntries") ?? "")
        ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.maxEntries,
    ),
    scoring: {
      scorePenaltyFactor: Math.max(
        0,
        Math.min(
          1,
          parseCfgNumber(entries.get("leaderboard.scorePenaltyFactor") ?? "")
            ?? defaultScoring.scorePenaltyFactor,
        ),
      ),
      attemptsPenaltyMs: Math.max(
        0,
        parseCfgNumber(entries.get("leaderboard.attemptsPenaltyMs") ?? "")
          ?? defaultScoring.attemptsPenaltyMs,
      ),
      baseScoreDividend: Math.max(
        1,
        parseCfgNumber(entries.get("leaderboard.baseScoreDividend") ?? "")
          ?? defaultScoring.baseScoreDividend,
      ),
      scoreScaleFactor: Math.max(
        1,
        parseCfgNumber(entries.get("leaderboard.scoreScaleFactor") ?? "")
          ?? defaultScoring.scoreScaleFactor,
      ),
      debugScoreExtraReductionFactor: Math.max(
        0,
        Math.min(
          1,
          parseCfgNumber(entries.get("leaderboard.debugScoreExtraReductionFactor") ?? "")
            ?? defaultScoring.debugScoreExtraReductionFactor,
        ),
      ),
      debugWinModeReductionFactor: Math.max(
        0,
        Math.min(
          1,
          parseCfgNumber(entries.get("leaderboard.debugWinModeReductionFactor") ?? "")
            ?? defaultScoring.debugWinModeReductionFactor,
        ),
      ),
      debugTilesModeReductionFactor: Math.max(
        0,
        Math.min(
          1,
          parseCfgNumber(entries.get("leaderboard.debugTilesModeReductionFactor") ?? "")
            ?? defaultScoring.debugTilesModeReductionFactor,
        ),
      ),
    },
  };
};

/**
 * Client wrapper for local leaderboard operations backed by `localStorage`.
 *
 * Scores are stored as a JSON array under `LEADERBOARD_STORAGE_KEY`.
 * All reads and writes are synchronous (wrapped in Promise for API
 * compatibility). No network requests are made; the leaderboard works
 * fully offline and on static-file hosts such as GitHub Pages.
 */
export class LeaderboardClient {
  private readonly config: LeaderboardRuntimeConfig;

  public constructor(config: LeaderboardRuntimeConfig) {
    this.config = config;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  private readStorage(): LeaderboardScoreEntry[] {
    try {
      const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);

      if (raw === null) {
        return [];
      }

      // Guard against excessively large payloads (e.g. tampered localStorage).
      const MAX_LEADERBOARD_STORAGE_BYTES = 512_000;

      if (raw.length > MAX_LEADERBOARD_STORAGE_BYTES) {
        console.warn("[MEMORYBLOX] Leaderboard storage exceeds size limit — ignoring.");
        return [];
      }

      return normalizeLeaderboardPayload(JSON.parse(raw) as unknown, this.config.scoring);
    } catch (error) {
      console.warn("[MEMORYBLOX] Failed to read leaderboard from localStorage:", error);
      return [];
    }
  }

  private writeStorage(entries: readonly LeaderboardScoreEntry[]): void {
    try {
      window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      const errorType = error instanceof DOMException ? "Storage quota exceeded" : "Write error";
      console.warn(`[MEMORYBLOX] Failed to write leaderboard to localStorage (${errorType}):`, error);
    }
  }

  public async fetchTopScores(): Promise<LeaderboardScoreEntry[]> {
    if (!this.isEnabled()) {
      return [];
    }

    return rankLeaderboardEntries(this.readStorage()).slice(0, this.config.maxEntries);
  }

  public async submitScore(score: LeaderboardScoreSubmission): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const existing = this.readStorage();
    const newEntry: LeaderboardScoreEntry = {
      playerName: score.playerName.trim(),
      timeMs: Math.max(0, Math.round(score.timeMs)),
      attempts: Math.max(0, Math.round(score.attempts)),
      difficultyId: score.difficultyId,
      difficultyLabel: score.difficultyLabel,
      emojiSetId: score.emojiSetId,
      emojiSetLabel: score.emojiSetLabel,
      scoreMultiplier: Math.max(0, score.scoreMultiplier),
      scoreValue: Math.max(0, Math.round(score.scoreValue)),
      isAutoDemo: score.isAutoDemo === true,
      createdAt: new Date().toISOString(),
    };
    const merged = rankLeaderboardEntries([...existing, newEntry])
      .slice(0, this.config.maxEntries);
    this.writeStorage(merged);
  }
}

export const leaderboardTesting = {
  parseCfgLines,
  parseCfgInteger,
  parseCfgBoolean,
  getDifficultyScoreMultiplier,
  applyLeaderboardScorePenalty,
  calculateLeaderboardScore,
  normalizeLeaderboardPayload,
  rankLeaderboardEntries,
  LEADERBOARD_STORAGE_KEY,
};