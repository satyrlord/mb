import { describe, expect, test } from "vitest";

import { clamp } from "../src/utils.ts";

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
