// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WindowResizeController, type WindowResizeConfig } from "../src/window-resize.js";
import { getOrientationAwareResizeConfig, type OrientationMode } from "../src/orientation-controller.js";

const DEFAULT_CONFIG: WindowResizeConfig = {
  fixedWindowAspectRatio: 16 / 10,
  windowBaseSize: { minWidthPx: 1024, minHeightPx: 640 },
  windowResizeLimits: {
    defaultScale: 1,
    minScale: 0.72,
    maxScale: 2,
    viewportPaddingPx: 24,
  },
};

/** Stub getBoundingClientRect on the given element. */
const stubBounds = (
  el: HTMLElement,
  width: number,
  height: number,
): void => {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });
};

/** Create a synthetic PointerEvent-like object (jsdom doesn't support PointerEvent). */
const pointerEvent = (
  type: string,
  overrides: Partial<{ button: number; clientX: number; clientY: number; pointerId: number }> = {},
): PointerEvent => {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperties(event, {
    button: { value: overrides.button ?? 0 },
    clientX: { value: overrides.clientX ?? 0 },
    clientY: { value: overrides.clientY ?? 0 },
    pointerId: { value: overrides.pointerId ?? 0 },
    preventDefault: { value: vi.fn() },
  });

  return event as unknown as PointerEvent;
};

