import { RUNTIME_CONFIG_PATHS } from "./runtime-config.js";
import { parseCfgBoolean, parseCfgInteger, parseCfgLines, parseCfgNumber } from "./cfg.js";

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
  endpointUrl: string;
  autoEndpointPort: number;
  apiKey: string | null;
  maxEntries: number;
  timeoutMs: number;
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
const DEFAULT_HTTP_PORT = "80";
const LOCAL_HOST_ALIASES = ["localhost", "127.0.0.1"] as const;

export const DEFAULT_LEADERBOARD_RUNTIME_CONFIG: LeaderboardRuntimeConfig = {
  enabled: false,
  endpointUrl: "",
  autoEndpointPort: 8787,
  apiKey: null,
  maxEntries: 100,
  timeoutMs: 5000,
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

class LeaderboardTimeoutError extends Error {
  public constructor(cause: unknown) {
    super("Leaderboard request timed out.");
    this.name = "LeaderboardTimeoutError";
    Object.assign(this, { cause });

    if (cause instanceof Error && typeof cause.stack === "string" && cause.stack.length > 0) {
      this.stack = `${this.name}: ${this.message}\nCaused by: ${cause.stack}`;
    }
  }
}

const isAbortError = (error: unknown): boolean => {
  return (error instanceof DOMException && error.name === "AbortError")
    || (error instanceof Error && error.name === "AbortError");
};

/**
 * Runs an async callback with an abort timeout.
 *
 * Uses `AbortSignal.timeout` when available and falls back to a manual
 * `AbortController` timer for older runtimes (for example Safari < 15.4).
 *
 * @template T The resolved value type of the async callback.
 * @param callback Async operation to run with an abort signal.
 * @param timeoutMs Timeout duration in milliseconds.
 * @returns The callback result if it resolves before timeout.
 * @throws {LeaderboardTimeoutError} If the operation is aborted due to timeout.
 * @see {@link ../docs/runtime-config.md} — Browser Compatibility section for the
 *   minimum browser versions that support `AbortSignal.timeout` natively
 *   (Chrome 105+, Firefox 110+, Safari 15.4+).
 */
// Augments AbortSignal's static interface to include the optional `timeout`
// factory method so we can safely perform typed feature detection while
// still treating the property as optional in environments that lack it.
type AbortSignalConstructorWithTimeout = typeof AbortSignal & {
  timeout?: (ms: number) => AbortSignal;
};

/**
 * Reference to `AbortSignal.timeout`, cached at module load time so the
 * feature-detection try/catch runs once regardless of how many `withTimeout`
 * calls are made. Holds `null` if the method is unavailable or throws on access.
 *
 * Two separate guards are needed for full cross-environment compatibility:
 *
 * 1. **Property-access guard** (IIFE try/catch): some non-standard environments
 *    use a throwing getter on `AbortSignal`, so even reading `.timeout` may throw.
 *    Catching here caches `null` once and avoids repeated property-access failures.
 *    Example: Safari < 15.4 shipped without `AbortSignal.timeout`; some polyfill
 *    implementations define the property with a throwing getter rather than leaving
 *    it absent.
 *
 * 2. **Invocation guard** (try/catch inside `withTimeout`): even when the property
 *    exists and is a function, calling it may throw in environments that partially
 *    implement the spec. Catching the invocation lets us fall back to the manual
 *    `AbortController` path on a per-call basis without propagating the error.
 *    Example: partial polyfills that expose the property but throw on call, or
 *    environments in a transitional spec-compliance state.
 *
 * Both guards are therefore necessary: the first protects detection, the second
 * protects use.
 */
const NATIVE_ABORT_SIGNAL_TIMEOUT: ((ms: number) => AbortSignal) | null = (() => {
  try {
    const candidate = (AbortSignal as AbortSignalConstructorWithTimeout).timeout;
    if (typeof candidate === "function") {
      // .bind(AbortSignal) ensures AbortSignal remains the `this` receiver when
      // the cached function reference is later called as a plain function in withTimeout.
      return candidate.bind(AbortSignal);
    }
  } catch {
    // AbortSignal.timeout property access threw — fall through to null.
  }
  return null;
})();

const withTimeout = async <T>(
  callback: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const nativeTimeout = NATIVE_ABORT_SIGNAL_TIMEOUT;
  if (nativeTimeout !== null) {
    // Prefer the native AbortSignal.timeout when available, with a guarded
    // invocation: even after the module-level detection confirms the property is
    // a function, some environments may throw when it is actually called (partial
    // spec implementation). Catching the invocation here lets us fall through to
    // the manual AbortController fallback below on a per-call basis.
    let signal: AbortSignal | null = null;
    try {
      signal = nativeTimeout(timeoutMs);
    } catch {
      // AbortSignal.timeout threw on invocation — fall through to manual fallback.
    }

    if (signal !== null) {
      try {
        return await callback(signal);
      } catch (error) {
        if (isAbortError(error)) {
          throw new LeaderboardTimeoutError(error);
        }

        throw error;
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await callback(controller.signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw new LeaderboardTimeoutError(error);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const createLeaderboardHeaders = (config: LeaderboardRuntimeConfig): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey !== null && config.apiKey.length > 0) {
    headers["x-api-key"] = config.apiKey;
  }

  return headers;
};

const appendLimitQuery = (url: string, limit: number): string => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}limit=${encodeURIComponent(limit.toString())}`;
};

const isLocalHost = (hostname: string): boolean => {
  const normalizedHostname = hostname.trim().toLowerCase();
  return LOCAL_HOST_ALIASES.some((alias) => normalizedHostname === alias);
};

const getLeaderboardEndpointCandidates = (config: LeaderboardRuntimeConfig): string[] => {
  const candidates = [config.endpointUrl];

  try {
    const parsed = new URL(config.endpointUrl);
    const isHttp = parsed.protocol === "http:";
    const isHttps = parsed.protocol === "https:";

    if (!isHttp && !isHttps) {
      return candidates;
    }

    const DEFAULT_HTTPS_PORT = "443";
    const protocol = parsed.protocol;
    const defaultPort = isHttps ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT;
    const port = parsed.port.length > 0 ? parsed.port : defaultPort;
    const path = parsed.pathname.length > 0 ? parsed.pathname : "/leaderboard";
    const baseSearch = parsed.search;
    const hosts = [parsed.hostname, ...LOCAL_HOST_ALIASES];

    for (const host of hosts) {
      const candidate = `${protocol}//${host}:${port}${path}${baseSearch}`;

      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  } catch {
    // Keep original endpoint only when parsing fails.
  }

  return candidates;
};

const normalizeLeaderboardEndpointUrl = (
  rawEndpointUrl: string,
  autoEndpointPort = DEFAULT_LEADERBOARD_RUNTIME_CONFIG.autoEndpointPort,
): string => {
  const endpointUrl = rawEndpointUrl.trim();

  if (endpointUrl.length === 0) {
    return "";
  }

  if (endpointUrl.toLowerCase() !== "auto") {
    return endpointUrl;
  }

  const hostname = window.location.hostname;
  const protocol = isLocalHost(hostname)
    ? "http:"
    : window.location.protocol;

  return `${protocol}//${hostname}:${autoEndpointPort}/leaderboard`;
};

export const loadLeaderboardRuntimeConfig = async (): Promise<LeaderboardRuntimeConfig> => {
  const entries = await readCfgFile(RUNTIME_CONFIG_PATHS.leaderboard);

  if (entries === null) {
    return DEFAULT_LEADERBOARD_RUNTIME_CONFIG;
  }

  const autoEndpointPort = Math.max(
    1,
    parseCfgInteger(entries.get("leaderboard.autoEndpointPort") ?? "")
      ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.autoEndpointPort,
  );
  const endpointUrl = normalizeLeaderboardEndpointUrl(
    entries.get("leaderboard.endpointUrl") ?? "",
    autoEndpointPort,
  );
  const apiKey = (entries.get("leaderboard.apiKey") ?? "").trim();
  const enabled = parseCfgBoolean(entries.get("leaderboard.enabled") ?? "")
    ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.enabled;
  const defaultScoring = DEFAULT_LEADERBOARD_RUNTIME_CONFIG.scoring;

  return {
    enabled,
    endpointUrl,
    autoEndpointPort,
    apiKey: apiKey.length > 0 ? apiKey : null,
    maxEntries: Math.max(
      1,
      parseCfgInteger(entries.get("leaderboard.maxEntries") ?? "")
        ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.maxEntries,
    ),
    timeoutMs: Math.max(
      250,
      parseCfgInteger(entries.get("leaderboard.timeoutMs") ?? "")
        ?? DEFAULT_LEADERBOARD_RUNTIME_CONFIG.timeoutMs,
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
 * Client wrapper for leaderboard backend operations.
 *
 * Handles endpoint normalization/fallback candidates, request timeouts,
 * API key headers, payload normalization, and ranked score retrieval.
 */
export class LeaderboardClient {
  private readonly config: LeaderboardRuntimeConfig;

  public constructor(config: LeaderboardRuntimeConfig) {
    this.config = config;
  }

  public isEnabled(): boolean {
    return this.config.enabled && this.config.endpointUrl.length > 0;
  }

  public async fetchTopScores(): Promise<LeaderboardScoreEntry[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const endpoints = getLeaderboardEndpointCandidates(this.config);
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await withTimeout(
          (signal) => window.fetch(
            appendLimitQuery(endpoint, this.config.maxEntries),
            {
              cache: "no-cache",
              headers: createLeaderboardHeaders(this.config),
              signal,
            },
          ),
          this.config.timeoutMs,
        );

        if (!response.ok) {
          throw new Error(`Leaderboard fetch failed with ${response.status}.`);
        }

        const payload = await response.json() as unknown;
        return rankLeaderboardEntries(normalizeLeaderboardPayload(payload, this.config.scoring))
          .slice(0, this.config.maxEntries);
      } catch (error) {
        lastError = error instanceof Error
          ? error
          : new Error("Leaderboard fetch failed.");
      }
    }

    throw lastError ?? new Error("Leaderboard fetch failed.");
  }

  public async submitScore(score: LeaderboardScoreSubmission): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const endpoints = getLeaderboardEndpointCandidates(this.config);
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await withTimeout(
          (signal) => window.fetch(endpoint, {
            method: "POST",
            headers: createLeaderboardHeaders(this.config),
            signal,
            body: JSON.stringify({
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
            }),
          }),
          this.config.timeoutMs,
        );

        if (!response.ok) {
          throw new Error(`Leaderboard submit failed with ${response.status}.`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error
          ? error
          : new Error("Leaderboard submit failed.");
      }
    }

    throw lastError ?? new Error("Leaderboard submit failed.");
  }
}

export const leaderboardTesting = {
  parseCfgLines,
  parseCfgInteger,
  parseCfgBoolean,
  isLocalHost,
  getDifficultyScoreMultiplier,
  applyLeaderboardScorePenalty,
  calculateLeaderboardScore,
  normalizeLeaderboardEndpointUrl,
  getLeaderboardEndpointCandidates,
  normalizeLeaderboardPayload,
  rankLeaderboardEntries,
};