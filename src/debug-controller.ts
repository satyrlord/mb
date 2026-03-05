import {
  DEBUG_TILES_DIFFICULTY,
  getDifficultyById,
  type DifficultyConfig,
} from "./difficulty.js";
import {
  createGameplayEngine,
  type GameplayEngine,
} from "./gameplay.js";
import {
  MIN_COPIES_PER_ICON,
  OPENMOJI_IMPORTED_ICON_TOKENS,
} from "./icons.js";
import type { BoardView } from "./board.js";
import { shuffle } from "./utils.js";

export interface DebugControllerDeps {
  debugMenuRoot: HTMLElement;
  debugMenuButton: HTMLButtonElement;
  debugMenuPanel: HTMLElement;
  debugDemoButton: HTMLButtonElement;
  debugWinButton: HTMLButtonElement;
  debugTilesButton: HTMLButtonElement;
  debugSvgImportsButton: HTMLButtonElement;
  debugFlipTilesButton: HTMLButtonElement;
  leaderboardFrame: HTMLElement;
  settingsFrame: HTMLElement;

  getSession: () => DebugAppSession;
  setSession: (session: DebugAppSession) => void;
  hasActiveGame: () => boolean;
  isDebugTilesSession: () => boolean;
  getSelectedEmojiPackId: () => string;
  getEmojiPackLabel: (packId: string) => string;
  getSelectedTileMultiplier: () => number;
  createDeckForDifficulty: (difficulty: DifficultyConfig) => string[];
  getDefaultDifficulty: () => DifficultyConfig;

  resetForNewGame: () => void;
  resetActiveEffects: () => void;
  startGameForDifficulty: (difficulty: DifficultyConfig) => void;
  showGameFrame: () => void;
  showDebugTilesFrame: () => void;
  showMenuFrame: () => void;
  setDifficultySelection: (id: string) => void;
  setStatus: (message: string) => void;
  render: () => void;
  playBackgroundMusic: () => Promise<void>;
  playNewGame: () => Promise<void>;
  getScaleByAnimationSpeed: (durationMs: number) => number;
  getGameplayTiming: () => DebugGameplayTiming;

  getBoardView: () => BoardView;
  cancelAutoDemo: () => void;
  getAutoDemoAbortController: () => AbortController | null;
  setAutoDemoAbortController: (controller: AbortController | null) => void;
  getDebugFlipAllTiles: () => boolean;
  setDebugFlipAllTiles: (value: boolean) => void;
  handleTileSelect: (index: number, source: "player" | "demo") => void;
}

export interface DebugAppSession {
  mode: "menu" | "game" | "debug-tiles";
  difficulty?: DifficultyConfig;
  emojiSetId?: string;
  emojiSetLabel?: string;
  tileMultiplier?: number;
  gameplay?: GameplayEngine;
  scoreCategory?: "standard" | "debug";
  isAutoDemoScore?: boolean;
  usedFlipTiles?: boolean;
}

export interface DebugGameplayTiming {
  autoMatchBootDelayMs: number;
  autoMatchSecondSelectionDelayMs: number;
  autoMatchBetweenPairsDelayMs: number;
}

/**
 * Manages the debug menu UI and debug game modes.
 *
 * Provides debug utilities: tile inspection mode, SVG import preview,
 * near-win state for testing, auto-match demo, and flip-all-tiles toggle.
 * All interactions are score-penalized via `scoreCategory: "debug"`.
 */
export class DebugController {
  private readonly deps: DebugControllerDeps;

  public constructor(deps: DebugControllerDeps) {
    this.deps = deps;
  }

  // ── Menu visibility ────────────────────────────────────────────────

  public open(): void {
    this.deps.debugFlipTilesButton.disabled = !this.deps.hasActiveGame();
    this.deps.debugMenuPanel.hidden = false;
    this.deps.debugMenuButton.setAttribute("aria-expanded", "true");
  }

  public close(): void {
    this.deps.debugMenuPanel.hidden = true;
    this.deps.debugMenuButton.setAttribute("aria-expanded", "false");
  }

  public toggle(): void {
    if (this.deps.debugMenuPanel.hidden) {
      this.open();
      return;
    }

    this.close();
  }

  // ── Debug modes ────────────────────────────────────────────────────

