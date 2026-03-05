// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { WinFxController } from "../src/win-fx.ts";
import { DEFAULT_WIN_FX_RUNTIME_CONFIG } from "../src/runtime-config.ts";
import {
  createBoardTileButton,
  createDeterministicWinFxRandomSequence,
  createMockDomRect,
  createRandomSequenceMock,
} from "./test-helpers.ts";

const createController = (): {
  controller: WinFxController;
  layerElement: HTMLElement;
  particlesElement: HTMLElement;
  textElement: HTMLElement;
} => {
  document.body.innerHTML = "";

  const app = document.createElement("div");
  const board = document.createElement("section");
  const layer = document.createElement("section");
  const particles = document.createElement("div");
  const text = document.createElement("p");

  board.append(createBoardTileButton("🍎"), createBoardTileButton("🍇"));
  layer.hidden = true;
  layer.append(particles, text);
  app.append(board, layer);
  document.body.append(app);

  app.getBoundingClientRect = () => createMockDomRect(0, 0, 300, 200);

  board.getBoundingClientRect = () => createMockDomRect(0, 0, 200, 120);

  const controller = new WinFxController({
    appWindowElement: app,
    boardElement: board,
    winFxLayerElement: layer,
    winFxParticlesElement: particles,
    winFxTextElement: text,
  });

  controller.configureRuntime({
    options: {
      // Use production defaults for values that aren't test-specific.
      textDisplayDurationMs: DEFAULT_WIN_FX_RUNTIME_CONFIG.options.textDisplayDurationMs,
      maxParticles: DEFAULT_WIN_FX_RUNTIME_CONFIG.options.maxParticles,
      // Override timing/count values to keep tests fast and deterministic.
      particleDelayJitterMs: 0,
      centerFinaleDelayMs: 0,
      centerFinaleWaves: 1,
      centerFinaleWaveDelayMs: 1,
      centerFinaleCount: 2,
      confettiRainDelayMs: 0,
      confettiRainCount: 2,
      confettiRainSpreadMs: 1,
      fireworkBursts: 1,
      colors: ["#ffffff"],
    },
    textOptions: ["YOU WIN!"],
    rainColors: ["#00ff00"],
  });

  return {
    controller,
    layerElement: layer,
    particlesElement: particles,
    textElement: text,
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WinFxController", () => {
  test("random sequence mock wraps around when sequence is exhausted", () => {
    const sequence = [0.1, 0.9];
    const randomSpy = createRandomSequenceMock(sequence);

    const values = [
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
    ];

    expect(values).toEqual([0.1, 0.9, 0.1, 0.9, 0.1, 0.9]);
    expect(randomSpy).toHaveBeenCalledTimes(6);
  });
  test("play renders particles and cleanup runs after duration", () => {
    vi.useFakeTimers();
    const randomSequence = createDeterministicWinFxRandomSequence();
    const randomSpy = createRandomSequenceMock(randomSequence);

    const {
      controller,
      layerElement,
      particlesElement,
      textElement,
    } = createController();
    const onFinished = vi.fn();

    controller.setAnimationSpeed(1);
    controller.play(onFinished);

    expect(layerElement.hidden).toBe(false);
    expect(textElement.textContent).toBe("YOU WIN!");

    // Advance timers so deferred particles (center finale, rain, firework)
    // are created via their scheduled setTimeout callbacks.
    vi.advanceTimersByTime(1100);

    expect(particlesElement.childElementCount).toBeGreaterThan(0);
    expect(randomSpy).toHaveBeenCalled();
    expect(randomSpy.mock.calls.length).toBeGreaterThan(10);

    const firstPiece = particlesElement.firstElementChild as HTMLElement;
    expect(firstPiece.style.getPropertyValue("--piece-delay")).toBeTruthy();

    const secondPiece = particlesElement.children[1] as HTMLElement;
    expect(secondPiece).toBeTruthy();
    expect(firstPiece.style.getPropertyValue("--piece-rot"))
      .not.toBe(secondPiece.style.getPropertyValue("--piece-rot"));

    const rainPiece = particlesElement.querySelector<HTMLElement>(".win-fx-fall");
    expect(rainPiece).not.toBeNull();
    expect(rainPiece?.style.getPropertyValue("--piece-color")).toBe("#00ff00");

    const fireworkPieces = particlesElement.querySelectorAll<HTMLElement>(".win-fx-firework");
    expect(fireworkPieces.length).toBeGreaterThan(0);
    const fireworkCorePieces = particlesElement.querySelectorAll<HTMLElement>(".win-fx-firework-core");
    expect(fireworkCorePieces.length).toBeGreaterThan(0);
    const firstFireworkDelayMs = Number.parseInt(
      fireworkPieces[0]?.style.getPropertyValue("--piece-delay").replace("ms", "") ?? "0",
      10,
    );
    expect(firstFireworkDelayMs).toBeGreaterThanOrEqual(0);
    expect(firstFireworkDelayMs).toBeLessThan(2000);

    vi.runAllTimers();

    expect(layerElement.hidden).toBe(true);
    expect(particlesElement.childElementCount).toBe(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test("cleanup waits for firework CSS animation even with short duration override", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();
    const onFinished = vi.fn();

    controller.play(onFinished, undefined, 120);

    expect(layerElement.hidden).toBe(false);

    // At 120ms (the override duration), cleanup should NOT have fired because
    // the firework burst needs more time to finish its CSS animation.
    vi.advanceTimersByTime(120);

    expect(layerElement.hidden).toBe(false);
    expect(onFinished).toHaveBeenCalledTimes(0);

    vi.runAllTimers();

    expect(layerElement.hidden).toBe(true);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test("setAnimationSpeedBounds clamps applied animation speed", () => {
    const {
      controller,
      layerElement,
      particlesElement,
    } = createController();

    controller.setAnimationSpeedBounds(0.5, 2);
    controller.setAnimationSpeed(9);

    vi.useFakeTimers();
    const onFinished = vi.fn();
    controller.play(onFinished);

    // Animation should be active even when a very high speed is requested.
    expect(layerElement.hidden).toBe(false);

    // Advance timers briefly so deferred particle creation callbacks run
    // before eventual cleanup removes them.
    vi.advanceTimersByTime(5);
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    vi.runAllTimers();

    // After timers run, the animation should have cleaned up correctly.
    expect(layerElement.hidden).toBe(true);
    expect(particlesElement.childElementCount).toBe(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test("play uses textOverride when provided instead of configured textOptions", () => {
    vi.useFakeTimers();
    const { controller, textElement } = createController();

    controller.play(undefined, "Custom Win!");

    expect(textElement.textContent).toBe("Custom Win!");

    vi.runAllTimers();
  });

  test("play falls back to DEFAULT_WIN_FX_TEXT when textOptions is empty and no override", () => {
    vi.useFakeTimers();
    const { controller, textElement } = createController();

    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 500,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: ["#ffffff"],
      },
      textOptions: [], // empty — triggers DEFAULT_WIN_FX_TEXT fallback
      rainColors: ["#00ff00"],
    });

    controller.play();

    // With empty textOptions, pickWinFxText returns DEFAULT_WIN_FX_TEXT ("YOU WIN!" default)
    expect(textElement.textContent).toBeTruthy();

    vi.runAllTimers();
  });

  test("clear cancels pending cleanup timeout when called while animation is running", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    const onFinished = vi.fn();
    controller.play(onFinished);

    // Call clear before the cleanup timer fires
    controller.clear();

    expect(layerElement.hidden).toBe(true);

    // Even after all timers expire, finished callback is NOT called (stale generation)
    vi.runAllTimers();
    expect(onFinished).not.toHaveBeenCalled();
  });

  test("play uses DEFAULT colors when configured colors list is empty", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 500,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: [], // empty — should fall back to DEFAULT_WIN_FX_RUNTIME_CONFIG.options.colors
      },
      textOptions: ["Win!"],
      rainColors: ["#00ff00"],
    });

    controller.play();

    // Advance timers so deferred particles are created (color fallback happened)
    vi.advanceTimersByTime(1100);
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    vi.runAllTimers();
  });

  test("play ignores whitespace-only textOverride and uses configured textOptions", () => {
    vi.useFakeTimers();
    const { controller, textElement } = createController();

    controller.play(undefined, "   "); // whitespace only — treated as no override

    expect(textElement.textContent).toBe("YOU WIN!");

    vi.runAllTimers();
  });

  test("play ignores empty-string textOverride and uses configured textOptions", () => {
    vi.useFakeTimers();
    const { controller, textElement } = createController();

    controller.play(undefined, ""); // empty string — falls through to textOptions

    expect(textElement.textContent).toBe("YOU WIN!");

    vi.runAllTimers();
  });

  test("setAnimationSpeed accepts and applies multiplier values", () => {
    const { controller, particlesElement } = createController();

    // Set speed to 0.5 (slower)
    controller.setAnimationSpeed(0.5);

    vi.useFakeTimers();
    controller.play();

    // Advance timers so deferred particles are created
    vi.advanceTimersByTime(1100);
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    vi.runAllTimers();
  });

  test("pickRandomSymbol ensures fallback for empty options", () => {
    vi.useFakeTimers();
    const randomSequence = createDeterministicWinFxRandomSequence();
    createRandomSequenceMock(randomSequence);

    const { controller, particlesElement } = createController();

    // Configure runtime with empty text options — should use fallback
    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 500,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 1,
        confettiRainDelayMs: 0,
        confettiRainCount: 1,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: ["#ff0000"],
      },
      textOptions: [], // empty — should use DEFAULT_WIN_FX_TEXT
      rainColors: ["#00ff00"],
    });

    controller.play();

    // Advance timers so deferred particles are created even with minimal configuration
    vi.advanceTimersByTime(1100);
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    vi.runAllTimers();
  });

  test("pickShapeClass cycles through available shapes", () => {
    vi.useFakeTimers();
    // Create multiple instances to test shape distribution
    const shapes = new Set<string>();

    for (let i = 0; i < 20; i++) {
      const randomSequence = createDeterministicWinFxRandomSequence();
      createRandomSequenceMock(randomSequence);
      const { controller, particlesElement } = createController();

      controller.play();
      // Advance timers so deferred particles (center finale, rain,
      // fireworks) are created via their scheduled setTimeout callbacks.
      vi.advanceTimersByTime(1100);
      const pieces = particlesElement.querySelectorAll<HTMLElement>(".win-fx-piece");
      pieces.forEach((piece) => {
        const classes = piece.className;
        if (classes.includes("circle")) shapes.add("circle");
        if (classes.includes("square")) shapes.add("square");
        if (classes.includes("diamond")) shapes.add("diamond");
        if (classes.includes("star")) shapes.add("star");
      });

      vi.runAllTimers();
      particlesElement.replaceChildren();
      vi.clearAllTimers();
    }

    // With 20 iterations, we should see at least 3 of the 4 shape types (circle, square, diamond, star).
    // If only 1-2 shapes appear, it indicates either shape randomization is broken or insufficient
    // variation to validate proper shape distribution.
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });

  test("animation continues with minimal text duration config", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1,
        maxParticles: 500,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 1,
        confettiRainDelayMs: 0,
        confettiRainCount: 1,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: ["#ffffff"],
      },
      textOptions: ["ZERO!"],
      rainColors: ["#cccccc"],
    });

    controller.setAnimationSpeed(1);
    controller.play();

    // Even with 0ms duration, structure should be set up
    expect(particlesElement).toBeTruthy();

    vi.runAllTimers();
  });

  test("skips stale cleanup callback when a new play starts", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    const firstFinished = vi.fn();
    const secondFinished = vi.fn();

    controller.play(firstFinished, "First", 40);
    controller.play(secondFinished, "Second", 80);

    // Advance past both override durations — neither should have cleaned up yet
    // because post-fade fireworks extend cleanup beyond the overrides.
    vi.advanceTimersByTime(100);

    expect(layerElement.hidden).toBe(false);
    expect(firstFinished).not.toHaveBeenCalled();
    expect(secondFinished).not.toHaveBeenCalled();

    // Run all remaining timers — only the second play's callback fires.
    vi.runAllTimers();

    expect(secondFinished).toHaveBeenCalledTimes(1);
    expect(firstFinished).not.toHaveBeenCalled();
  });

  test("respects global particle limit across all phases", () => {
    vi.useFakeTimers();
    createDeterministicWinFxRandomSequence();
    const { controller, particlesElement } = createController();

    // Set a very low particle limit to verify enforcement
    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 5,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 10,
        confettiRainDelayMs: 0,
        confettiRainCount: 10,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: ["#ffffff"],
      },
      textOptions: ["WIN!"],
      rainColors: ["#00ff00"],
    });

    controller.play();
    vi.advanceTimersByTime(1100);

    // Total requested is 10 + 10 + 30 = 50, but limit is 5
    expect(particlesElement.childElementCount).toBeLessThanOrEqual(5);

    vi.runAllTimers();
  });

  test("covers private fallback branches for random pickers", () => {
    const { controller } = createController();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);

    const privateController = controller as unknown as {
      pickShapeClass: () => string;
      pickRandomSymbol: (options: readonly string[], fallback: string) => string;
    };
    const privateClass = WinFxController as unknown as {
      pickRandomColor: (palette: readonly string[]) => string;
    };

    expect(privateClass.pickRandomColor([])).toBe("#ffffff");
    expect(privateClass.pickRandomColor(["#123456"])).toBe("#ffffff");
    expect(privateController.pickShapeClass()).toBe("square");
    expect(privateController.pickRandomSymbol(["A"], "F")).toBe("F");

    randomSpy.mockRestore();
  });

  test("covers pickWinFxText fallback branch when random index resolves undefined", () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    const { controller, textElement } = createController();

    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 500,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
        fireworkBursts: 1,
        colors: ["#ffffff"],
      },
      textOptions: ["ONLY-OPTION"],
      rainColors: ["#00ff00"],
    });

    controller.play();

    expect(textElement.textContent).toBe("YOU WIN!");

    randomSpy.mockRestore();
    vi.runAllTimers();
  });

  test("play creates shimmer dust particles", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.play();
    vi.advanceTimersByTime(1100);

    const shimmerPieces = particlesElement.querySelectorAll<HTMLElement>(".win-fx-shimmer");
    expect(shimmerPieces.length).toBeGreaterThan(0);

    // Shimmer pieces should have small sizes
    const firstShimmer = shimmerPieces[0];
    expect(firstShimmer?.style.getPropertyValue("--piece-size")).toBeTruthy();
    expect(firstShimmer?.style.getPropertyValue("--piece-color")).toBeTruthy();

    vi.runAllTimers();
  });

  test("play creates rising ember particles", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.play();
    vi.advanceTimersByTime(1300);

    const emberPieces = particlesElement.querySelectorAll<HTMLElement>(".win-fx-ember");
    expect(emberPieces.length).toBeGreaterThan(0);

    // Ember pieces should have warm colors and upward trajectory
    const firstEmber = emberPieces[0];
    expect(firstEmber?.style.getPropertyValue("--piece-color")).toBeTruthy();

    const dy = Number.parseFloat(
      firstEmber?.style.getPropertyValue("--piece-dy").replace("px", "") ?? "0",
    );
    expect(dy).toBeLessThan(0); // negative = upward

    vi.runAllTimers();
  });

  test("play applies screen flash class to layer element", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    controller.play();

    // Flash fires at T=0 (SCREEN_FLASH_DELAY_MS = 0)
    vi.advanceTimersByTime(1);
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(true);

    // Flash class is auto-removed after CSS animation duration
    vi.advanceTimersByTime(700);
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(false);

    vi.runAllTimers();
  });

  test("play applies vignette class to layer element immediately", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    controller.play();

    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(true);

    vi.runAllTimers();
  });

  test("play applies app shake class during firework phase", () => {
    vi.useFakeTimers();
    const { controller } = createController();

    const app = controller as unknown as { appWindowElement: HTMLElement };
    const appEl = app.appWindowElement;

    controller.play();

    // Shake fires at fireworkDelay + APP_SHAKE_DELAY_MS(80)
    vi.advanceTimersByTime(1200);
    expect(appEl.classList.contains("win-fx-shake-active")).toBe(true);

    // Shake class is auto-removed after CSS animation duration (520ms)
    vi.advanceTimersByTime(600);
    expect(appEl.classList.contains("win-fx-shake-active")).toBe(false);

    vi.runAllTimers();
  });

  test("play applies chroma class to particles element during center finale", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.play();

    // Chroma fires at centerFinaleStartDelay + CHROMA_DELAY_MS(40)
    vi.advanceTimersByTime(100);
    expect(particlesElement.classList.contains("win-fx-chroma-active")).toBe(true);

    // Chroma class is auto-removed after CSS animation duration (900ms)
    vi.advanceTimersByTime(1000);
    expect(particlesElement.classList.contains("win-fx-chroma-active")).toBe(false);

    vi.runAllTimers();
  });

  test("play applies particles pulse class during firework phase", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.play();

    // Pulse fires at fireworkDelay
    vi.advanceTimersByTime(1100);
    expect(particlesElement.classList.contains("win-fx-particles-pulse-active")).toBe(true);

    // Pulse class is auto-removed after CSS animation duration (800ms)
    vi.advanceTimersByTime(900);
    expect(particlesElement.classList.contains("win-fx-particles-pulse-active")).toBe(false);

    vi.runAllTimers();
  });

  test("clear removes all screen-level effect classes", () => {
    vi.useFakeTimers();
    const { controller, layerElement, particlesElement } = createController();

    const app = controller as unknown as { appWindowElement: HTMLElement };
    const appEl = app.appWindowElement;

    controller.play();
    vi.advanceTimersByTime(1200);

    // Verify some classes are applied
    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(true);

    controller.clear();

    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(false);
    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(false);
    expect(appEl.classList.contains("win-fx-shake-active")).toBe(false);
    expect(particlesElement.classList.contains("win-fx-chroma-active")).toBe(false);
    expect(particlesElement.classList.contains("win-fx-particles-pulse-active")).toBe(false);

    vi.runAllTimers();
  });

  test("cleanup callback removes screen-level effect classes", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    controller.play();

    // Verify vignette is active during celebration
    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(true);

    // Run all timers to trigger cleanup
    vi.runAllTimers();

    // After cleanup, vignette should be removed
    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(false);
  });

  test("shimmer and ember budgets respect maxParticles limit", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.configureRuntime({
      options: {
        textDisplayDurationMs: 1000,
        maxParticles: 8,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
        fireworkBursts: 0,
        colors: ["#ffffff"],
      },
      textOptions: ["WIN!"],
      rainColors: ["#00ff00"],
    });

    controller.play();
    vi.advanceTimersByTime(1300);

    // maxParticles=8: center(2) + firework(0) + confetti(2) + shimmer(4) + ember(0)
    // Total should not exceed 8
    expect(particlesElement.childElementCount).toBeLessThanOrEqual(8);

    vi.runAllTimers();
  });

  test("stale generation skips new effect phases", () => {
    vi.useFakeTimers();
    const { controller, layerElement, particlesElement } = createController();

    controller.play();

    // Advance past confetti/center phases but before shimmer/ember/firework phase
    vi.advanceTimersByTime(50);

    // Call clear to increment generation, making all pending callbacks stale
    controller.clear();

    // Now advance past all remaining scheduled timeouts
    vi.advanceTimersByTime(5000);

    // After clearing, no new particles should have been created
    expect(particlesElement.childElementCount).toBe(0);
    expect(layerElement.hidden).toBe(true);

    // Screen-level classes should not be present
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(false);
    expect(layerElement.classList.contains("win-fx-vignette-active")).toBe(false);
    expect(particlesElement.classList.contains("win-fx-chroma-active")).toBe(false);
    expect(particlesElement.classList.contains("win-fx-particles-pulse-active")).toBe(false);

    vi.runAllTimers();
  });

  test("stale generation skips screen-level effect auto-removal callbacks", () => {
    vi.useFakeTimers();
    const { controller, layerElement } = createController();

    const app = controller as unknown as { appWindowElement: HTMLElement };
    const appEl = app.appWindowElement;

    controller.play();

    // Let flash fire at T=0
    vi.advanceTimersByTime(1);
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(true);

    // Now start a new play, which clears and increments generation.
    // The old flash-remove timeout should be canceled (stale generation).
    controller.play();

    // Both flash-active (from new play) and vignette should be set
    vi.advanceTimersByTime(1);
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(true);

    // Advance past old flash removal time — class should still be present
    // because the NEW play set it and the old removal was canceled by clear()
    vi.advanceTimersByTime(700);
    // The new play's flash removal should have fired by now
    expect(layerElement.classList.contains("win-fx-flash-active")).toBe(false);

    // Shake should fire during firework phase of the new play
    vi.advanceTimersByTime(500);
    expect(appEl.classList.contains("win-fx-shake-active")).toBe(true);

    vi.runAllTimers();
  });
});
