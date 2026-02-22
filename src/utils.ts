export type RandomSource = () => number;

export const shuffle = <T>(items: T[], random: RandomSource = Math.random): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const temp = result[index];
    result[index] = result[randomIndex];
    result[randomIndex] = temp;
  }

  return result;
};

/**
 * Format an elapsed time in milliseconds as a zero-padded `"MM:SS"` string.
 *
 * Negative durations are clamped to zero so the formatted value never
 * represents a negative elapsed time. This avoids confusing outputs such
 * as negative seconds when timers briefly go backwards due to clock skew
 * or scheduling delays.
 *
 * A warning is logged once per page load if negative elapsed time is detected,
 * to help identify timing anomalies. The warning flag persists across all
 * formatElapsedTime calls for the duration of the session.
 *
 * @param elapsedMs Elapsed time, in milliseconds. Any negative input is treated as `0`.
 * @returns The formatted elapsed time string in `"MM:SS"` form.
 */
// Module-level flag to rate-limit negative elapsed time warnings (once per page load).
let negativeElapsedTimeWarningShown = false;

export const formatElapsedTime = (elapsedMs: number): string => {
  // Clamp to zero to prevent negative display in case of clock skew or scheduling anomalies.
  // Log warning once per page load if negative elapsed times are detected.
  if (elapsedMs < 0 && !negativeElapsedTimeWarningShown) {
    console.warn(`[MEMORYBLOX] Negative elapsed time detected: ${elapsedMs}ms. Clamping to zero. (This warning appears once per page load.)`);
    negativeElapsedTimeWarningShown = true;
  }
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

/**
 * Clamp a numeric value to the inclusive range between the given minimum and maximum.
 *
 * @param value The value to clamp.
 * @param min The lower bound of the allowed range (inclusive).
 * @param max The upper bound of the allowed range (inclusive).
 * @returns The value constrained to the range `[min, max]`.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * Enables mouse-wheel scrolling on an `<input type="range">` slider.
 *
 * Scrolling up increases the slider value by its `step`; scrolling down
 * decreases it. Either `deltaY` or `deltaX` is used — whichever is non-zero
 * first — so the listener works with both vertical and horizontal wheels.
 * A synthetic `input` event is dispatched whenever the value actually changes
 * so that existing `input` listeners react normally.
 */
export const enableSliderWheelScroll = (slider: HTMLInputElement): void => {
  slider.addEventListener("wheel", (event) => {
    const delta = event.deltaY || event.deltaX;

    if (delta === 0) {
      return;
    }

    const step = Number.parseFloat(slider.step) || 1;
    const min = Number.parseFloat(slider.min);
    const max = Number.parseFloat(slider.max);
    const current = Number.parseFloat(slider.value);
    const next = delta < 0 ? current + step : current - step;
    const clamped = Math.max(min, Math.min(max, next));

    if (clamped !== current) {
      slider.value = clamped.toString();
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }

    event.preventDefault();
  }, { passive: false });
};

/**
 * Enables horizontal mouse-wheel scrolling on any overflowing element.
 *
 * When the element's content is wider than its visible area, the dominant
 * scroll delta (whichever axis has the larger absolute magnitude) is added
 * to `scrollLeft`. The event is only consumed (via `preventDefault`) when
 * the element is actually scrollable.
 */
export const enableHorizontalWheelScroll = (element: HTMLElement): void => {
  element.addEventListener("wheel", (event) => {
    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;

    if (dominantDelta === 0) {
      return;
    }

    element.scrollLeft += dominantDelta;
    event.preventDefault();
  }, { passive: false });
};