  public startDebugTilesMode(): void {
    this.deps.resetForNewGame();
    const packId = this.deps.getSelectedEmojiPackId();
    this.deps.setSession({
      mode: "debug-tiles",
      difficulty: DEBUG_TILES_DIFFICULTY,
      emojiSetId: packId,
      emojiSetLabel: this.deps.getEmojiPackLabel(packId),
      tileMultiplier: this.deps.getSelectedTileMultiplier(),
      scoreCategory: "debug",
      isAutoDemoScore: false,
      usedFlipTiles: false,
      gameplay: createGameplayEngine({
        rows: DEBUG_TILES_DIFFICULTY.rows,
        columns: DEBUG_TILES_DIFFICULTY.columns,
        deck: this.deps.createDeckForDifficulty(DEBUG_TILES_DIFFICULTY),
      }),
    });
    this.deps.showDebugTilesFrame();
    this.deps.setDifficultySelection("");
    this.deps.setStatus(
      "Debug Tiles: match the pair to test tile visuals.",
    );
    this.deps.render();
    void this.deps.playBackgroundMusic();
    void this.deps.playNewGame();
  }

  public startDebugSvgImportsMode(): void {
    const svgHardDifficulty = getDifficultyById("hard");

    if (svgHardDifficulty === null) {
      throw new Error(
        "[MEMORYBLOX] Hard difficulty not found for SVG debug mode.",
      );
    }

    const uniqueIconCount =
      (svgHardDifficulty.rows * svgHardDifficulty.columns) /
      MIN_COPIES_PER_ICON;
    const shuffledTokens = shuffle([...OPENMOJI_IMPORTED_ICON_TOKENS]);
    const pickedTokens = shuffledTokens.slice(0, uniqueIconCount);
    const deck = shuffle([...pickedTokens, ...pickedTokens]);

    this.deps.resetForNewGame();
    const packId = this.deps.getSelectedEmojiPackId();
    this.deps.setSession({
      mode: "game",
      difficulty: svgHardDifficulty,
      emojiSetId: packId,
      emojiSetLabel: this.deps.getEmojiPackLabel(packId),
      tileMultiplier: this.deps.getSelectedTileMultiplier(),
      scoreCategory: "debug",
      isAutoDemoScore: false,
      usedFlipTiles: false,
      gameplay: createGameplayEngine({
        rows: svgHardDifficulty.rows,
        columns: svgHardDifficulty.columns,
        deck,
      }),
    });
    this.deps.showGameFrame();
    this.deps.setDifficultySelection(svgHardDifficulty.id);
    this.deps.setStatus(
      "Debug SVG Imports: Hard board with SVG icons only.",
    );
    this.deps.render();
    void this.deps.playBackgroundMusic();
    void this.deps.playNewGame();
  }

  public markSessionAsDebugScored(): void {
    if (!this.deps.hasActiveGame()) {
      return;
    }

    const session = this.deps.getSession();
    session.scoreCategory = "debug";
    this.deps.setSession(session);
  }

  public setDebugNearWinState(): void {
    this.ensureMainGameForDebug();

    if (
      !this.deps.hasActiveGame() ||
      this.deps.isDebugTilesSession()
    ) {
      return;
    }

    this.deps.resetActiveEffects();
    this.markSessionAsDebugScored();

    const session = this.deps.getSession();
    const gameplay = session.gameplay;

    if (gameplay === undefined) {
      return;
    }

    const nearWinState = gameplay.prepareNearWinState();

    if (nearWinState.remainingPair === null) {
      return;
    }

    this.deps.showGameFrame();
    this.deps.render();

    const boardView = this.deps.getBoardView();
    for (const [firstIndex, secondIndex] of nearWinState.matchedPairs) {
      boardView.animateMatchedPair(firstIndex, secondIndex, 0);
    }

    this.deps.setStatus("Debug Win: match the final pair.");
  }

  // ── Auto-match demo ────────────────────────────────────────────────

  public runAutoMatchDemo(pairCount?: number): void {
    if (!this.deps.hasActiveGame()) {
      this.deps.setStatus("Start a game to run the demo.");
      return;
    }

    this.markSessionAsDebugScored();

    const session = this.deps.getSession();
    session.isAutoDemoScore = true;
    this.deps.setSession(session);

    this.deps.cancelAutoDemo();
    const controller = new AbortController();
    this.deps.setAutoDemoAbortController(controller);
    const { signal } = controller;
    const gameplay = session.gameplay;

    if (gameplay === undefined) {
      return;
    }

    const targetPairCount =
      pairCount ?? gameplay.getRemainingUnmatchedPairCount();
    this.runAutoMatchDemoStep(targetPairCount, signal, gameplay);
  }

  public startDemoFromMenu(): void {
    const defaultDifficulty = this.deps.getDefaultDifficulty();
    this.deps.startGameForDifficulty(defaultDifficulty);
    const timing = this.deps.getGameplayTiming();

    window.setTimeout(() => {
      this.runAutoMatchDemo();
    }, this.deps.getScaleByAnimationSpeed(timing.autoMatchBootDelayMs));
  }

