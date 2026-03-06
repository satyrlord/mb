import { clamp } from "./utils.js";
import type { WindowBaseSize, WindowResizeLimits } from "./runtime-config.js";

/** Snapshot of the measured base dimensions, aspect ratio, and current scale. */
interface WindowResizeState {
  baseWidthPx: number;
  baseHeightPx: number;
  aspectRatio: number;
  scale: number;
}

/** Tracks pointer state during a resize-handle drag gesture. */
interface WindowResizeDragState {
  pointerId: number;
  startX: number;
  startY: number;
  startWidthPx: number;
  startHeightPx: number;
}

const WINDOW_SCALE_STORAGE_KEY = "memoryblox-window-scale";

/** Injectable configuration for the resize controller. */
export interface WindowResizeConfig {
  fixedWindowAspectRatio: number;
  windowBaseSize: WindowBaseSize;
  windowResizeLimits: WindowResizeLimits;
}

/**
 * Self-contained controller for the app-window resize-handle interaction.
 *
 * Manages scale persistence, viewport-bounded clamping, and pointer drag
 * gestures on the resize handle. All DOM and config dependencies are injected
 * via the constructor so the controller has zero coupling to the rest of the
 * application bootstrap.
 */
export class WindowResizeController {
  private readonly appShellElement: HTMLElement;

  private readonly appWindowElement: HTMLElement;

  private readonly resizeHandleElement: HTMLElement;

  private readonly getConfig: () => WindowResizeConfig;

  private resizeState: WindowResizeState | null = null;

  private dragState: WindowResizeDragState | null = null;

  private pendingReinitFrame: number | null = null;

  private pendingSettleTimeout: number | null = null;

  /** Bound handler kept as a stable reference for add/removeEventListener. */
  private readonly boundUpdateDrag = (e: PointerEvent): void => {
    this.updateResizeDrag(e);
  };

  public constructor(
    appShellElement: HTMLElement,
    appWindowElement: HTMLElement,
    resizeHandleElement: HTMLElement,
    getConfig: () => WindowResizeConfig,
  ) {
    this.appShellElement = appShellElement;
    this.appWindowElement = appWindowElement;
    this.resizeHandleElement = resizeHandleElement;
    this.getConfig = getConfig;
  }

  // ── Public API ───────────────────────────────────────────────────────

