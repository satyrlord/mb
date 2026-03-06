// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  readStoredPlayerName,
  writeStoredPlayerName,
  PlayerNamePrompt,
  playerNamePromptTesting,
  type PlayerNamePromptDeps,
} from "../src/player-name-prompt.js";

const { PLAYER_NAME_STORAGE_KEY } = playerNamePromptTesting;

const createMockElements = () => ({
  overlay: document.createElement("div"),
  input: document.createElement("input") as HTMLInputElement,
  okButton: document.createElement("button") as HTMLButtonElement,
});

const createMockDeps = (
  overrides: Partial<PlayerNamePromptDeps> = {},
): PlayerNamePromptDeps => {
  return {
    elements: overrides.elements ?? createMockElements(),
    getFadeOutMs: overrides.getFadeOutMs ?? (() => 0),
  };
};

describe("player-name-prompt", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("readStoredPlayerName", () => {
    it("returns null when nothing is stored", () => {
      expect(readStoredPlayerName()).toBeNull();
    });

    it("returns stored name", () => {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "Alice");
      expect(readStoredPlayerName()).toBe("Alice");
    });

    it("returns null for empty string", () => {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "");
      expect(readStoredPlayerName()).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "   ");
      expect(readStoredPlayerName()).toBeNull();
    });

    it("trims whitespace from stored name", () => {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "  Bob  ");
      expect(readStoredPlayerName()).toBe("Bob");
    });
  });

  describe("writeStoredPlayerName", () => {
    it("persists name to localStorage", () => {
      writeStoredPlayerName("Charlie");
      expect(localStorage.getItem(PLAYER_NAME_STORAGE_KEY)).toBe("Charlie");
    });
  });

  describe("PlayerNamePrompt", () => {
    describe("close", () => {
      it("hides overlay and resets aria state", () => {
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        deps.elements.overlay.hidden = false;
        deps.elements.overlay.setAttribute("aria-hidden", "false");
        deps.elements.input.disabled = true;
        deps.elements.okButton.disabled = true;

        prompt.close();

        expect(deps.elements.overlay.hidden).toBe(true);
        expect(deps.elements.overlay.getAttribute("aria-hidden")).toBe("true");
        expect(deps.elements.input.disabled).toBe(false);
        expect(deps.elements.okButton.disabled).toBe(false);
      });

      it("removes is-hiding class", () => {
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);
        deps.elements.overlay.classList.add("is-hiding");

        prompt.close();

        expect(deps.elements.overlay.classList.contains("is-hiding")).toBe(false);
      });
    });

    describe("prompt", () => {
      it("shows overlay and sets aria state", () => {
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        deps.elements.overlay.hidden = true;
        deps.elements.overlay.setAttribute("aria-hidden", "true");

        // Start the prompt (don't await, it waits for user input)
        const promise = prompt.prompt();

        expect(deps.elements.overlay.hidden).toBe(false);
        expect(deps.elements.overlay.getAttribute("aria-hidden")).toBe("false");

        // Clean up
        prompt.close();
        return promise;
      });

      it("resolves with entered name on OK click", async () => {
        vi.useFakeTimers();
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        const promise = prompt.prompt();
        deps.elements.input.value = "Alice";
        deps.elements.okButton.click();

        // Use fake timers to advance the fadeOut timeout
        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe("Alice");
      });

      it("falls back to stored name when input is empty", async () => {
        vi.useFakeTimers();
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "StoredName");
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        const promise = prompt.prompt();
        deps.elements.input.value = "";
        deps.elements.okButton.click();

        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe("StoredName");
      });

      it("falls back to 'Player' when no stored name and input is empty", async () => {
        vi.useFakeTimers();
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        const promise = prompt.prompt();
        deps.elements.input.value = "";
        deps.elements.okButton.click();

        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe("Player");
      });

      it("resolves on Enter key", async () => {
        vi.useFakeTimers();
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        const promise = prompt.prompt();
        deps.elements.input.value = "Bob";
        deps.elements.input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );

        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe("Bob");
      });

      it("ignores non-Enter key presses", () => {
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        prompt.prompt();
        deps.elements.input.value = "Test";
        deps.elements.input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true }),
        );

        // Should still be showing (not resolved)
        expect(deps.elements.overlay.hidden).toBe(false);

        prompt.close();
      });

      it("stores the resolved name", async () => {
        vi.useFakeTimers();
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        const promise = prompt.prompt();
        deps.elements.input.value = "Stored";
        deps.elements.okButton.click();

        await vi.runAllTimersAsync();
        await promise;

        expect(localStorage.getItem(PLAYER_NAME_STORAGE_KEY)).toBe("Stored");
      });

      it("prefills input with stored name", () => {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "PrefilledName");
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        prompt.prompt();
        expect(deps.elements.input.value).toBe("PrefilledName");

        prompt.close();
      });

      it("disables input and button on submit", () => {
        const deps = createMockDeps();
        const prompt = new PlayerNamePrompt(deps);

        prompt.prompt();
        deps.elements.input.value = "Test";
        deps.elements.okButton.click();

        expect(deps.elements.input.disabled).toBe(true);
        expect(deps.elements.okButton.disabled).toBe(true);

        // Clean up
        prompt.close();
      });
    });
  });
});
