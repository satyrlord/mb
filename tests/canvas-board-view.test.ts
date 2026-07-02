// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { BoardTileViewModel } from "../src/board.ts";
import {
  buildPlasmaField,
  buildPlasmaPalette,
  CanvasBoardView,
  parseCssPositiveNumber,
} from "../src/canvas-board-view.ts";
import { createMockDomRect } from "./test-helpers.ts";

vi.mock("../src/icon-assets.ts", () => ({
  getIconAssetByToken: (token: string) =>
    token === "asset-token" ? { src: "icon/test.svg", label: "Test icon" } : null,
}));

vi.mock("../src/flag-emoji.ts", () => ({
  getFlagEmojiSvgUrl: (icon: string) =>
    icon === "flag-token" ? "https://flags.example/x.svg" : null,
  getFlagEmojiCountryName: (icon: string) => (icon === "flag-token" ? "Testland" : null),
}));

/** Minimal 2D context test double recording every call the renderer makes. */
const createFakeContext2d = () => ({
  globalAlpha: 1,
  fillStyle: "" as unknown,
  strokeStyle: "",
  lineWidth: 1,
  font: "",
  textAlign: "",
  textBaseline: "",
  shadowColor: "",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createImageData: vi.fn((width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  })),
  putImageData: vi.fn(),
});

type FakeContext2d = ReturnType<typeof createFakeContext2d>;

class FakeImage {
  public complete = true;

  public naturalWidth = 32;

  public decoding = "";

  public src = "";

  public constructor() {
    fakeImages.push(this);
  }
}

let fakeImages: FakeImage[] = [];
let createdContexts: FakeContext2d[] = [];
let rafQueue: FrameRequestCallback[] = [];
let rafIdCounter = 0;
let reducedMotionMatches = false;
let activeViews: CanvasBoardView[] = [];

/** Runs all pending animation-frame callbacks with the given timestamp. */
const stepFrame = (now: number): void => {
  const callbacks = rafQueue;

  rafQueue = [];

  for (const callback of callbacks) {
    callback(now);
  }
};

/** The context created for the main board canvas. */
const mainContext = (): FakeContext2d => createdContexts[0];

/** The context created for the offscreen plasma texture canvas. */
const plasmaContext = (): FakeContext2d => createdContexts[1];

const defineSize = (element: HTMLElement, width: number, height: number): void => {
  Object.defineProperty(element, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(element, "offsetHeight", { value: height, configurable: true });
};

/**
 * Assigns grid-like bounding rects to the container's tile buttons so the
 * canvas geometry sync sees a laid-out board (jsdom performs no layout).
 */
const layoutButtons = (container: HTMLElement, columns: number, tileSize = 80): void => {
  const buttons = container.querySelectorAll<HTMLButtonElement>("button[data-index]");

  for (const [index, button] of [...buttons].entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rect = createMockDomRect(
      8 + column * (tileSize + 10),
      8 + row * (tileSize + 10),
      tileSize,
      tileSize,
    );

    button.getBoundingClientRect = () => rect;
  }
};

const createView = (): {
  parent: HTMLElement;
  container: HTMLElement;
  view: CanvasBoardView;
  onSelect: ReturnType<typeof vi.fn>;
} => {
  const parent = document.createElement("div");
  const container = document.createElement("section");

  parent.append(container);
  document.body.append(parent);
  defineSize(container, 300, 200);
  container.getBoundingClientRect = () => createMockDomRect(0, 0, 300, 200);

  const onSelect = vi.fn();
  const view = new CanvasBoardView(container, onSelect);

  activeViews.push(view);

  return { parent, container, view, onSelect };
};

const tile = (icon: string, status: BoardTileViewModel["status"]): BoardTileViewModel => ({
  icon,
  status,
});

/** Renders tiles and lays out the resulting buttons in one step. */
const renderBoard = (
  view: CanvasBoardView,
  container: HTMLElement,
  tiles: BoardTileViewModel[],
  columns: number,
): void => {
  view.render(tiles, columns);
  layoutButtons(container, columns);
};

const glyphCalls = (ctx: FakeContext2d, glyph: string): unknown[][] =>
  ctx.fillText.mock.calls.filter((call) => call[0] === glyph);

describe("CanvasBoardView helpers", () => {
  test("parseCssPositiveNumber parses durations and falls back on bad input", () => {
    expect(parseCssPositiveNumber("560ms", 1)).toBe(560);
    expect(parseCssPositiveNumber(" 2 ", 1)).toBe(2);
    expect(parseCssPositiveNumber("", 42)).toBe(42);
    expect(parseCssPositiveNumber("abc", 42)).toBe(42);
    expect(parseCssPositiveNumber("-5", 42)).toBe(42);
    expect(parseCssPositiveNumber("0", 42)).toBe(42);
  });

  test("buildPlasmaField produces a full field within palette range", () => {
    const field = buildPlasmaField(16);

    expect(field.length).toBe(256);

    for (const value of field) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    }
  });

  test("buildPlasmaPalette produces 256 varied RGB entries", () => {
    const palette = buildPlasmaPalette();

    expect(palette.length).toBe(768);
    // Phase-shifted channels must differ at the start of the cycle.
    expect(palette[0]).not.toBe(palette[1]);
  });
});