  /** Wire pointer and window-resize listeners. Call once during bootstrap. */
  public attach(): void {
    this.resizeHandleElement.addEventListener("pointerdown", (e) => {
      this.beginResizeDrag(e);
    });
    this.resizeHandleElement.addEventListener("pointerup", () => {
      this.finishResizeDrag();
    });
    this.resizeHandleElement.addEventListener("pointercancel", () => {
      this.finishResizeDrag();
    });

    window.addEventListener("resize", () => {
      if (this.resizeState !== null) {
        this.applyScale(this.resizeState.scale, false);
      } else {
        this.initialize();
      }
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        if (this.resizeState !== null) {
          this.applyScale(this.resizeState.scale, false);
        }
      });
    }
  }

  /**
   * Measure the window, compute base dimensions, restore persisted scale,
   * and apply it. Should be called inside a `requestAnimationFrame` so the
   * DOM has been laid out.
   */
  public initialize(): void {
    const config = this.getConfig();
    const bounds = this.appWindowElement.getBoundingClientRect();
    const measuredWidthPx = Math.round(bounds.width);
    const measuredHeightPx = Math.round(bounds.height);

    if (measuredWidthPx <= 0 || measuredHeightPx <= 0) {
      return;
    }

    const contentSafeHeight = Math.max(measuredHeightPx, config.windowBaseSize.minHeightPx);
    const widthFromMeasuredHeight = contentSafeHeight * config.fixedWindowAspectRatio;
    const baseWidthPx = Math.round(
      Math.max(measuredWidthPx, widthFromMeasuredHeight, config.windowBaseSize.minWidthPx),
    );
    const baseHeightPx = Math.round(baseWidthPx / config.fixedWindowAspectRatio);

    this.resizeState = {
      baseWidthPx,
      baseHeightPx,
      aspectRatio: config.fixedWindowAspectRatio,
      scale: config.windowResizeLimits.defaultScale,
    };

    this.appShellElement.style.setProperty("--app-base-width", baseWidthPx.toString());
    this.appShellElement.style.setProperty("--app-base-height", baseHeightPx.toString());
    this.appShellElement.dataset.resizeReady = "true";

    const restoredScale = this.readStoredScale() ?? config.windowResizeLimits.defaultScale;
    this.applyScale(restoredScale, false);

    // Deferred re-clamp: on mobile browsers, viewport dimensions may
    // not have settled by the time the first rAF fires. A short delay
    // re-clamps the scale against the now-stable viewport.
    if (this.pendingSettleTimeout !== null) {
      window.clearTimeout(this.pendingSettleTimeout);
    }
    this.pendingSettleTimeout = window.setTimeout(() => {
      this.pendingSettleTimeout = null;
      if (this.resizeState !== null) {
        this.applyScale(this.resizeState.scale, false);
      }
    }, 200);
  }

  /**
   * Reset all resize state and re-run initialization on the next animation
   * frame. Use when the orientation (and thus the aspect ratio) changes.
   */
  public reinitialize(): void {
    if (this.pendingReinitFrame !== null) {
      window.cancelAnimationFrame(this.pendingReinitFrame);
    }
    if (this.pendingSettleTimeout !== null) {
      window.clearTimeout(this.pendingSettleTimeout);
      this.pendingSettleTimeout = null;
    }
    this.resizeState = null;
    delete this.appShellElement.dataset.resizeReady;
    this.appShellElement.style.removeProperty("--app-base-width");
    this.appShellElement.style.removeProperty("--app-base-height");
    this.appShellElement.style.removeProperty("--ui-scale");
    this.pendingReinitFrame = window.requestAnimationFrame(() => {
      this.pendingReinitFrame = null;
      this.initialize();
    });
  }

  // ── Scale persistence ────────────────────────────────────────────────

  private readStoredScale(): number | null {
    const value = window.localStorage.getItem(WINDOW_SCALE_STORAGE_KEY);

    if (value === null) {
      return null;
    }

    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private writeStoredScale(scale: number): void {
    window.localStorage.setItem(WINDOW_SCALE_STORAGE_KEY, scale.toFixed(4));
  }

  // ── Scale clamping ───────────────────────────────────────────────────

  private getViewportBoundedMaxScale(state: WindowResizeState): number {
    const config = this.getConfig();
    const padding = config.windowResizeLimits.viewportPaddingPx * 2;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;

    const widthBound = availableWidth / state.baseWidthPx;
    const heightBound = availableHeight / state.baseHeightPx;

    return Math.min(config.windowResizeLimits.maxScale, widthBound, heightBound);
  }

  private clampScale(state: WindowResizeState, scale: number): number {
    const config = this.getConfig();
    const maxScale = this.getViewportBoundedMaxScale(state);
    const minScale = Math.min(config.windowResizeLimits.minScale, maxScale);

    return clamp(scale, minScale, maxScale);
  }

  private applyScale(nextScale: number, persist: boolean): void {
    if (this.resizeState === null) {
      return;
    }

    const boundedScale = this.clampScale(this.resizeState, nextScale);
    this.resizeState.scale = boundedScale;

    this.appShellElement.style.setProperty("--ui-scale", boundedScale.toString());

    if (persist) {
      this.writeStoredScale(boundedScale);
    }
  }

  // ── Drag gesture handling ────────────────────────────────────────────

  private beginResizeDrag(event: PointerEvent): void {
    if (event.button !== 0 || this.resizeState === null) {
      return;
    }

    event.preventDefault();

    this.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidthPx: this.resizeState.baseWidthPx * this.resizeState.scale,
      startHeightPx: this.resizeState.baseHeightPx * this.resizeState.scale,
    };

    this.resizeHandleElement.addEventListener("pointermove", this.boundUpdateDrag);
    this.resizeHandleElement.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
  }

  private finishResizeDrag(): void {
    if (this.dragState === null || this.resizeState === null) {
      return;
    }

    try {
      if (this.resizeHandleElement.hasPointerCapture(this.dragState.pointerId)) {
        this.resizeHandleElement.releasePointerCapture(this.dragState.pointerId);
      }
    } catch {
      // Release failures are non-fatal here; cleanup still runs in finally.
    } finally {
      this.resizeHandleElement.removeEventListener("pointermove", this.boundUpdateDrag);
      this.dragState = null;
      document.body.style.userSelect = "";
      this.writeStoredScale(this.resizeState.scale);
    }
  }

  private updateResizeDrag(event: PointerEvent): void {
    if (this.dragState === null || this.resizeState === null) {
      return;
    }

    if (event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const widthScale = Math.max(1, this.dragState.startWidthPx + deltaX)
      / this.resizeState.baseWidthPx;
    const equivalentWidthFromHeight =
      Math.max(1, this.dragState.startHeightPx + deltaY)
      * this.resizeState.aspectRatio;
    const heightScale = equivalentWidthFromHeight / this.resizeState.baseWidthPx;

    const nextScale = (widthScale + heightScale) / 2;
    this.applyScale(nextScale, false);
  }
}
