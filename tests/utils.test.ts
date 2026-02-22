// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";

import {
  clamp,
  enableHorizontalWheelScroll,
  enableSliderWheelScroll,
  formatElapsedTime,
  shuffle,
} from "../src/utils.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSlider = (min: number, max: number, step: number, value: number): HTMLInputElement => {
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = min.toString();
  slider.max = max.toString();
  slider.step = step.toString();
  slider.value = value.toString();
  return slider;
};

const fireWheel = (
  target: EventTarget,
  deltaY: number,
  deltaX = 0,
): WheelEvent => {
  const event = new WheelEvent("wheel", {
    deltaY,
    deltaX,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

describe("clamp", () => {
  test("returns min when value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  test("returns max when value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test("returns original value when already in range", () => {
    expect(clamp(6, 0, 10)).toBe(6);
  });

  test("returns min when min equals max", () => {
    expect(clamp(99, 4, 4)).toBe(4);
    expect(clamp(-3, 4, 4)).toBe(4);
  });

  test("returns NaN when value is NaN", () => {
    expect(clamp(NaN, 0, 10)).toBeNaN();
  });

  test("clamps Infinity to max", () => {
    expect(clamp(Infinity, 0, 10)).toBe(10);
  });

  test("clamps -Infinity to min", () => {
    expect(clamp(-Infinity, 0, 10)).toBe(0);
  });
});

describe("formatElapsedTime", () => {
  test("formats zero as 00:00", () => {
    expect(formatElapsedTime(0)).toBe("00:00");
  });

  test("formats seconds and minutes with padding", () => {
    expect(formatElapsedTime(61_000)).toBe("01:01");
    expect(formatElapsedTime(59_999)).toBe("00:59");
  });
});

describe("shuffle", () => {
  test("returns a new array without mutating input", () => {
    const input = [1, 2, 3, 4];
    const result = shuffle(input, () => 0);

    expect(input).toEqual([1, 2, 3, 4]);
    expect(result).toEqual([2, 3, 4, 1]);
  });

  test("preserves all elements", () => {
    const input = ["a", "b", "c", "d"];
    const result = shuffle(input, () => 0.42);

    expect(result.sort()).toEqual(["a", "b", "c", "d"]);
  });
});

// ---------------------------------------------------------------------------
// enableSliderWheelScroll
// ---------------------------------------------------------------------------

describe("enableSliderWheelScroll", () => {
  test("wheel up (deltaY < 0) increments value by step", () => {
    const slider = makeSlider(1, 3, 1, 1);
    enableSliderWheelScroll(slider);

    fireWheel(slider, -100);

    expect(slider.value).toBe("2");
  });

  test("wheel down (deltaY > 0) decrements value by step", () => {
    const slider = makeSlider(1, 3, 1, 3);
    enableSliderWheelScroll(slider);

    fireWheel(slider, 100);

    expect(slider.value).toBe("2");
  });

  test("clamps at max — does not exceed upper bound", () => {
    const slider = makeSlider(1, 3, 1, 3);
    enableSliderWheelScroll(slider);

    fireWheel(slider, -100);

    expect(slider.value).toBe("3");
  });

  test("clamps at min — does not go below lower bound", () => {
    const slider = makeSlider(1, 3, 1, 1);
    enableSliderWheelScroll(slider);

    fireWheel(slider, 100);

    expect(slider.value).toBe("1");
  });

  test("deltaX is used when deltaY is zero", () => {
    const slider = makeSlider(1, 3, 1, 2);
    enableSliderWheelScroll(slider);

    fireWheel(slider, 0, -100);

    expect(slider.value).toBe("3");
  });

  test("fires synthetic input event on value change", () => {
    const slider = makeSlider(1, 3, 1, 1);
    enableSliderWheelScroll(slider);

    const inputHandler = vi.fn();
    slider.addEventListener("input", inputHandler);

    fireWheel(slider, -100);

    expect(inputHandler).toHaveBeenCalledOnce();
  });

  test("does not fire input event when value is already at boundary", () => {
    const slider = makeSlider(1, 3, 1, 3);
    enableSliderWheelScroll(slider);

    const inputHandler = vi.fn();
    slider.addEventListener("input", inputHandler);

    fireWheel(slider, -100); // at max, wheel up → no change

    expect(inputHandler).not.toHaveBeenCalled();
  });

  test("calls preventDefault on wheel event", () => {
    const slider = makeSlider(1, 3, 1, 2);
    enableSliderWheelScroll(slider);

    const event = fireWheel(slider, -100);

    expect(event.defaultPrevented).toBe(true);
  });

  test("calls preventDefault even when at boundary (no value change)", () => {
    const slider = makeSlider(1, 3, 1, 3);
    enableSliderWheelScroll(slider);

    const event = fireWheel(slider, -100); // at max, no change

    expect(event.defaultPrevented).toBe(true);
  });

  test("does not preventDefault when delta is zero", () => {
    const slider = makeSlider(1, 3, 1, 2);
    enableSliderWheelScroll(slider);

    const event = fireWheel(slider, 0, 0);

    expect(event.defaultPrevented).toBe(false);
  });

  test("respects fractional step", () => {
    const slider = makeSlider(1, 3, 0.5, 1);
    enableSliderWheelScroll(slider);

    fireWheel(slider, -100);

    expect(slider.value).toBe("1.5");
  });

  test("defaults to step=1 when slider step attribute is invalid", () => {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    slider.value = "5";
    // leave step unset (defaults to empty string → NaN → fallback 1)
    enableSliderWheelScroll(slider);

    fireWheel(slider, -100);

    expect(slider.value).toBe("6");
  });

  test("multiple wheel events increment/decrement correctly across range", () => {
    const slider = makeSlider(1, 3, 1, 1);
    enableSliderWheelScroll(slider);

    fireWheel(slider, -100); // 1 → 2
    fireWheel(slider, -100); // 2 → 3
    fireWheel(slider, -100); // 3 → 3 (clamped)
    fireWheel(slider, 100);  // 3 → 2

    expect(slider.value).toBe("2");
  });
});

// ---------------------------------------------------------------------------
// enableHorizontalWheelScroll
// ---------------------------------------------------------------------------

describe("enableHorizontalWheelScroll", () => {
  const makeOverflowDiv = (scrollWidthPx: number, clientWidthPx: number): HTMLElement => {
    const el = document.createElement("div");

    Object.defineProperty(el, "scrollWidth", { get: () => scrollWidthPx, configurable: true });
    Object.defineProperty(el, "clientWidth", { get: () => clientWidthPx, configurable: true });

    return el;
  };

  test("advances scrollLeft by deltaY when content overflows horizontally", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    fireWheel(el, 50);

    expect(el.scrollLeft).toBe(50);
  });

  test("advances scrollLeft by deltaX when deltaX is the dominant axis", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    fireWheel(el, 10, 80); // |80| > |10|, so deltaX dominates

    expect(el.scrollLeft).toBe(80);
  });

  test("uses deltaY when it is the dominant axis", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    fireWheel(el, 90, 30); // |90| >= |30|, so deltaY dominates

    expect(el.scrollLeft).toBe(90);
  });

  test("does not change scrollLeft when content fits (no overflow)", () => {
    const el = makeOverflowDiv(200, 200); // scrollWidth === clientWidth
    enableHorizontalWheelScroll(el);

    fireWheel(el, 50);

    expect(el.scrollLeft).toBe(0);
  });

  test("does not preventDefault when content fits", () => {
    const el = makeOverflowDiv(100, 200); // no overflow
    enableHorizontalWheelScroll(el);

    const event = fireWheel(el, 50);

    expect(event.defaultPrevented).toBe(false);
  });

  test("calls preventDefault when scroll is applied", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    const event = fireWheel(el, 50);

    expect(event.defaultPrevented).toBe(true);
  });

  test("does not change scrollLeft when both deltas are zero", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    fireWheel(el, 0, 0);

    expect(el.scrollLeft).toBe(0);
  });

  test("does not preventDefault when both deltas are zero", () => {
    const el = makeOverflowDiv(400, 200);
    enableHorizontalWheelScroll(el);

    const event = fireWheel(el, 0, 0);

    expect(event.defaultPrevented).toBe(false);
  });

  test("accumulates scrollLeft across multiple wheel events", () => {
    const el = makeOverflowDiv(600, 200);
    enableHorizontalWheelScroll(el);

    fireWheel(el, 30);
    fireWheel(el, 20);

    expect(el.scrollLeft).toBe(50);
  });
});
