import type { EmojiPackId } from "./icons.js";
import type { DifficultyConfig } from "./difficulty.js";
import {
  computeGameScoreResult,
  LeaderboardClient,
  type LeaderboardRuntimeConfig,
  type LeaderboardScoreSubmission,
  type LeaderboardScoreEntry,
  type LeaderboardScoringConfig,
} from "./leaderboard.js";
import {
  createLeaderboardEntryKey,
  formatLeaderboardTimestampGmt,
  resolveLastSubmittedLeaderboardEntryKey,
  resolveMostRecentLeaderboardEntryKey,
} from "./leaderboard-view.js";

export interface SubmitWinToLeaderboardInput {
  playerName: string;
  difficulty: DifficultyConfig;
  sessionMode: "game" | "debug-tiles";
  emojiSetId: EmojiPackId;
  emojiSetLabel: string;
  scoreCategory: "standard" | "debug";
  isAutoDemoScore: boolean;
  tileMultiplier: number;
  timeMs: number;
  attempts: number;
  usedFlipTiles: boolean;
  isPortraitMode: boolean;
}

export interface LeaderboardUiElements {
  statusElement: HTMLElement;
  tableWrapElement: HTMLElement;
  listElement: HTMLTableSectionElement;
}

export interface LeaderboardUiDeps {
  elements: LeaderboardUiElements;
  getVisibleRowCount: () => number;
  setStatus: (message: string) => void;
  createClient?: (runtimeConfig: LeaderboardRuntimeConfig) => LeaderboardUiClient;
}

interface LeaderboardUiClient {
  isEnabled: () => boolean;
  fetchTopScores: () => Promise<LeaderboardScoreEntry[]>;
  submitScore: (score: LeaderboardScoreSubmission) => Promise<void>;
}

export class LeaderboardUiController {
  private readonly elements: LeaderboardUiElements;
  private readonly getVisibleRowCount: () => number;
  private readonly setStatus: (message: string) => void;
  private readonly createClient: (runtimeConfig: LeaderboardRuntimeConfig) => LeaderboardUiClient;
  private entries: LeaderboardScoreEntry[] = [];
  private lastSubmittedEntryKey: string | null = null;
  private client: LeaderboardUiClient;
  private scoringConfig: LeaderboardScoringConfig;

  constructor(
    deps: LeaderboardUiDeps,
    runtimeConfig: LeaderboardRuntimeConfig,
  ) {
    this.elements = deps.elements;
    this.getVisibleRowCount = deps.getVisibleRowCount;
    this.setStatus = deps.setStatus;
    this.createClient = deps.createClient ?? ((config) => new LeaderboardClient(config));
    this.client = this.createClient(runtimeConfig);
    this.scoringConfig = { ...runtimeConfig.scoring };
  }

  updateRuntimeConfig(config: LeaderboardRuntimeConfig): void {
    this.client = this.createClient(config);
    this.scoringConfig = { ...config.scoring };
  }

  isEnabled(): boolean {
    return this.client.isEnabled();
  }

  getScoringConfig(): Readonly<LeaderboardScoringConfig> {
    return this.scoringConfig;
  }

  render(): void {
    const visibleRowCount = this.getVisibleRowCount();
    this.elements.statusElement.textContent = this.getStatusText();

    if (!this.isEnabled()) {
      this.elements.listElement.replaceChildren();
      this.elements.tableWrapElement.hidden = true;
      return;
    }

    const cappedEntries = this.entries.slice(0, visibleRowCount);
    const hasSubmittedEntryInView =
      this.lastSubmittedEntryKey !== null
      && cappedEntries.some((entry) => createLeaderboardEntryKey(entry) === this.lastSubmittedEntryKey);
    const recentLeaderboardEntryKey = hasSubmittedEntryInView
      ? this.lastSubmittedEntryKey
      : this.lastSubmittedEntryKey === null
        ? resolveMostRecentLeaderboardEntryKey(cappedEntries)
        : null;
    const rows: HTMLTableRowElement[] = cappedEntries.map((entry, index) =>
      this.createRow(entry, index, recentLeaderboardEntryKey !== null
        && createLeaderboardEntryKey(entry) === recentLeaderboardEntryKey, visibleRowCount),
    );

    this.elements.tableWrapElement.hidden = false;
    this.elements.listElement.replaceChildren(...rows);
  }

  async refresh(): Promise<void> {
    this.entries = await this.client.fetchTopScores();
    this.render();
  }

  async submitWin(input: SubmitWinToLeaderboardInput): Promise<void> {
    const leaderboardAvailable = this.isEnabled();

    try {
      const scoreResult = computeGameScoreResult({
        difficulty: input.difficulty,
        sessionMode: input.sessionMode,
        scoreCategory: input.scoreCategory,
        isAutoDemoScore: input.isAutoDemoScore,
        tileMultiplier: input.tileMultiplier,
        timeMs: input.timeMs,
        attempts: input.attempts,
        usedFlipTiles: input.usedFlipTiles,
        isPortraitMode: input.isPortraitMode,
      }, this.scoringConfig);

      const submittedScore = {
        playerName: input.playerName,
        timeMs: input.timeMs,
        attempts: input.attempts,
        difficultyId: scoreResult.difficultyId,
        difficultyLabel: scoreResult.difficultyLabel,
        emojiSetId: input.emojiSetId,
        emojiSetLabel: input.emojiSetLabel,
        scoreMultiplier: scoreResult.scoreMultiplier,
        scoreValue: scoreResult.scoreValue,
        isAutoDemo: input.isAutoDemoScore,
      };

      await this.client.submitScore(submittedScore);

      if (!leaderboardAvailable) {
        this.setStatus("You win! Score not saved (high scores disabled).");
        return;
      }

      try {
        await this.refresh();
      } catch (refreshError: unknown) {
        console.warn("[MEMORYBLOX] Leaderboard refresh failed after submit:", refreshError);
        this.setStatus("You win! Score saved, but leaderboard refresh failed.");
        return;
      }

      this.lastSubmittedEntryKey = resolveLastSubmittedLeaderboardEntryKey(
        this.entries,
        submittedScore,
      );
      this.setStatus("You win! Score saved to local high scores.");
    } catch (error: unknown) {
      console.warn("[MEMORYBLOX] Leaderboard submission failed:", error);
      this.setStatus("You win! Leaderboard submit failed.");
    }
  }

  private getStatusText(): string {
    if (!this.isEnabled()) {
      return "High scores are disabled.";
    }

    if (this.entries.length === 0) {
      return "No scores yet. Be the first!";
    }

    return "Sorted by highest score, then most recent time.";
  }

  private createRow(
    entry: LeaderboardScoreEntry,
    index: number,
    isRecent: boolean,
    visibleRowCount: number,
  ): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.className = "leaderboard-row";

    if (isRecent) {
      row.classList.add("leaderboard-row-recent");
    }

    const rankCell = document.createElement("td");
    rankCell.className = "leaderboard-cell leaderboard-cell-rank u-shadow-physical";
    rankCell.textContent = String(Math.min(index + 1, visibleRowCount));

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
  }
}
