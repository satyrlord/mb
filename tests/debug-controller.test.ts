// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import {
  DebugController,
  type DebugControllerDeps,
  type DebugAppSession,
} from "../src/debug-controller.js";

/** Creates a minimal mock session for testing. */
const createMenuSession = (): DebugAppSession => ({ mode: "menu" });

const createGameSession = (
  overrides: Partial<DebugAppSession> = {},
): DebugAppSession => ({
  mode: "game",
  difficulty: { id: "easy", label: "Easy", rows: 5, columns: 6 },
  emojiSetId: "classic",
  emojiSetLabel: "Classic",
  tileMultiplier: 1,
  scoreCategory: "standard",
  isAutoDemoScore: false,
  usedFlipTiles: false,
  gameplay: createMockGameplay(),
  ...overrides,
});

const createMockGameplay = () => ({
  selectTile: vi.fn(),
  resolveMismatch: vi.fn(),
  getElapsedTimeMs: vi.fn(() => 0),
  getAttempts: vi.fn(() => 0),
  isWon: vi.fn(() => false),
  getRemainingUnmatchedPairCount: vi.fn(() => 5),
  findFirstUnmatchedPairIndices: vi.fn(() => [0, 1] as [number, number]),
  prepareNearWinState: vi.fn(() => ({
    remainingPair: [0, 1] as [number, number],
    matchedPairs: [[2, 3], [4, 5]] as [number, number][],
  })),
});

const createMockBoardView = () => ({
  render: vi.fn(),
  animateMatchedPair: vi.fn(),
  resetBackFaceCache: vi.fn(),
  setLayoutConfig: vi.fn(),
});

const createMockDeps = (
  overrides: Partial<DebugControllerDeps> = {},
): DebugControllerDeps => {
  let currentSession: DebugAppSession = createMenuSession();

  return {
    debugMenuRoot: document.createElement("div"),
    debugMenuButton: document.createElement("button"),
    debugMenuPanel: document.createElement("div"),
    debugDemoButton: document.createElement("button"),
    debugWinButton: document.createElement("button"),
    debugTilesButton: document.createElement("button"),
    debugSvgImportsButton: document.createElement("button"),
    debugFlipTilesButton: document.createElement("button"),
    leaderboardFrame: Object.assign(document.createElement("div"), { hidden: true }),
    settingsFrame: Object.assign(document.createElement("div"), { hidden: true }),
    getSession: () => currentSession,
    setSession: (s: DebugAppSession) => { currentSession = s; },
    hasActiveGame: () => currentSession.mode !== "menu",
    isDebugTilesSession: () => currentSession.mode === "debug-tiles",
    getSelectedEmojiPackId: () => "classic",
    getEmojiPackLabel: () => "Classic",
    getSelectedTileMultiplier: () => 1,
    createDeckForDifficulty: vi.fn(() => ["A", "A"]),
    getDefaultDifficulty: () => ({
      id: "easy",
      label: "Easy",
      rows: 5,
      columns: 6,
    }),
    resetForNewGame: vi.fn(),
    resetActiveEffects: vi.fn(),
    startGameForDifficulty: vi.fn((difficulty) => {
      currentSession = createGameSession({ difficulty });
    }),
    showGameFrame: vi.fn(),
    showDebugTilesFrame: vi.fn(),
    showMenuFrame: vi.fn(),
    setDifficultySelection: vi.fn(),
    setStatus: vi.fn(),
    render: vi.fn(),
    playBackgroundMusic: vi.fn(async () => {}),
    playNewGame: vi.fn(async () => {}),
    getScaleByAnimationSpeed: vi.fn((ms: number) => ms),
    getGameplayTiming: () => ({
      autoMatchBootDelayMs: 100,
      autoMatchSecondSelectionDelayMs: 50,
      autoMatchBetweenPairsDelayMs: 50,
    }),
    getBoardView: vi.fn(() => createMockBoardView()),
    cancelAutoDemo: vi.fn(),
    getAutoDemoAbortController: () => null,
    setAutoDemoAbortController: vi.fn(),
    getDebugFlipAllTiles: () => false,
    setDebugFlipAllTiles: vi.fn(),
    handleTileSelect: vi.fn(),
    ...overrides,
  };
};

