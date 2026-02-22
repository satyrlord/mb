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
});