describe("CanvasBoardView", () => {
  beforeEach(() => {
    createdContexts = [];
    fakeImages = [];
    rafQueue = [];
    rafIdCounter = 0;
    reducedMotionMatches = false;
    activeViews = [];

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      const ctx = createFakeContext2d();

      createdContexts.push(ctx);

      return ctx as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      rafQueue.push(callback);
      rafIdCounter += 1;

      return rafIdCounter;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockReturnValue(0);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: reducedMotionMatches })),
    });
    vi.stubGlobal("Image", FakeImage);

    // Fast flip animation so tests can cross the half-flip point quickly.
    document.documentElement.style.setProperty("--tile-flip-duration-ms", "100");
  });

  afterEach(() => {
    for (const view of activeViews) {
      view.destroy();
    }

    document.body.innerHTML = "";
    document.documentElement.style.cssText = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("activates canvas mode: layer inserted, suppression class added, loop scheduled", () => {
    const { parent, container } = createView();
    const canvas = parent.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe("board-canvas-layer");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.nextElementSibling).toBe(container);
    expect(container.classList.contains("board--canvas")).toBe(true);
    expect(rafQueue.length).toBe(1);
  });

  test("falls back to DOM rendering when no 2D context is available", () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);

    const { parent, container, view } = createView();

    expect(parent.querySelector("canvas")).toBeNull();
    expect(container.classList.contains("board--canvas")).toBe(false);
    expect(rafQueue.length).toBe(0);

    // The inherited DOM rendering still works and canvas APIs stay inert.
    view.render([tile("🧠", "hidden"), tile("🧠", "hidden")], 2);
    expect(container.querySelectorAll("button[data-index]").length).toBe(2);
    view.animateMatchedPair(0, 1, 0);
    view.destroy();
  });

  test("falls back to DOM rendering when the container is detached", () => {
    const container = document.createElement("section");
    const view = new CanvasBoardView(container, vi.fn());

    activeViews.push(view);
    expect(container.classList.contains("board--canvas")).toBe(false);
    expect(rafQueue.length).toBe(0);
  });

  test("guards against synchronous requestAnimationFrame stubs", () => {
    let syncInvocations = 0;

    vi.mocked(window.requestAnimationFrame).mockImplementation((callback) => {
      syncInvocations += 1;

      if (syncInvocations <= 2) {
        callback(0);
      }

      return syncInvocations;
    });

    expect(() => createView()).not.toThrow();
  });

  test("draws the front face with plasma, specular, and glyph for hidden tiles", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);

    const ctx = mainContext();

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 300, 200);
    expect(glyphCalls(ctx, "?").length).toBe(1);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    // Plasma sample drawn from the offscreen texture canvas.
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(plasmaContext().putImageData).toHaveBeenCalledTimes(1);
  });

  test("renders a revealed tile's back face immediately on first render", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "revealed")], 1);
    stepFrame(16);

    expect(glyphCalls(mainContext(), "🧠").length).toBe(1);
    expect(glyphCalls(mainContext(), "?").length).toBe(0);
  });

  test("animates a flip from front to back across frames", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(0);

    view.render([tile("🧠", "revealed")], 1);

    const ctx = mainContext();

    ctx.fillText.mockClear();
    // Flip duration is 100ms; 10ms in, the front face still shows.
    stepFrame(10);
    expect(glyphCalls(ctx, "?").length).toBe(1);
    expect(glyphCalls(ctx, "🧠").length).toBe(0);

    ctx.fillText.mockClear();
    stepFrame(100);
    stepFrame(200);
    expect(glyphCalls(ctx, "🧠").length).toBeGreaterThan(0);
  });

  test("flips back to the front face after a mismatch resolve", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "revealed")], 1);
    stepFrame(0);
    view.render([tile("🧠", "hidden")], 1);
    stepFrame(100);
    stepFrame(200);

    const ctx = mainContext();

    ctx.fillText.mockClear();
    stepFrame(300);
    expect(glyphCalls(ctx, "?").length).toBe(1);
  });

  test("skips drawing at the edge-on midpoint of a flip", () => {
    const { container, view } = createView();

    // One clamped 100ms step lands exactly on the eased half-flip point.
    document.documentElement.style.setProperty("--tile-flip-duration-ms", "484.73");
    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(0);
    view.render([tile("🧠", "revealed")], 1);

    const ctx = mainContext();

    ctx.translate.mockClear();
    stepFrame(100);
    expect(ctx.translate).not.toHaveBeenCalled();
  });

  test("clamps large frame deltas so background tabs do not fast-forward flips", () => {
    const { container, view } = createView();

    document.documentElement.style.setProperty("--tile-flip-duration-ms", "1000");
    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(0);
    view.render([tile("🧠", "revealed")], 1);

    const ctx = mainContext();

    ctx.fillText.mockClear();
    // A 5000ms gap is clamped to 100ms: flip progress 0.1, front still shown
    // (an unclamped delta would have completed the flip to the back face).
    stepFrame(5000);
    expect(glyphCalls(ctx, "?").length).toBe(1);
  });

  test("draws the blocked glyph without plasma", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "blocked")], 1);
    stepFrame(16);

    const ctx = mainContext();

    expect(glyphCalls(ctx, "•").length).toBe(1);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  test("draws matched tiles with the green glow and dissolves them after the pause", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "matched")], 1);
    stepFrame(16);

    const ctx = mainContext();

    expect(ctx.shadowColor).toBe("rgba(74, 222, 128, 0.86)");

    view.animateMatchedPair(0, 0, 200);
    // Before the pause elapses the tile still draws.
    ctx.translate.mockClear();
    stepFrame(100);
    expect(ctx.translate).toHaveBeenCalled();

    // Dissolve duration is 500ms; step past pause + duration.
    for (let now = 200; now <= 900; now += 100) {
      stepFrame(now);
    }

    ctx.translate.mockClear();
    stepFrame(1000);
    expect(ctx.translate).not.toHaveBeenCalled();
  });

  test("re-rendering a non-matched status resets the dissolve state", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "matched")], 1);
    stepFrame(16);
    view.animateMatchedPair(0, 0, 0);

    for (let now = 100; now <= 700; now += 100) {
      stepFrame(now);
    }

    // Restart the board: same tile back to hidden must draw again.
    view.render([tile("🧠", "hidden")], 1);

    const ctx = mainContext();

    ctx.translate.mockClear();
    stepFrame(800);
    expect(ctx.translate).toHaveBeenCalled();
  });

  test("animateMatchedPair ignores indices without canvas state", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "matched")], 1);
    expect(() => view.animateMatchedPair(5, 9, 0)).not.toThrow();
  });

  test("applies the hover lift for hidden tiles and clears it on pointerleave", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);

    const button = container.querySelector<HTMLButtonElement>("button[data-index='0']");

    button?.dispatchEvent(new Event("pointermove", { bubbles: true }));

    const ctx = mainContext();

    stepFrame(16);
    expect(ctx.translate.mock.calls).toContainEqual([0, -2]);

    // A non-element event target leaves the hover state untouched.
    const textNode = container.appendChild(document.createTextNode("x"));

    textNode.dispatchEvent(new Event("pointermove", { bubbles: true }));
    ctx.translate.mockClear();
    stepFrame(32);
    expect(ctx.translate.mock.calls).toContainEqual([0, -2]);

    container.dispatchEvent(new Event("pointerleave"));
    ctx.translate.mockClear();
    stepFrame(48);
    expect(ctx.translate.mock.calls).not.toContainEqual([0, -2]);
  });

  test("skips all frame work while an ancestor frame is hidden", () => {
    const { parent, container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    parent.setAttribute("hidden", "");
    stepFrame(16);

    expect(mainContext().clearRect).not.toHaveBeenCalled();
    // The loop stays alive so it resumes when the frame is shown again.
    expect(rafQueue.length).toBe(1);
  });

  test("skips drawing when the container has zero size", () => {
    const { container, view } = createView();

    defineSize(container, 0, 0);
    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);

    expect(mainContext().clearRect).not.toHaveBeenCalled();
  });

  test("sizes the canvas backing store by device pixel ratio", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });

    const { parent, container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);

    const canvas = parent.querySelector("canvas");

    expect(canvas?.width).toBe(600);
    expect(canvas?.height).toBe(400);
    expect(mainContext().setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);

    Object.defineProperty(window, "devicePixelRatio", { value: 0, configurable: true });
    view.render([tile("🧠", "hidden")], 1);
    stepFrame(32);
    expect(mainContext().setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);

    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
  });

  test("normalizes tile rects by the container's on-screen scale", () => {
    const { container, view } = createView();

    // Container reports double its layout size, as under a 2x shell scale.
    container.getBoundingClientRect = () => createMockDomRect(0, 0, 600, 400);
    view.render([tile("🧠", "hidden")], 1);

    const button = container.querySelector<HTMLButtonElement>("button[data-index='0']");

    if (button === null) {
      throw new Error("Expected a tile button.");
    }

    button.getBoundingClientRect = () => createMockDomRect(16, 16, 160, 160);
    stepFrame(16);

    // Normalized rect is (8, 8, 80, 80) → tile center at (48, 48).
    expect(mainContext().translate.mock.calls).toContainEqual([48, 48]);
  });

  test("ignores buttons whose index has no canvas state", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);

    const orphan = document.createElement("button");

    orphan.dataset.index = "99";
    orphan.getBoundingClientRect = () => createMockDomRect(0, 0, 50, 50);
    container.append(orphan);

    const invalid = document.createElement("button");

    invalid.setAttribute("data-index", "abc");
    invalid.getBoundingClientRect = () => createMockDomRect(0, 0, 50, 50);
    container.append(invalid);

    expect(() => stepFrame(16)).not.toThrow();
    expect(glyphCalls(mainContext(), "?").length).toBe(1);
  });

  test("drops canvas state for tiles beyond a smaller re-render", () => {
    const { container, view } = createView();

    renderBoard(view, container, [
      tile("🧠", "hidden"),
      tile("🧠", "hidden"),
      tile("🧠", "hidden"),
      tile("🧠", "hidden"),
    ], 2);
    stepFrame(16);

    renderBoard(view, container, [tile("🧠", "hidden"), tile("🧠", "hidden")], 2);

    const ctx = mainContext();

    ctx.translate.mockClear();
    stepFrame(32);
    expect(ctx.translate).toHaveBeenCalledTimes(2);
  });

  test("re-renders plasma every frame while motion is enabled", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);
    stepFrame(32);

    expect(plasmaContext().putImageData).toHaveBeenCalledTimes(2);
  });

  test("renders plasma once when prefers-reduced-motion is set", () => {
    reducedMotionMatches = true;

    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);
    stepFrame(32);

    expect(plasmaContext().putImageData).toHaveBeenCalledTimes(1);
  });

  test("renders plasma once when HD mode is off, continuously when on", () => {
    const { parent, container, view } = createView();

    parent.setAttribute("data-hd-mode", "off");
    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);
    stepFrame(32);
    expect(plasmaContext().putImageData).toHaveBeenCalledTimes(1);

    parent.setAttribute("data-hd-mode", "on");
    stepFrame(48);
    expect(plasmaContext().putImageData).toHaveBeenCalledTimes(2);
  });

  test("draws tiles without plasma when the offscreen context is unavailable", () => {
    // First getContext call (main canvas) succeeds, second (plasma) fails.
    vi.mocked(HTMLCanvasElement.prototype.getContext)
      .mockImplementationOnce(() => {
        const ctx = createFakeContext2d();

        createdContexts.push(ctx);

        return ctx as unknown as CanvasRenderingContext2D;
      })
      .mockImplementationOnce(() => null);

    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);

    const ctx = mainContext();

    expect(glyphCalls(ctx, "?").length).toBe(1);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  test("draws OpenMoji asset icons as cached images", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("asset-token", "revealed")], 1);
    stepFrame(16);
    stepFrame(32);

    const ctx = mainContext();
    const iconDraws = ctx.drawImage.mock.calls.filter(
      (call) => call[0] instanceof FakeImage,
    );

    // Drawn on both frames from a single cached image (74% of an 80px tile).
    expect(iconDraws.length).toBe(2);
    expect(iconDraws[0]?.slice(1)).toEqual([-29.6, -29.6, 59.2, 59.2]);
    expect(fakeImages.length).toBe(1);
    expect(fakeImages[0]?.src).toBe("icon/test.svg");
  });

  test("draws flag icons from the flag CDN URL", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("flag-token", "revealed")], 1);
    stepFrame(16);

    expect(fakeImages[0]?.src).toBe("https://flags.example/x.svg");
  });

  test("skips icon images that have not finished loading", () => {
    const { container, view } = createView();

    renderBoard(view, container, [tile("asset-token", "revealed")], 1);
    fakeImages.length = 0;
    renderBoard(view, container, [tile("asset-token", "revealed")], 1);
    stepFrame(16);

    const pendingImage = fakeImages[0] ?? createdContexts[0];

    // Mark the cached image as not loaded and re-draw.
    for (const image of fakeImages) {
      image.complete = false;
    }

    const ctx = mainContext();

    ctx.drawImage.mockClear();
    ctx.fillText.mockClear();
    stepFrame(32);

    const iconDraws = ctx.drawImage.mock.calls.filter(
      (call) => call[0] instanceof FakeImage,
    );

    expect(pendingImage).toBeDefined();
    expect(iconDraws.length).toBe(0);
    expect(glyphCalls(ctx, "asset-token").length).toBe(0);
  });

  test("re-measures geometry when the ResizeObserver fires", () => {
    const observerInstances: Array<{ callback: () => void }> = [];

    class FakeResizeObserver {
      public observe = vi.fn();

      public disconnect = vi.fn();

      public constructor(callback: () => void) {
        observerInstances.push({ callback });
      }
    }

    vi.stubGlobal("ResizeObserver", FakeResizeObserver);

    const { container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    stepFrame(16);

    const rectSpy = vi.fn(() => createMockDomRect(0, 0, 300, 200));

    container.getBoundingClientRect = rectSpy;
    // Without a resize notification, geometry is not re-measured.
    stepFrame(32);
    expect(rectSpy).not.toHaveBeenCalled();

    observerInstances[0]?.callback();
    stepFrame(48);
    expect(rectSpy).toHaveBeenCalled();
  });

  test("destroy stops the loop, removes the canvas layer, and restores DOM visuals", () => {
    const { parent, container, view } = createView();

    renderBoard(view, container, [tile("🧠", "hidden")], 1);
    view.destroy();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(parent.querySelector("canvas")).toBeNull();
    expect(container.classList.contains("board--canvas")).toBe(false);
    // Destroy is idempotent.
    expect(() => view.destroy()).not.toThrow();
  });
});