describe("DebugController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("menu visibility", () => {
    it("open() shows the panel and updates aria-expanded", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = true;
      const ctrl = new DebugController(deps);

      ctrl.open();

      expect(deps.debugMenuPanel.hidden).toBe(false);
      expect(deps.debugMenuButton.getAttribute("aria-expanded")).toBe("true");
    });

    it("open() disables flip button when no active game", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.open();

      expect(deps.debugFlipTilesButton.disabled).toBe(true);
    });

    it("open() enables flip button when game is active", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.open();

      expect(deps.debugFlipTilesButton.disabled).toBe(false);
    });

    it("close() hides the panel and updates aria-expanded", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      const ctrl = new DebugController(deps);

      ctrl.close();

      expect(deps.debugMenuPanel.hidden).toBe(true);
      expect(deps.debugMenuButton.getAttribute("aria-expanded")).toBe("false");
    });

    it("toggle() opens when closed", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = true;
      const ctrl = new DebugController(deps);

      ctrl.toggle();

      expect(deps.debugMenuPanel.hidden).toBe(false);
    });

    it("toggle() closes when open", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      const ctrl = new DebugController(deps);

      ctrl.toggle();

      expect(deps.debugMenuPanel.hidden).toBe(true);
    });
  });

  describe("startDebugTilesMode", () => {
    it("creates a debug-tiles session and renders", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.startDebugTilesMode();

      expect(deps.resetForNewGame).toHaveBeenCalled();
      expect(deps.showDebugTilesFrame).toHaveBeenCalled();
      expect(deps.render).toHaveBeenCalled();
      expect(deps.setStatus).toHaveBeenCalledWith(
        "Debug Tiles: match the pair to test tile visuals.",
      );

      const session = deps.getSession();
      expect(session.mode).toBe("debug-tiles");
      expect(session.scoreCategory).toBe("debug");
    });
  });

  describe("startDebugSvgImportsMode", () => {
    it("creates a hard game session with SVG icons", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.startDebugSvgImportsMode();

      expect(deps.resetForNewGame).toHaveBeenCalled();
      expect(deps.showGameFrame).toHaveBeenCalled();
      expect(deps.render).toHaveBeenCalled();
      expect(deps.setStatus).toHaveBeenCalledWith(
        "Debug SVG Imports: Hard board with SVG icons only.",
      );

      const session = deps.getSession();
      expect(session.mode).toBe("game");
      expect(session.scoreCategory).toBe("debug");
    });
  });

  describe("markSessionAsDebugScored", () => {
    it("sets scoreCategory to debug on active session", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession({ scoreCategory: "standard" }));
      const ctrl = new DebugController(deps);

      ctrl.markSessionAsDebugScored();

      expect(deps.getSession().scoreCategory).toBe("debug");
    });

    it("does nothing when no active game", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.markSessionAsDebugScored();
      expect(deps.getSession().mode).toBe("menu");
    });
  });

  describe("setDebugNearWinState", () => {
    it("starts a new game if no active game exists", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.setDebugNearWinState();

      expect(deps.startGameForDifficulty).toHaveBeenCalled();
    });

    it("animates matched pairs and sets near-win status", () => {
      const mockBoardView = createMockBoardView();
      const gameplay = createMockGameplay();
      const deps = createMockDeps({
        getBoardView: vi.fn(() => mockBoardView),
      });
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.setDebugNearWinState();

      expect(deps.resetActiveEffects).toHaveBeenCalled();
      expect(deps.showGameFrame).toHaveBeenCalled();
      expect(deps.render).toHaveBeenCalled();
      expect(mockBoardView.animateMatchedPair).toHaveBeenCalledTimes(2);
      expect(deps.setStatus).toHaveBeenCalledWith("Debug Win: match the final pair.");
    });

    it("skips when remaining pair is null", () => {
      const gameplay = createMockGameplay();
      gameplay.prepareNearWinState.mockReturnValue({
        remainingPair: null,
        matchedPairs: [],
      });
      const mockBoardView = createMockBoardView();
      const deps = createMockDeps({
        getBoardView: vi.fn(() => mockBoardView),
      });
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.setDebugNearWinState();

      expect(mockBoardView.animateMatchedPair).not.toHaveBeenCalled();
    });

    it("skips render/animate when session is debug-tiles", () => {
      const mockBoardView = createMockBoardView();
      const deps = createMockDeps({
        getBoardView: vi.fn(() => mockBoardView),
        isDebugTilesSession: () => true,
      });
      deps.setSession(createGameSession({ mode: "debug-tiles" }));
      const ctrl = new DebugController(deps);

      // Must start regular game but isDebugTilesSession always returns true
      ctrl.setDebugNearWinState();

      expect(mockBoardView.animateMatchedPair).not.toHaveBeenCalled();
    });
  });

  describe("toggleFlipAllTiles", () => {
    it("does nothing when no active game", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.toggleFlipAllTiles();

      expect(deps.setDebugFlipAllTiles).not.toHaveBeenCalled();
    });

    it("toggles flip state and marks session as debug-scored", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.toggleFlipAllTiles();

      expect(deps.setDebugFlipAllTiles).toHaveBeenCalledWith(true);
      expect(deps.render).toHaveBeenCalled();
      expect(deps.setStatus).toHaveBeenCalledWith(
        "Debug Flip Tiles: all tiles revealed. Click again to hide.",
      );
    });

    it("sets usedFlipTiles on session when flipping on", () => {
      const gameSession = createGameSession();
      const deps = createMockDeps();
      deps.setSession(gameSession);
      const ctrl = new DebugController(deps);

      ctrl.toggleFlipAllTiles();

      expect(deps.getSession().usedFlipTiles).toBe(true);
    });

    it("shows off message when toggling off", () => {
      const deps = createMockDeps({
        getDebugFlipAllTiles: () => true,
      });
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.toggleFlipAllTiles();

      expect(deps.setDebugFlipAllTiles).toHaveBeenCalledWith(false);
      expect(deps.setStatus).toHaveBeenCalledWith("Debug Flip Tiles off.");
    });
  });

  describe("runAutoMatchDemo", () => {
    it("shows status message when no active game", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      expect(deps.setStatus).toHaveBeenCalledWith(
        "Start a game to run the demo.",
      );
    });

    it("marks session as debug-scored and sets isAutoDemoScore", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      const session = deps.getSession();
      expect(session.scoreCategory).toBe("debug");
      expect(session.isAutoDemoScore).toBe(true);
    });

    it("cancels existing auto-demo before starting", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      expect(deps.cancelAutoDemo).toHaveBeenCalled();
      expect(deps.setAutoDemoAbortController).toHaveBeenCalled();
    });

    it("calls handleTileSelect for the first tile of the pair", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo(1);

      expect(deps.handleTileSelect).toHaveBeenCalledWith(0, "demo");
    });

    it("calls handleTileSelect for second tile after delay", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo(1);
      vi.advanceTimersByTime(50);

      expect(deps.handleTileSelect).toHaveBeenCalledWith(1, "demo");
    });

    it("does not call handleTileSelect when gameplay is undefined", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: undefined }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      expect(deps.handleTileSelect).not.toHaveBeenCalled();
    });

    it("stops when remaining pairs reach zero", () => {
      const gameplay = createMockGameplay();
      gameplay.getRemainingUnmatchedPairCount.mockReturnValue(0);
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      expect(deps.setStatus).toHaveBeenCalledWith("Demo complete.");
    });

    it("stops when no unmatched pair found", () => {
      const gameplay = createMockGameplay();
      gameplay.findFirstUnmatchedPairIndices.mockReturnValue(null);
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo();

      expect(deps.setStatus).toHaveBeenCalledWith("Demo complete.");
    });

    it("stops when signal is aborted after first pair", () => {
      const gameplay = createMockGameplay();
      gameplay.getRemainingUnmatchedPairCount.mockReturnValue(3);
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));

      let storedController: AbortController | null = null;
      deps.setAutoDemoAbortController = vi.fn((c) => { storedController = c; });

      const ctrl = new DebugController(deps);
      ctrl.runAutoMatchDemo();

      // Abort after first pair
      storedController!.abort();
      vi.advanceTimersByTime(200);

      // Should not match any more pairs
      expect(deps.handleTileSelect).toHaveBeenCalledTimes(1);
    });

    it("continues to next pair after delay", () => {
      const gameplay = createMockGameplay();
      gameplay.getRemainingUnmatchedPairCount.mockReturnValue(2);
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo(2);

      // First pair first tile
      expect(deps.handleTileSelect).toHaveBeenCalledWith(0, "demo");

      // progress time to trigger second tile select
      vi.advanceTimersByTime(50);
      expect(deps.handleTileSelect).toHaveBeenCalledWith(1, "demo");

      // progress time to trigger next pair step
      vi.advanceTimersByTime(100);
      expect((deps.setStatus as Mock).mock.calls.some(
        (call: string[]) => call[0] === "Demo running...",
      )).toBe(true);
    });

    it("stops recursion when game is won", () => {
      const gameplay = createMockGameplay();
      gameplay.getRemainingUnmatchedPairCount.mockReturnValue(2);
      gameplay.isWon.mockReturnValue(true);
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo(2);

      // First pair
      vi.advanceTimersByTime(50); // second tile
      vi.advanceTimersByTime(100); // would start next pair

      // isWon returns true, so no further pairs matched
      const tileSelectCalls = (deps.handleTileSelect as Mock).mock.calls;
      expect(tileSelectCalls.length).toBe(2); // only first pair
    });

    it("second tile aborted when session changes mid-pair", () => {
      const gameplay = createMockGameplay();
      const deps = createMockDeps();
      deps.setSession(createGameSession({ gameplay: gameplay as never }));
      const ctrl = new DebugController(deps);

      ctrl.runAutoMatchDemo(1);

      // Change to menu before second tile fires
      deps.setSession(createMenuSession());
      vi.advanceTimersByTime(50);

      // Only first tile should have been selected
      expect(deps.handleTileSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("startDemoFromMenu", () => {
    it("starts a game and schedules auto-match demo", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);

      ctrl.startDemoFromMenu();

      expect(deps.startGameForDifficulty).toHaveBeenCalled();

      // Auto-match demo starts after boot delay
      vi.advanceTimersByTime(100);
      expect(deps.handleTileSelect).toHaveBeenCalled();
    });
  });

  describe("event listeners", () => {
    it("debugMenuButton click toggles menu", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = true;
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugMenuButton.click();
      expect(deps.debugMenuPanel.hidden).toBe(false);

      deps.debugMenuButton.click();
      expect(deps.debugMenuPanel.hidden).toBe(true);
    });

    it("debugDemoButton starts demo from menu when no game active", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugDemoButton.click();

      expect(deps.startGameForDifficulty).toHaveBeenCalled();
    });

    it("debugDemoButton runs auto-match when game is active", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugDemoButton.click();

      expect(deps.cancelAutoDemo).toHaveBeenCalled();
    });

    it("debugWinButton sets near-win state", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugWinButton.click();

      expect(deps.startGameForDifficulty).toHaveBeenCalled();
    });

    it("debugTilesButton starts debug tiles mode", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugTilesButton.click();

      expect(deps.resetForNewGame).toHaveBeenCalled();
      expect(deps.showDebugTilesFrame).toHaveBeenCalled();
    });

    it("debugSvgImportsButton starts SVG imports mode", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugSvgImportsButton.click();

      expect(deps.resetForNewGame).toHaveBeenCalled();
      expect(deps.showGameFrame).toHaveBeenCalled();
    });

    it("debugFlipTilesButton toggles flip tiles", () => {
      const deps = createMockDeps();
      deps.setSession(createGameSession());
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugFlipTilesButton.click();

      expect(deps.setDebugFlipAllTiles).toHaveBeenCalledWith(true);
    });

    it("outside click closes debug menu", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      document.body.appendChild(deps.debugMenuRoot);
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      // Click outside the debug menu root
      document.body.click();

      expect(deps.debugMenuPanel.hidden).toBe(true);

      // Cleanup
      document.body.removeChild(deps.debugMenuRoot);
    });

    it("click inside debug menu root does not close it", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      document.body.appendChild(deps.debugMenuRoot);
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      deps.debugMenuRoot.click();

      expect(deps.debugMenuPanel.hidden).toBe(false);

      // Cleanup
      document.body.removeChild(deps.debugMenuRoot);
    });

    it("Escape key shows menu when leaderboard is visible", () => {
      const deps = createMockDeps();
      deps.leaderboardFrame.hidden = false;
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(deps.showMenuFrame).toHaveBeenCalled();
    });

    it("Escape key shows menu when settings is visible", () => {
      const deps = createMockDeps();
      deps.settingsFrame.hidden = false;
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(deps.showMenuFrame).toHaveBeenCalled();
    });

    it("Escape key closes debug menu when no frames visible", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(deps.debugMenuPanel.hidden).toBe(true);
    });

    it("non-Escape key does nothing", () => {
      const deps = createMockDeps();
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(deps.showMenuFrame).not.toHaveBeenCalled();
    });

    it("outside click ignores non-Node targets", () => {
      const deps = createMockDeps();
      deps.debugMenuPanel.hidden = false;
      const ctrl = new DebugController(deps);
      ctrl.bindEventListeners();

      const event = new Event("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: null });
      document.dispatchEvent(event);

      // Should not close (non-Node target)
      expect(deps.debugMenuPanel.hidden).toBe(false);
    });
  });
});
