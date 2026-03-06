import type { DifficultyConfig } from "./difficulty.js";
import type { BoardLayoutConfig } from "./board.js";
import type { WindowBaseSize, WindowResizeLimits } from "./runtime-config.js";

export type OrientationMode = "landscape" | "portrait";

const STORAGE_KEY = "memoryblox-orientation-mode";

export const readStoredOrientationMode = (
  deviceType: "mobile" | "desktop" = "desktop",
): OrientationMode => {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "portrait" || stored === "landscape") {
    return stored;
  }

  return deviceType === "mobile" ? "portrait" : "landscape";
};

export const writeOrientationMode = (mode: OrientationMode): void => {
  window.localStorage.setItem(STORAGE_KEY, mode);
};

export const getEffectiveDifficulty = (
  difficulty: DifficultyConfig,
  mode: OrientationMode,
): DifficultyConfig => {
  if (mode === "portrait") {
    return { ...difficulty, rows: difficulty.columns, columns: difficulty.rows };
  }
  return difficulty;
};

export interface OrientationToggleElements {
  button: HTMLButtonElement;
  landscapeIcon: SVGElement;
  portraitIcon: SVGElement;
}

const setElementHidden = (element: Element, hidden: boolean): void => {
  if (hidden) {
    element.setAttribute("hidden", "");
    return;
  }

  element.removeAttribute("hidden");
};

export const updateOrientationToggleButton = (
  elements: OrientationToggleElements,
  mode: OrientationMode,
): void => {
  const isPortrait = mode === "portrait";
  const label = isPortrait ? "Switch to landscape mode" : "Switch to portrait mode";
  elements.button.setAttribute("aria-label", label);
  elements.button.setAttribute("title", label);
  setElementHidden(elements.landscapeIcon, !isPortrait);
  setElementHidden(elements.portraitIcon, isPortrait);
};

export interface OrientationBoardLayoutTarget {
  setLayoutConfig: (config: BoardLayoutConfig) => void;
}

export const applyOrientationBoardLayout = (
  appShell: HTMLElement,
  boardViews: readonly OrientationBoardLayoutTarget[],
  boardLayout: BoardLayoutConfig,
  mode: OrientationMode,
): void => {
  appShell.dataset.orientation = mode;
  for (const view of boardViews) {
    view.setLayoutConfig(boardLayout);
  }
};

export interface OrientationResizeInput {
  fixedWindowAspectRatio: number;
  windowBaseSize: WindowBaseSize;
  windowResizeLimits: WindowResizeLimits;
}

export const getOrientationAwareResizeConfig = (
  mode: OrientationMode,
  input: OrientationResizeInput,
): OrientationResizeInput => {
  const isPortrait = mode === "portrait";
  return {
    fixedWindowAspectRatio: isPortrait ? 1 / input.fixedWindowAspectRatio : input.fixedWindowAspectRatio,
    windowBaseSize: isPortrait
      ? {
        minWidthPx: input.windowBaseSize.minHeightPx,
        minHeightPx: input.windowBaseSize.minWidthPx,
      }
      : input.windowBaseSize,
    windowResizeLimits: input.windowResizeLimits,
  };
};

/** Visible-for-testing internals. */
export const orientationControllerTesting = {
  STORAGE_KEY,
};
