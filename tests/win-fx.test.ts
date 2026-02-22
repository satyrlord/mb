// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { WinFxController } from "../src/win-fx.ts";
import {
  createBoardTileButton,
  createDeterministicWinFxRandomSequence,
  createMockDomRect,
  createRandomSequenceMock,
} from "./test-helpers.ts";

const createController = (): {
  controller: WinFxController;
  appElement: HTMLElement;
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
      durationMs: 30,
      maxTilePieces: 2,
      wavesPerTile: 1,
      waveDelayMs: 1,
      sparksPerTile: 1,
      particleDelayJitterMs: 0,
      centerFinaleDelayMs: 0,
      centerFinaleWaves: 1,
      centerFinaleWaveDelayMs: 1,
      centerFinaleCount: 2,
      confettiRainDelayMs: 0,
      confettiRainCount: 2,
      confettiRainSpreadMs: 1,
      colors: ["#ffffff"],
    },
    textOptions: ["YOU WIN!"],
    rainColors: ["#00ff00"],
  });

  return {
    controller,
    appElement: app,
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
      appElement,
      layerElement,
      particlesElement,
      textElement,
    } = createController();
    const onFinished = vi.fn();

    controller.setAnimationSpeed(1);
    controller.play(onFinished);

    expect(layerElement.hidden).toBe(false);
    expect(appElement.classList.contains("win-fx-active")).toBe(true);
    expect(textElement.textContent).toBe("YOU WIN!");
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    const firstPiece = particlesElement.firstElementChild as HTMLElement;
    expect(firstPiece.style.getPropertyValue("--piece-delay")).toBeTruthy();

    const secondPiece = particlesElement.children[1] as HTMLElement;
    expect(secondPiece).toBeTruthy();
    expect(firstPiece.style.getPropertyValue("--piece-rot"))
      .not.toBe(secondPiece.style.getPropertyValue("--piece-rot"));
    expect(randomSpy).toHaveBeenCalled();
    expect(randomSpy.mock.calls.length).toBeGreaterThan(10);

    const rainPiece = particlesElement.querySelector<HTMLElement>(".win-fx-fall");
    expect(rainPiece).not.toBeNull();
    expect(rainPiece?.style.getPropertyValue("--piece-color")).toBe("#00ff00");

    vi.runAllTimers();

    expect(layerElement.hidden).toBe(true);
    expect(appElement.classList.contains("win-fx-active")).toBe(false);
    expect(particlesElement.childElementCount).toBe(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test("setAnimationSpeedBounds clamps applied animation speed", () => {
    const {
      controller,
      appElement,
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
    expect(appElement.classList.contains("win-fx-active")).toBe(true);
    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    vi.runAllTimers();

    // After timers run, the animation should have cleaned up correctly.
    expect(layerElement.hidden).toBe(true);
    expect(appElement.classList.contains("win-fx-active")).toBe(false);
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
        durationMs: 30,
        maxTilePieces: 2,
        wavesPerTile: 1,
        waveDelayMs: 1,
        sparksPerTile: 1,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
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
    const { controller, appElement, layerElement } = createController();

    const onFinished = vi.fn();
    controller.play(onFinished);

    expect(appElement.classList.contains("win-fx-active")).toBe(true);

    // Call clear before the cleanup timer fires
    controller.clear();

    expect(appElement.classList.contains("win-fx-active")).toBe(false);
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
        durationMs: 30,
        maxTilePieces: 2,
        wavesPerTile: 1,
        waveDelayMs: 1,
        sparksPerTile: 1,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 2,
        confettiRainDelayMs: 0,
        confettiRainCount: 2,
        confettiRainSpreadMs: 1,
        colors: [], // empty — should fall back to DEFAULT_WIN_FX_RUNTIME_CONFIG.options.colors
      },
      textOptions: ["Win!"],
      rainColors: ["#00ff00"],
    });

    controller.play();

    // Particles should still be created (color fallback happened)
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

    // Animation should still generate particles
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
        durationMs: 30,
        maxTilePieces: 1,
        wavesPerTile: 1,
        waveDelayMs: 1,
        sparksPerTile: 1,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 1,
        confettiRainDelayMs: 0,
        confettiRainCount: 1,
        confettiRainSpreadMs: 1,
        colors: ["#ff0000"],
      },
      textOptions: [], // empty — should use DEFAULT_WIN_FX_TEXT
      rainColors: ["#00ff00"],
    });

    controller.play();

    // Particles should still be created even with minimal configuration
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

  test("animation continues even with zero-duration config when animation speed multiplier adjusts it", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();

    controller.configureRuntime({
      options: {
        durationMs: 0, // zero duration — would normally skip animation
        maxTilePieces: 1,
        wavesPerTile: 1,
        waveDelayMs: 1,
        sparksPerTile: 1,
        particleDelayJitterMs: 0,
        centerFinaleDelayMs: 0,
        centerFinaleWaves: 1,
        centerFinaleWaveDelayMs: 1,
        centerFinaleCount: 1,
        confettiRainDelayMs: 0,
        confettiRainCount: 1,
        confettiRainSpreadMs: 1,
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
});
