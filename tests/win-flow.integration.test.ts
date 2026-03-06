// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { PlayerNamePrompt } from "../src/player-name-prompt.js";
import { LeaderboardUiController } from "../src/leaderboard-ui.js";
import { DEFAULT_LEADERBOARD_RUNTIME_CONFIG } from "../src/leaderboard.js";
import type { EmojiPackId } from "../src/icons.js";

const TEST_EMOJI_PACK_ID: EmojiPackId = "technology";

describe("win flow integration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("captures player name, submits score, and renders highlighted leaderboard row", async () => {
    vi.useFakeTimers();

    const overlay = document.createElement("div");
    overlay.hidden = true;
    const input = document.createElement("input");
    const okButton = document.createElement("button");

    const statusElement = document.createElement("div");
    const tableWrapElement = document.createElement("div");
    const listElement = document.createElement("tbody");
    const setStatus = vi.fn<(message: string) => void>();

    const prompt = new PlayerNamePrompt({
      elements: { overlay, input, okButton },
      getFadeOutMs: () => 0,
    });

    const leaderboardUi = new LeaderboardUiController(
      {
        elements: {
          statusElement,
          tableWrapElement,
          listElement,
        },
        getVisibleRowCount: () => 10,
        setStatus,
      },
      DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
    );

    const namePromise = prompt.prompt();
    input.value = "Integration Player";
    okButton.click();
    await vi.runAllTimersAsync();
    const playerName = await namePromise;

    await leaderboardUi.submitWin({
      playerName,
      difficulty: { id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 },
      sessionMode: "game",
      emojiSetId: TEST_EMOJI_PACK_ID,
      emojiSetLabel: "Technology",
      scoreCategory: "standard",
      isAutoDemoScore: false,
      tileMultiplier: 1,
      timeMs: 30_000,
      attempts: 10,
      usedFlipTiles: false,
      isPortraitMode: false,
    });

    expect(setStatus).toHaveBeenLastCalledWith("You win! Score saved to local high scores.");

    const rows = Array.from(listElement.children) as HTMLTableRowElement[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].children[1].textContent).toBe("Integration Player");
    expect(rows.filter((row) => row.classList.contains("leaderboard-row-recent"))).toHaveLength(1);
  });

  it("falls back to the default player name when the prompt closes without input", async () => {
    const overlay = document.createElement("div");
    overlay.hidden = true;
    const input = document.createElement("input");
    const okButton = document.createElement("button");

    const statusElement = document.createElement("div");
    const tableWrapElement = document.createElement("div");
    const listElement = document.createElement("tbody");
    const setStatus = vi.fn<(message: string) => void>();

    const prompt = new PlayerNamePrompt({
      elements: { overlay, input, okButton },
      getFadeOutMs: () => 0,
    });

    const leaderboardUi = new LeaderboardUiController(
      {
        elements: {
          statusElement,
          tableWrapElement,
          listElement,
        },
        getVisibleRowCount: () => 10,
        setStatus,
      },
      DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
    );

    const namePromise = prompt.prompt();
    prompt.close();
    const playerName = await namePromise;

    expect(playerName).toBe("Player");

    await leaderboardUi.submitWin({
      playerName,
      difficulty: { id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 },
      sessionMode: "game",
      emojiSetId: TEST_EMOJI_PACK_ID,
      emojiSetLabel: "Technology",
      scoreCategory: "standard",
      isAutoDemoScore: false,
      tileMultiplier: 1,
      timeMs: 30_000,
      attempts: 10,
      usedFlipTiles: false,
      isPortraitMode: false,
    });

    expect(setStatus).toHaveBeenLastCalledWith("You win! Score saved to local high scores.");
  });

  it("surfaces leaderboard submission failures in the integrated flow", async () => {
    vi.useFakeTimers();

    const overlay = document.createElement("div");
    overlay.hidden = true;
    const input = document.createElement("input");
    const okButton = document.createElement("button");

    const statusElement = document.createElement("div");
    const tableWrapElement = document.createElement("div");
    const listElement = document.createElement("tbody");
    const setStatus = vi.fn<(message: string) => void>();

    const prompt = new PlayerNamePrompt({
      elements: { overlay, input, okButton },
      getFadeOutMs: () => 0,
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const leaderboardUi = new LeaderboardUiController(
      {
        elements: {
          statusElement,
          tableWrapElement,
          listElement,
        },
        getVisibleRowCount: () => 10,
        setStatus,
        createClient: () => ({
          isEnabled: () => true,
          submitScore: async () => {
            throw new Error("submit failure");
          },
          fetchTopScores: async () => [],
        }),
      },
      DEFAULT_LEADERBOARD_RUNTIME_CONFIG,
    );

    const namePromise = prompt.prompt();
    input.value = "Integration Player";
    okButton.click();
    await vi.runAllTimersAsync();
    const playerName = await namePromise;

    await leaderboardUi.submitWin({
      playerName,
      difficulty: { id: "easy", label: "Easy", rows: 5, columns: 6, scoreMultiplier: 1.2 },
      sessionMode: "game",
      emojiSetId: TEST_EMOJI_PACK_ID,
      emojiSetLabel: "Technology",
      scoreCategory: "standard",
      isAutoDemoScore: false,
      tileMultiplier: 1,
      timeMs: 30_000,
      attempts: 10,
      usedFlipTiles: false,
      isPortraitMode: false,
    });

    expect(setStatus).toHaveBeenLastCalledWith("You win! Leaderboard submit failed.");
    expect(listElement.children).toHaveLength(0);

    warnSpy.mockRestore();
  });
});