  // ── Flip tiles toggle ──────────────────────────────────────────────

  public toggleFlipAllTiles(): void {
    if (!this.deps.hasActiveGame()) {
      return;
    }

    const current = this.deps.getDebugFlipAllTiles();
    this.deps.setDebugFlipAllTiles(!current);

    if (!current) {
      const session = this.deps.getSession();
      session.usedFlipTiles = true;
      this.deps.setSession(session);
    }

    this.markSessionAsDebugScored();
    this.deps.setStatus(
      !current
        ? "Debug Flip Tiles: all tiles revealed. Click again to hide."
        : "Debug Flip Tiles off.",
    );
    this.deps.render();
  }

  // ── Event binding ──────────────────────────────────────────────────

  public bindEventListeners(): void {
    this.deps.debugMenuButton.addEventListener("click", () => {
      this.toggle();
    });

    this.deps.debugDemoButton.addEventListener("click", () => {
      this.close();

      if (this.deps.hasActiveGame()) {
        this.runAutoMatchDemo();
        return;
      }

      this.startDemoFromMenu();
    });

    this.deps.debugWinButton.addEventListener("click", () => {
      this.close();
      this.setDebugNearWinState();
    });

    this.deps.debugTilesButton.addEventListener("click", () => {
      this.close();
      this.startDebugTilesMode();
    });

    this.deps.debugSvgImportsButton.addEventListener("click", () => {
      this.close();
      this.startDebugSvgImportsMode();
    });

    this.deps.debugFlipTilesButton.addEventListener("click", () => {
      this.close();
      this.toggleFlipAllTiles();
    });

    // Close debug menu when clicking outside
    document.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!this.deps.debugMenuRoot.contains(target)) {
        this.close();
      }
    });

    // Escape key handling for debug menu (and frame dismissal)
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (!this.deps.leaderboardFrame.hidden) {
        this.deps.showMenuFrame();
        return;
      }

      if (!this.deps.settingsFrame.hidden) {
        this.deps.showMenuFrame();
        return;
      }

      this.close();
    });
  }

  // ── Private helpers ────────────────────────────────────────────────

  private ensureMainGameForDebug(): void {
    if (
      this.deps.hasActiveGame() &&
      !this.deps.isDebugTilesSession()
    ) {
      return;
    }

    this.deps.startGameForDifficulty(this.deps.getDefaultDifficulty());
  }

  private runAutoMatchDemoStep(
    remainingPairs: number,
    signal: AbortSignal,
    gameplay: GameplayEngine,
  ): void {
    const timing = this.deps.getGameplayTiming();

    if (signal.aborted || !this.deps.hasActiveGame()) {
      return;
    }

    if (remainingPairs <= 0) {
      this.deps.setStatus("Demo complete.");
      return;
    }

    const pair = gameplay.findFirstUnmatchedPairIndices();

    if (pair === null) {
      this.deps.setStatus("Demo complete.");
      return;
    }

    this.deps.setStatus("Demo running...");
    this.runAutoMatchPair(pair, signal, gameplay);

    window.setTimeout(() => {
      if (signal.aborted || !this.deps.hasActiveGame()) {
        return;
      }

      const session = this.deps.getSession();

      if (session.gameplay !== undefined && session.gameplay.isWon()) {
        return;
      }

      this.runAutoMatchDemoStep(remainingPairs - 1, signal, gameplay);
    }, this.deps.getScaleByAnimationSpeed(
      timing.autoMatchSecondSelectionDelayMs +
      timing.autoMatchBetweenPairsDelayMs,
    ));
  }

  private runAutoMatchPair(
    pair: [number, number],
    signal: AbortSignal,
    gameplay: GameplayEngine,
  ): void {
    const timing = this.deps.getGameplayTiming();

    if (
      signal.aborted ||
      !this.deps.hasActiveGame()
    ) {
      return;
    }

    const session = this.deps.getSession();

    if (session.gameplay !== gameplay) {
      return;
    }

    this.deps.handleTileSelect(pair[0], "demo");

    window.setTimeout(() => {
      if (
        signal.aborted ||
        !this.deps.hasActiveGame()
      ) {
        return;
      }

      const currentSession = this.deps.getSession();

      if (currentSession.gameplay !== gameplay) {
        return;
      }

      this.deps.handleTileSelect(pair[1], "demo");
    }, this.deps.getScaleByAnimationSpeed(
      timing.autoMatchSecondSelectionDelayMs,
    ));
  }
}
