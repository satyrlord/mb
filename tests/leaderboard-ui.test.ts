// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  LeaderboardUiController,
  type SubmitWinToLeaderboardInput,
  type LeaderboardUiDeps,
} from "../src/leaderboard-ui.js";
import {
  DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  type LeaderboardRuntimeConfig,
  type LeaderboardScoreEntry,
} from "../src/leaderboard.js";
import type { EmojiPackId } from "../src/icons.js";

const TEST_EMOJI_PACK_ID: EmojiPackId = "technology";

const makeEntry = (overrides: Partial<LeaderboardScoreEntry> = {}): LeaderboardScoreEntry => ({
  playerName: "Player",
  timeMs: 30000,
  attempts: 10,
  difficultyId: "easy",
  difficultyLabel: "Easy",
  emojiSetId: "default",
  emojiSetLabel: "Default",
  scoreMultiplier: 1.2,
  scoreValue: 100,
  isAutoDemo: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createMockElements = () => ({
  statusElement: document.createElement("div"),
  tableWrapElement: document.createElement("div"),
  listElement: document.createElement("tbody"),
});

const createMockDeps = (
  overrides: Partial<LeaderboardUiDeps> = {},
): LeaderboardUiDeps => ({
  elements: createMockElements(),
  getVisibleRowCount: () => 10,
  setStatus: vi.fn(),
  ...overrides,
});

const createSubmitWinInput = (
  overrides: Partial<SubmitWinToLeaderboardInput> = {},
): SubmitWinToLeaderboardInput => ({
  playerName: "Alice",
  difficulty: { id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 },
  sessionMode: "game",
  emojiSetId: TEST_EMOJI_PACK_ID,
  emojiSetLabel: "Technology",
  scoreCategory: "standard",
  isAutoDemoScore: false,
  tileMultiplier: 1,
  timeMs: 30000,
  attempts: 10,
  usedFlipTiles: false,
  isPortraitMode: false,
  ...overrides,
});

const DISABLED_CONFIG: LeaderboardRuntimeConfig = {
  ...DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
  enabled: false,
};

describe("LeaderboardUiController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("isEnabled", () => {
    it("returns true when leaderboard is enabled", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
      expect(controller.isEnabled()).toBe(true);
    });

    it("returns false when leaderboard is disabled", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DISABLED_CONFIG);
      expect(controller.isEnabled()).toBe(false);
    });
  });

  describe("getScoringConfig", () => {
    it("returns the scoring config from the runtime config", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
      const scoring = controller.getScoringConfig();
      expect(scoring.scorePenaltyFactor).toBe(DEFAULT_LEADERBOARD_RUNTIME_CONFIG.scoring.scorePenaltyFactor);
    });
  });

  describe("updateRuntimeConfig", () => {
    it("updates isEnabled state", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
      expect(controller.isEnabled()).toBe(true);

      controller.updateRuntimeConfig(DISABLED_CONFIG);
      expect(controller.isEnabled()).toBe(false);
    });
  });

  describe("render", () => {
    it("shows disabled message when leaderboard is off", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DISABLED_CONFIG);

      controller.render();

      expect(deps.elements.statusElement.textContent).toBe("High scores are disabled.");
      expect(deps.elements.tableWrapElement.hidden).toBe(true);
    });

    it("shows 'no scores' message when entries list is empty", () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      controller.render();

      expect(deps.elements.statusElement.textContent).toBe("No scores yet. Be the first!");
      expect(deps.elements.tableWrapElement.hidden).toBe(false);
    });

    it("renders rows when entries exist after refresh", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      // Pre-populate localStorage with entries so fetchTopScores returns them
      const entries = [
        makeEntry({ playerName: "Alice", scoreValue: 500, createdAt: "2024-01-01T00:00:00Z" }),
        makeEntry({ playerName: "Bob", scoreValue: 300, createdAt: "2024-01-02T00:00:00Z" }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      expect(deps.elements.statusElement.textContent).toBe(
        "Sorted by highest score, then most recent time.",
      );
      expect(deps.elements.tableWrapElement.hidden).toBe(false);
      expect(deps.elements.listElement.children.length).toBe(2);
    });

    it("highlights the most recent entry when no submitted key", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "Alice", scoreValue: 500, createdAt: "2024-01-01T00:00:00Z" }),
        makeEntry({ playerName: "Bob", scoreValue: 300, createdAt: "2024-01-02T00:00:00Z" }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      // The most recent entry (Bob, later createdAt) should have the recent class
      const rows = Array.from(deps.elements.listElement.children) as HTMLTableRowElement[];
      const recentRows = rows.filter((r) => r.classList.contains("leaderboard-row-recent"));
      expect(recentRows.length).toBe(1);
    });

    it("caps visible entries to getVisibleRowCount", async () => {
      const deps = createMockDeps({ getVisibleRowCount: () => 1 });
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "Alice", scoreValue: 500 }),
        makeEntry({ playerName: "Bob", scoreValue: 300 }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      expect(deps.elements.listElement.children.length).toBe(1);
    });

    it("renders row cells with correct content", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "TestPlayer", scoreValue: 999, difficultyLabel: "Hard", emojiSetLabel: "Animals" }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      const row = deps.elements.listElement.children[0] as HTMLTableRowElement;
      expect(row.children.length).toBe(6); // rank, player, score, difficulty, emoji, time
      expect(row.children[0].textContent).toBe("1"); // rank
      expect(row.children[1].textContent).toBe("TestPlayer"); // player
      expect(row.children[2].textContent).toBe("999"); // score
      expect(row.children[3].textContent).toBe("Hard"); // difficulty
      expect(row.children[4].textContent).toBe("Animals"); // emoji set
    });

    it("appends (auto) suffix for auto-demo entries", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "Bot", scoreValue: 100, isAutoDemo: true }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      const row = deps.elements.listElement.children[0] as HTMLTableRowElement;
      expect(row.children[1].textContent).toBe("Bot (auto)");
    });

    it("appends (debug) suffix for debug difficulty entries", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "Dev", scoreValue: 50, difficultyLabel: "Debug" }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      const row = deps.elements.listElement.children[0] as HTMLTableRowElement;
      expect(row.children[1].textContent).toBe("Dev (debug)");
    });

    it("appends (debug, auto) suffix for debug auto-demo entries", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const entries = [
        makeEntry({ playerName: "Bot", scoreValue: 10, difficultyLabel: "Debug", isAutoDemo: true }),
      ];
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify(entries));

      await controller.refresh();

      const row = deps.elements.listElement.children[0] as HTMLTableRowElement;
      expect(row.children[1].textContent).toBe("Bot (debug, auto)");
    });

    it("highlights submitted entry on subsequent render after submitWin", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      // Submit a win so lastSubmittedEntryKey is set
      await controller.submitWin(createSubmitWinInput({
        playerName: "Winner",
      }));

      // After submitWin, lastSubmittedEntryKey is set — re-render to hit the
      // hasSubmittedEntryInView=true branch
      controller.render();

      const rows = Array.from(deps.elements.listElement.children) as HTMLTableRowElement[];
      expect(rows.length).toBeGreaterThan(0);
      const recentRows = rows.filter((r) => r.classList.contains("leaderboard-row-recent"));
      expect(recentRows.length).toBe(1);
      expect(recentRows[0].children[1].textContent).toBe("Winner");
    });

    it("does not highlight any entry when submitted entry is outside visible range", async () => {
      const deps = createMockDeps({ getVisibleRowCount: () => 1 });
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      // Pre-populate a high-scoring entry that will push our submission out of view
      const topEntry = makeEntry({ playerName: "TopPlayer", scoreValue: 999999, createdAt: "2024-01-01T00:00:00Z" });
      localStorage.setItem("memoryblox.leaderboard", JSON.stringify([topEntry]));

      // Submit a low-scoring win
      await controller.submitWin(createSubmitWinInput({
        playerName: "LowScorer",
        timeMs: 999999,
        attempts: 999,
      }));

      // Re-render — submitted entry is outside the 1-row visible range
      controller.render();

      const rows = Array.from(deps.elements.listElement.children) as HTMLTableRowElement[];
      expect(rows.length).toBe(1);
      // No row should have the recent highlight class
      const recentRows = rows.filter((r) => r.classList.contains("leaderboard-row-recent"));
      expect(recentRows.length).toBe(0);
    });

    it("clears list element when disabled", () => {
      const deps = createMockDeps();
      // Pre-populate the list
      const row = document.createElement("tr");
      deps.elements.listElement.appendChild(row);

      const controller = new LeaderboardUiController(deps, DISABLED_CONFIG);
      controller.render();

      expect(deps.elements.listElement.children.length).toBe(0);
    });
  });

  describe("refresh", () => {
    it("fetches and renders scores", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      // The LeaderboardClient internally reads/writes localStorage
      // For an enabled client, fetchTopScores returns entries from storage
      await controller.refresh();

      // After refresh with empty storage, status should be "no scores"
      expect(deps.elements.statusElement.textContent).toBe("No scores yet. Be the first!");
    });

    it("propagates fetch failures to the caller", async () => {
      const deps = createMockDeps({
        createClient: () => ({
          isEnabled: () => true,
          submitScore: async () => {},
          fetchTopScores: async () => {
            throw new Error("refresh failure");
          },
        }),
      });
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      await expect(controller.refresh()).rejects.toThrow("refresh failure");
    });
  });

  describe("submitWin", () => {
    it("calls setStatus on successful submission", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      await controller.submitWin(createSubmitWinInput());

      expect(deps.setStatus).toHaveBeenCalledWith(
        "You win! Score saved to local high scores.",
      );
    });

    it("reports disabled message when leaderboard is off", async () => {
      const deps = createMockDeps();
      const controller = new LeaderboardUiController(deps, DISABLED_CONFIG);

      await controller.submitWin(createSubmitWinInput());

      expect(deps.setStatus).toHaveBeenCalledWith(
        "You win! Score not saved (high scores disabled).",
      );
    });

    it("reports error when submission throws", async () => {
      const deps = createMockDeps({
        createClient: () => ({
          isEnabled: () => true,
          submitScore: async () => {
            throw new Error("network failure");
          },
          fetchTopScores: async () => [],
        }),
      });
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await controller.submitWin(createSubmitWinInput());

      expect(deps.setStatus).toHaveBeenCalledWith(
        "You win! Leaderboard submit failed.",
      );

      warnSpy.mockRestore();
    });

    it("reports a specific error when refresh fails after a successful submit", async () => {
      const deps = createMockDeps({
        createClient: () => ({
          isEnabled: () => true,
          submitScore: async () => {},
          fetchTopScores: async () => {
            throw new Error("refresh failure");
          },
        }),
      });
      const controller = new LeaderboardUiController(deps, DEFAULT_LEADERBOARD_RUNTIME_CONFIG);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await controller.submitWin(createSubmitWinInput());

      expect(deps.setStatus).toHaveBeenCalledWith(
        "You win! Score saved, but leaderboard refresh failed.",
      );

      warnSpy.mockRestore();
    });
  });
});
