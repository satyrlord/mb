// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  readStoredOrientationMode,
  writeOrientationMode,
  getEffectiveDifficulty,
  updateOrientationToggleButton,
  applyOrientationBoardLayout,
  getOrientationAwareResizeConfig,
  orientationControllerTesting,
  type OrientationToggleElements,
  type OrientationResizeInput,
} from "../src/orientation-controller.js";

const { STORAGE_KEY } = orientationControllerTesting;

const createMockDifficulty = (rows: number, columns: number) => ({
  id: "test",
  label: "Test",
  rows,
  columns,
  scoreMultiplier: 1,
});

const createSvgIcon = (): SVGSVGElement => {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
};

const createToggleElements = (): OrientationToggleElements => ({
  button: document.createElement("button"),
  landscapeIcon: createSvgIcon(),
  portraitIcon: createSvgIcon(),
});

describe("orientation-controller", () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe("readStoredOrientationMode", () => {
    it("returns 'landscape' when nothing is stored", () => {
      expect(readStoredOrientationMode()).toBe("landscape");
    });

    it("returns 'landscape' for unknown stored value", () => {
      localStorage.setItem(STORAGE_KEY, "diagonal");
      expect(readStoredOrientationMode()).toBe("landscape");
    });

    it("returns 'portrait' when stored", () => {
      localStorage.setItem(STORAGE_KEY, "portrait");
      expect(readStoredOrientationMode()).toBe("portrait");
    });

    it("returns 'landscape' when stored", () => {
      localStorage.setItem(STORAGE_KEY, "landscape");
      expect(readStoredOrientationMode()).toBe("landscape");
    });

    it("returns 'portrait' default for mobile when nothing is stored", () => {
      expect(readStoredOrientationMode("mobile")).toBe("portrait");
    });

    it("returns 'landscape' default for desktop when nothing is stored", () => {
      expect(readStoredOrientationMode("desktop")).toBe("landscape");
    });

    it("preserves legacy behavior when deviceType is omitted", () => {
      expect(readStoredOrientationMode(undefined)).toBe("landscape");
    });

    it("returns stored value over device-aware default", () => {
      localStorage.setItem(STORAGE_KEY, "landscape");
      expect(readStoredOrientationMode("mobile")).toBe("landscape");
    });
  });

  describe("writeOrientationMode", () => {
    it("persists the mode to localStorage", () => {
      writeOrientationMode("portrait");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("portrait");
    });

    it("overwrites a previous value", () => {
      writeOrientationMode("portrait");
      writeOrientationMode("landscape");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("landscape");
    });
  });

  describe("getEffectiveDifficulty", () => {
    it("returns unchanged difficulty in landscape mode", () => {
      const diff = createMockDifficulty(5, 6);
      const result = getEffectiveDifficulty(diff, "landscape");
      expect(result.rows).toBe(5);
      expect(result.columns).toBe(6);
    });

    it("swaps rows and columns in portrait mode", () => {
      const diff = createMockDifficulty(5, 6);
      const result = getEffectiveDifficulty(diff, "portrait");
      expect(result.rows).toBe(6);
      expect(result.columns).toBe(5);
    });

    it("does not mutate the original object", () => {
      const diff = createMockDifficulty(5, 6);
      getEffectiveDifficulty(diff, "portrait");
      expect(diff.rows).toBe(5);
      expect(diff.columns).toBe(6);
    });

    it("preserves other difficulty properties", () => {
      const diff = createMockDifficulty(5, 6);
      const result = getEffectiveDifficulty(diff, "portrait");
      expect(result.id).toBe("test");
      expect(result.label).toBe("Test");
      expect(result.scoreMultiplier).toBe(1);
    });

    it("requires explicit orientation mode argument", () => {
      const diff = createMockDifficulty(5, 6);
      const landscape = getEffectiveDifficulty(diff, "landscape");
      expect(landscape.rows).toBe(diff.rows);
      expect(landscape.columns).toBe(diff.columns);

      const portrait = getEffectiveDifficulty(diff, "portrait");
      expect(portrait.rows).toBe(diff.columns);
      expect(portrait.columns).toBe(diff.rows);
    });
  });

  describe("updateOrientationToggleButton", () => {
    it("sets landscape state correctly", () => {
      const elements = createToggleElements();
      updateOrientationToggleButton(elements, "landscape");

      expect(elements.button.getAttribute("aria-label")).toBe("Switch to portrait mode");
      expect(elements.button.getAttribute("title")).toBe("Switch to portrait mode");
      expect(elements.landscapeIcon.hasAttribute("hidden")).toBe(true);
      expect(elements.portraitIcon.hasAttribute("hidden")).toBe(false);
    });

    it("sets portrait state correctly", () => {
      const elements = createToggleElements();
      updateOrientationToggleButton(elements, "portrait");

      expect(elements.button.getAttribute("aria-label")).toBe("Switch to landscape mode");
      expect(elements.button.getAttribute("title")).toBe("Switch to landscape mode");
      expect(elements.landscapeIcon.hasAttribute("hidden")).toBe(false);
      expect(elements.portraitIcon.hasAttribute("hidden")).toBe(true);
    });

    it("replaces the initial hidden state on inline svg icons", () => {
      const elements = createToggleElements();
      elements.portraitIcon.setAttribute("hidden", "");

      updateOrientationToggleButton(elements, "portrait");

      expect(elements.landscapeIcon.hasAttribute("hidden")).toBe(false);
      expect(elements.portraitIcon.hasAttribute("hidden")).toBe(true);
    });
  });

  describe("applyOrientationBoardLayout", () => {
    it("sets the data-orientation attribute", () => {
      const appShell = document.createElement("div");
      const boardView = { setLayoutConfig: vi.fn() };
      const layout = {
        minTileSizePx: 10,
        targetTileSizePx: 40,
        tileGapPx: 4,
        boardHorizontalPaddingPx: 8,
        boardChromePx: 16,
        boardMarginTopPx: 0,
      };

      applyOrientationBoardLayout(appShell, [boardView], layout, "portrait");

      expect(appShell.dataset.orientation).toBe("portrait");
      expect(boardView.setLayoutConfig).toHaveBeenCalledWith(layout);
    });

    it("applies layout to multiple board views", () => {
      const appShell = document.createElement("div");
      const boardView1 = { setLayoutConfig: vi.fn() };
      const boardView2 = { setLayoutConfig: vi.fn() };
      const layout = {
        minTileSizePx: 10,
        targetTileSizePx: 40,
        tileGapPx: 4,
        boardHorizontalPaddingPx: 8,
        boardChromePx: 16,
        boardMarginTopPx: 0,
      };

      applyOrientationBoardLayout(appShell, [boardView1, boardView2], layout, "landscape");

      expect(boardView1.setLayoutConfig).toHaveBeenCalledWith(layout);
      expect(boardView2.setLayoutConfig).toHaveBeenCalledWith(layout);
    });
  });

  describe("getOrientationAwareResizeConfig", () => {
    const baseInput: OrientationResizeInput = {
      fixedWindowAspectRatio: 1.6,
      windowBaseSize: { minWidthPx: 800, minHeightPx: 500 },
      windowResizeLimits: { defaultScale: 1, minScale: 0.5, maxScale: 2, viewportPaddingPx: 20 },
    };

    it("returns input unchanged in landscape mode", () => {
      const result = getOrientationAwareResizeConfig("landscape", baseInput);
      expect(result.fixedWindowAspectRatio).toBe(1.6);
      expect(result.windowBaseSize).toEqual({ minWidthPx: 800, minHeightPx: 500 });
      expect(result.windowResizeLimits).toBe(baseInput.windowResizeLimits);
    });

    it("inverts aspect ratio in portrait mode", () => {
      const result = getOrientationAwareResizeConfig("portrait", baseInput);
      expect(result.fixedWindowAspectRatio).toBeCloseTo(1 / 1.6);
    });

    it("swaps width and height in portrait mode", () => {
      const result = getOrientationAwareResizeConfig("portrait", baseInput);
      expect(result.windowBaseSize).toEqual({ minWidthPx: 500, minHeightPx: 800 });
    });

    it("passes through resize limits unchanged in portrait mode", () => {
      const result = getOrientationAwareResizeConfig("portrait", baseInput);
      expect(result.windowResizeLimits).toBe(baseInput.windowResizeLimits);
    });
  });
});
