// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WinSequenceController } from "../src/win-sequence-controller.js";

const createMockSoundManager = () => ({
  playWin: vi.fn(async (onStart?: (durationMs: number) => void) => {
    onStart?.(2000);
    return 2000;
  }),
});

const createMockWinFxController = () => ({
  play: vi.fn(),
  clear: vi.fn(),
});

const createController = (overrides?: {
  hasActiveGame?: () => boolean;
  getActiveGameMode?: () => string | null;
}) => {
  const gameFrame = document.createElement("div");
  const debugTilesFrame = document.createElement("div");
  const soundManager = createMockSoundManager();
  const winFxController = createMockWinFxController();
  const showMenuFrame = vi.fn();
  const scaleByAnimationSpeed = vi.fn((ms: number) => ms);
  const getGameplayTiming = vi.fn(() => ({
    mismatchDelayMs: 800,
    reducedMotionMismatchExtraDelayMs: 200,
    matchedDisappearPauseMs: 300,
    matchedDisappearDurationMs: 500,
    reducedMotionMatchedDisappearDurationMs: 100,
    winCanvasFadeDurationMs: 400,
    autoMatchSecondSelectionDelayMs: 100,
    autoMatchBootDelayMs: 500,
    autoMatchBetweenPairsDelayMs: 300,
    uiTimerUpdateIntervalMs: 1000,
  }));

  document.body.append(gameFrame, debugTilesFrame);

  const controller = new WinSequenceController({
    elements: { gameFrame, debugTilesFrame },
    soundManager: soundManager as unknown as import("../src/sound-manager.ts").SoundManager,
    winFxController: winFxController as unknown as import("../src/win-fx.ts").WinFxController,
    getGameplayTiming,
    scaleByAnimationSpeed,
    hasActiveGame: overrides?.hasActiveGame ?? (() => true),
    getActiveGameMode: overrides?.getActiveGameMode ?? (() => "game"),
    showMenuFrame,
  });

  return {
    controller,
    gameFrame,
    debugTilesFrame,
    soundManager,
    winFxController,
    showMenuFrame,
    scaleByAnimationSpeed,
    getGameplayTiming,
  };
};

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

beforeEach(() => {
  // jsdom does not implement window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ── clear ────────────────────────────────────────────────────────────

describe("clear", () => {
  it("removes win-fade-out class from both frames", () => {
    const { controller, gameFrame, debugTilesFrame } = createController();
    gameFrame.classList.add("game-canvas-win-fade-out");
    debugTilesFrame.classList.add("game-canvas-win-fade-out");

    controller.clear();

    expect(gameFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
    expect(debugTilesFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
  });

  it("cancels pending timeouts", () => {
    vi.useFakeTimers();
    const { controller, winFxController } = createController();

    controller.play("Test");
    controller.clear();

    vi.advanceTimersByTime(10000);

    expect(winFxController.play).not.toHaveBeenCalled();
  });
});

// ── play ─────────────────────────────────────────────────────────────

describe("play", () => {
  it("calls scaleByAnimationSpeed with timing values", () => {
    vi.useFakeTimers();
    const { controller, scaleByAnimationSpeed } = createController();

    controller.play("Test");

    expect(scaleByAnimationSpeed).toHaveBeenCalled();
  });

  it("aborts if no active game when first timeout fires", () => {
    vi.useFakeTimers();
    let active = true;
    const { controller, gameFrame } = createController({
      hasActiveGame: () => active,
    });

    controller.play("Test");
    active = false;
    vi.advanceTimersByTime(10000);

    expect(gameFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
  });

  it("adds fade-out class to gameFrame for game mode", () => {
    vi.useFakeTimers();
    const { controller, gameFrame } = createController({
      getActiveGameMode: () => "game",
    });

    controller.play("Test");
    // Advance past the tile animation duration
    vi.advanceTimersByTime(1000);

    expect(gameFrame.classList.contains("game-canvas-win-fade-out")).toBe(true);
  });

  it("adds fade-out class to debugTilesFrame for debug-tiles mode", () => {
    vi.useFakeTimers();
    const { controller, debugTilesFrame } = createController({
      getActiveGameMode: () => "debug-tiles",
    });

    controller.play("Test");
    vi.advanceTimersByTime(1000);

    expect(debugTilesFrame.classList.contains("game-canvas-win-fade-out")).toBe(true);
  });

  it("calls soundManager.playWin after fade duration", async () => {
    vi.useFakeTimers();
    const { controller, soundManager } = createController();

    controller.play("Test");
    // tile anim + fade
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(soundManager.playWin).toHaveBeenCalled();
  });

  it("calls winFxController.play with text and duration from playWin callback", async () => {
    vi.useFakeTimers();
    const { controller, winFxController, soundManager } = createController();
    soundManager.playWin.mockImplementation(async (onStart) => {
      onStart?.(3000);
      return 3000;
    });

    controller.play("Win text");
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(winFxController.play).toHaveBeenCalledWith(
      expect.any(Function),
      "Win text",
      3000,
    );
  });

  it("falls back to winFxController.play when playWin does not call onStart", async () => {
    vi.useFakeTimers();
    const { controller, winFxController, soundManager } = createController();
    soundManager.playWin.mockImplementation(async () => {
      // Does not call onStart — simulates no SFX loaded
      return 1500;
    });

    controller.play("Fallback text");
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(winFxController.play).toHaveBeenCalledWith(
      expect.any(Function),
      "Fallback text",
      1500,
    );
  });

  it("clears previous sequence before starting a new one", () => {
    vi.useFakeTimers();
    const { controller, gameFrame } = createController();

    controller.play("First");
    gameFrame.classList.add("game-canvas-win-fade-out");

    controller.play("Second");

    // clear() should have removed the class
    expect(gameFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
  });

  it("does not call winFxController.play if signal is aborted during playWin callback", async () => {
    vi.useFakeTimers();
    const { controller, winFxController, soundManager } = createController();
    soundManager.playWin.mockImplementation(async (onStart) => {
      // Abort the controller before calling onStart
      controller.clear();
      onStart?.(2000);
      return 2000;
    });

    controller.play("Test");
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(winFxController.play).not.toHaveBeenCalled();
  });

  it("aborts if game becomes inactive between first and second timeout", () => {
    vi.useFakeTimers();
    let active = true;
    const { controller, soundManager } = createController({
      hasActiveGame: () => active,
    });

    controller.play("Test");
    // First timeout fires (tile animation)
    vi.advanceTimersByTime(1000);
    // Now deactivate game before second timeout (fade)
    active = false;
    vi.advanceTimersByTime(1000);

    expect(soundManager.playWin).not.toHaveBeenCalled();
  });

  it("uses reduced motion duration when prefers-reduced-motion matches", () => {
    vi.useFakeTimers();
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { controller, scaleByAnimationSpeed } = createController();

    controller.play("Test");

    // Should have been called with the reduced motion value (100) instead of the normal (500)
    expect(scaleByAnimationSpeed).toHaveBeenCalledWith(100);
  });

  it("does not add fade class when no active game canvas", () => {
    vi.useFakeTimers();
    const { controller, gameFrame, debugTilesFrame } = createController({
      getActiveGameMode: () => null,
    });

    controller.play("Test");
    vi.advanceTimersByTime(1000);

    expect(gameFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
    expect(debugTilesFrame.classList.contains("game-canvas-win-fade-out")).toBe(false);
  });
});