describe("WindowResizeController", () => {
  let appShell: HTMLElement;
  let appWindow: HTMLElement;
  let resizeHandle: HTMLElement;
  let controller: WindowResizeController;

  beforeEach(() => {
    vi.useFakeTimers();
    appShell = document.createElement("div");
    appWindow = document.createElement("div");
    resizeHandle = document.createElement("div");

    // Provide reasonable viewport size
    Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 1080, configurable: true });

    controller = new WindowResizeController(
      appShell,
      appWindow,
      resizeHandle,
      () => DEFAULT_CONFIG,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ── Construction & initialization ──────────────────────────────────

  it("creates an instance without errors", () => {
    expect(controller).toBeDefined();
  });

  it("initialize sets CSS custom properties and dataset flag", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    expect(appShell.style.getPropertyValue("--app-base-width")).toBe("1024");
    expect(appShell.style.getPropertyValue("--app-base-height")).toBe("640");
    expect(appShell.dataset.resizeReady).toBe("true");
    expect(appShell.style.getPropertyValue("--ui-scale")).toBe("1");
  });

  it("initialize is a no-op when measured size is zero", () => {
    stubBounds(appWindow, 0, 0);
    controller.initialize();

    expect(appShell.dataset.resizeReady).toBeUndefined();
  });

  it("initialize restores persisted scale from localStorage", () => {
    localStorage.setItem("memoryblox-window-scale", "1.5000");
    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    expect(appShell.style.getPropertyValue("--ui-scale")).toBe("1.5");
  });

  it("initialize ignores non-numeric stored scale", () => {
    localStorage.setItem("memoryblox-window-scale", "garbage");
    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    expect(appShell.style.getPropertyValue("--ui-scale")).toBe("1");
  });

  it("initialize clamps scale to viewport-bounded maximum", () => {
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });

    localStorage.setItem("memoryblox-window-scale", "5.0000");
    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    const appliedScale = Number.parseFloat(
      appShell.style.getPropertyValue("--ui-scale"),
    );

    expect(appliedScale).toBeLessThan(1);
    expect(appliedScale).toBeGreaterThan(0);
  });

  it("initialize handles measured height below minHeightPx", () => {
    stubBounds(appWindow, 800, 200);
    controller.initialize();

    const baseWidth = Number.parseInt(
      appShell.style.getPropertyValue("--app-base-width"), 10,
    );

    expect(baseWidth).toBeGreaterThanOrEqual(DEFAULT_CONFIG.windowBaseSize.minWidthPx);
  });

  // ── Attach & event wiring ─────────────────────────────────────────

  it("attach wires pointer and resize listeners", () => {
    const handleAdd = vi.spyOn(resizeHandle, "addEventListener");
    const windowAdd = vi.spyOn(window, "addEventListener");

    controller.attach();

    const eventNames = handleAdd.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain("pointerdown");
    expect(eventNames).toContain("pointerup");
    expect(eventNames).toContain("pointercancel");
    expect(windowAdd).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  // ── Drag interaction ──────────────────────────────────────────────

  it("finishResizeDrag is a no-op before any drag starts", () => {
    controller.attach();

    expect(() => resizeHandle.dispatchEvent(pointerEvent("pointerup"))).not.toThrow();
  });

  it("beginResizeDrag ignores non-primary button", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 2,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    }));

    expect(document.body.style.userSelect).not.toBe("none");
  });

  it("beginResizeDrag is ignored when not initialized", () => {
    controller.attach();

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    }));

    expect(document.body.style.userSelect).not.toBe("none");
  });

  it("full drag cycle updates scale and persists on finish", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    resizeHandle.setPointerCapture = vi.fn();
    resizeHandle.releasePointerCapture = vi.fn();
    resizeHandle.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Begin drag
    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 42,
    }));
    expect(document.body.style.userSelect).toBe("none");

    // Move pointer (increase size)
    resizeHandle.dispatchEvent(pointerEvent("pointermove", {
      clientX: 200,
      clientY: 100,
      pointerId: 42,
    }));

    const scaleDuringDrag = Number.parseFloat(
      appShell.style.getPropertyValue("--ui-scale"),
    );
    expect(scaleDuringDrag).toBeGreaterThan(1);

    // Finish drag
    resizeHandle.dispatchEvent(pointerEvent("pointerup", { pointerId: 42 }));

    expect(document.body.style.userSelect).toBe("");
    const stored = localStorage.getItem("memoryblox-window-scale");
    expect(stored).not.toBeNull();
    expect(Number.parseFloat(stored!)).toBeGreaterThan(1);
  });

  it("updateResizeDrag ignores events from a different pointer", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    resizeHandle.setPointerCapture = vi.fn();

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    }));

    const scaleBefore = appShell.style.getPropertyValue("--ui-scale");

    resizeHandle.dispatchEvent(pointerEvent("pointermove", {
      clientX: 500,
      clientY: 500,
      pointerId: 99,
    }));

    expect(appShell.style.getPropertyValue("--ui-scale")).toBe(scaleBefore);
  });

  it("finishResizeDrag handles releasePointerCapture failure gracefully", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    resizeHandle.setPointerCapture = vi.fn();
    resizeHandle.hasPointerCapture = vi.fn().mockReturnValue(true);
    resizeHandle.releasePointerCapture = vi.fn().mockImplementation(() => {
      throw new Error("release failed");
    });

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    }));

    expect(() => resizeHandle.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 1,
    }))).not.toThrow();

    expect(document.body.style.userSelect).toBe("");
  });

  it("pointercancel finishes the drag cleanly", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    resizeHandle.setPointerCapture = vi.fn();
    resizeHandle.hasPointerCapture = vi.fn().mockReturnValue(false);

    resizeHandle.dispatchEvent(pointerEvent("pointerdown", {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    }));

    resizeHandle.dispatchEvent(pointerEvent("pointercancel", { pointerId: 1 }));

    expect(document.body.style.userSelect).toBe("");
  });

  // ── Window resize event ───────────────────────────────────────────

  it("window resize re-clamps scale to new viewport", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();
    controller.attach();

    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });

    window.dispatchEvent(new Event("resize"));

    const scaleAfterResize = Number.parseFloat(
      appShell.style.getPropertyValue("--ui-scale"),
    );
    expect(scaleAfterResize).toBeLessThan(1);
  });

  it("window resize attempts fallback init when uninitialized", () => {
    controller.attach();
    expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
  });

  // ── Reinitialize ─────────────────────────────────────────────────

  it("reinitialize clears resize state and CSS properties", () => {
    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    expect(appShell.dataset.resizeReady).toBe("true");
    expect(appShell.style.getPropertyValue("--ui-scale")).toBe("1");

    controller.reinitialize();

    expect(appShell.dataset.resizeReady).toBeUndefined();
    expect(appShell.style.getPropertyValue("--app-base-width")).toBe("");
    expect(appShell.style.getPropertyValue("--app-base-height")).toBe("");
    expect(appShell.style.getPropertyValue("--ui-scale")).toBe("");
  });

  it("reinitialize cancels pending frame when called twice rapidly", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    stubBounds(appWindow, 1024, 640);
    controller.initialize();

    controller.reinitialize();
    controller.reinitialize();

    // Second call should have cancelled the frame from the first call
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it("reinitialize picks up orientation-aware config changes", () => {
    let orientationMode: OrientationMode = "landscape";
    const getConfig = (): WindowResizeConfig => {
      return getOrientationAwareResizeConfig(orientationMode, {
        fixedWindowAspectRatio: DEFAULT_CONFIG.fixedWindowAspectRatio,
        windowBaseSize: DEFAULT_CONFIG.windowBaseSize,
        windowResizeLimits: DEFAULT_CONFIG.windowResizeLimits,
      });
    };

    const orientationAwareController = new WindowResizeController(
      appShell,
      appWindow,
      resizeHandle,
      getConfig,
    );

    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    stubBounds(appWindow, 1024, 640);
    orientationAwareController.initialize();
    const landscapeBaseHeight = Number.parseInt(
      appShell.style.getPropertyValue("--app-base-height"),
      10,
    );

    orientationMode = "portrait";
    orientationAwareController.reinitialize();

    const portraitBaseHeight = Number.parseInt(
      appShell.style.getPropertyValue("--app-base-height"),
      10,
    );

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(portraitBaseHeight).toBeGreaterThan(landscapeBaseHeight);
  });

  // ── Fallback initialization from resize ────────────────────────────

  it("window resize fallback sets state when dimensions are valid", () => {
    stubBounds(appWindow, 1024, 640);
    controller.attach();

    // resizeState is null (no prior initialize call)
    expect(appShell.dataset.resizeReady).toBeUndefined();

    window.dispatchEvent(new Event("resize"));

    // Fallback init should have set resize state
    expect(appShell.dataset.resizeReady).toBe("true");
    expect(appShell.style.getPropertyValue("--ui-scale")).not.toBe("");
  });

  it("visualViewport resize re-clamps scale when supported", () => {
    // Provide a minimal visualViewport stub
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const fakeViewport = {
      width: 1920,
      height: 1080,
      addEventListener: (event: string, fn: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(fn);
      },
    };
    Object.defineProperty(window, "visualViewport", {
      value: fakeViewport,
      configurable: true,
    });

    const ctrl = new WindowResizeController(
      appShell,
      appWindow,
      resizeHandle,
      () => DEFAULT_CONFIG,
    );

    stubBounds(appWindow, 1024, 640);
    ctrl.initialize();
    ctrl.attach();

    // Shrink the viewport and trigger visualViewport resize
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });

    for (const fn of listeners["resize"] ?? []) {
      fn();
    }

    const scaleAfter = Number.parseFloat(
      appShell.style.getPropertyValue("--ui-scale"),
    );
    expect(scaleAfter).toBeLessThan(1);

    // Cleanup
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      configurable: true,
    });
  });

  it("reinitialize preserves base dimensions when orientation is unchanged", () => {
    const orientationMode: OrientationMode = "landscape";
    const getConfig = (): WindowResizeConfig => {
      return getOrientationAwareResizeConfig(orientationMode, {
        fixedWindowAspectRatio: DEFAULT_CONFIG.fixedWindowAspectRatio,
        windowBaseSize: DEFAULT_CONFIG.windowBaseSize,
        windowResizeLimits: DEFAULT_CONFIG.windowResizeLimits,
      });
    };

    const orientationAwareController = new WindowResizeController(
      appShell,
      appWindow,
      resizeHandle,
      getConfig,
    );

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    stubBounds(appWindow, 1024, 640);
    orientationAwareController.initialize();
    const initialBaseWidth = appShell.style.getPropertyValue("--app-base-width");
    const initialBaseHeight = appShell.style.getPropertyValue("--app-base-height");

    orientationAwareController.reinitialize();

    expect(appShell.style.getPropertyValue("--app-base-width")).toBe(initialBaseWidth);
    expect(appShell.style.getPropertyValue("--app-base-height")).toBe(initialBaseHeight);
  });
});
