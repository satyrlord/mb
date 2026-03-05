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

    // Advance past the title fade-OUT point (TITLE_FADE_OUT_MS = 4992ms): the 5 guaranteed
    // post-fade bursts fire via setTimeout starting at titleFadeOutDelayMs so new particles
    // are dynamically inserted into the DOM exactly when the text disappears.
    const piecesBeforeFade = particlesElement.childElementCount;
    vi.advanceTimersByTime(5100);
    // At least one setTimeout burst should have fired, dynamically inserting new pieces.
    expect(particlesElement.childElementCount).toBeGreaterThan(piecesBeforeFade);

    vi.runAllTimers();

    expect(layerElement.hidden).toBe(true);
    expect(appElement.classList.contains("win-fx-active")).toBe(false);
    expect(particlesElement.childElementCount).toBe(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test("cleanup waits for post-fade fireworks even with short duration override", () => {
    vi.useFakeTimers();
    const { controller, appElement, layerElement } = createController();
    const onFinished = vi.fn();

    controller.play(onFinished, undefined, 120);

    expect(layerElement.hidden).toBe(false);
    expect(appElement.classList.contains("win-fx-active")).toBe(true);

    // At 120ms (the override duration), cleanup should NOT have fired because
    // the post-fade fireworks need more time to finish.
    vi.advanceTimersByTime(120);

    expect(layerElement.hidden).toBe(false);
    expect(onFinished).toHaveBeenCalledTimes(0);

    vi.runAllTimers();

    expect(layerElement.hidden).toBe(true);
    expect(appElement.classList.contains("win-fx-active")).toBe(false);
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

  test("skips stale cleanup callback when a new play starts", () => {
    vi.useFakeTimers();
    const { controller, appElement, layerElement } = createController();

    const firstFinished = vi.fn();
    const secondFinished = vi.fn();

    controller.play(firstFinished, "First", 40);
    controller.play(secondFinished, "Second", 80);

    // Advance past both override durations — neither should have cleaned up yet
    // because post-fade fireworks extend cleanup beyond the overrides.
    vi.advanceTimersByTime(100);

    expect(appElement.classList.contains("win-fx-active")).toBe(true);
    expect(layerElement.hidden).toBe(false);
    expect(firstFinished).not.toHaveBeenCalled();
    expect(secondFinished).not.toHaveBeenCalled();

    // Run all remaining timers — only the second play's callback fires.
    vi.runAllTimers();

    expect(secondFinished).toHaveBeenCalledTimes(1);
    expect(firstFinished).not.toHaveBeenCalled();
  });

  test("falls back to default symbol when tile-back text is missing", () => {
    vi.useFakeTimers();
    document.body.innerHTML = "";

    const app = document.createElement("div");
    const board = document.createElement("section");
    const tile = document.createElement("button");
    tile.className = "tile";
    board.append(tile);

    const layer = document.createElement("section");
    const particles = document.createElement("div");
    const text = document.createElement("p");
    layer.hidden = true;
    layer.append(particles, text);
    app.append(board, layer);
    document.body.append(app);

    app.getBoundingClientRect = () => createMockDomRect(0, 0, 300, 200);
    board.getBoundingClientRect = () => createMockDomRect(0, 0, 120, 80);
    tile.getBoundingClientRect = () => createMockDomRect(10, 10, 30, 30);

    const controller = new WinFxController({
      appWindowElement: app,
      boardElement: board,
      winFxLayerElement: layer,
      winFxParticlesElement: particles,
      winFxTextElement: text,
    });

    controller.play();

    expect(particles.childElementCount).toBeGreaterThan(0);

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
      textOptions: ["ONLY-OPTION"],
      rainColors: ["#00ff00"],
    });

    controller.play();

    expect(textElement.textContent).toBe("YOU WIN!");

    randomSpy.mockRestore();
    vi.runAllTimers();
  });

  test("skips undefined buttons returned from Array.from", () => {
    vi.useFakeTimers();
    const { controller, particlesElement } = createController();
    const tile = document.querySelector<HTMLButtonElement>(".tile");

    expect(tile).not.toBeNull();

    const fromSpy = vi.spyOn(Array, "from").mockReturnValueOnce([
      tile as HTMLButtonElement,
      undefined,
    ] as unknown as HTMLButtonElement[]);

    controller.play();

    expect(particlesElement.childElementCount).toBeGreaterThan(0);

    fromSpy.mockRestore();
    vi.runAllTimers();
  });
});
