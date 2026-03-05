// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";

import {
  createBoardTileButton,
  createDeterministicWinFxRandomSequence,
  createMockDomRect,
  createMockTextResponse,
  createRandomSequenceMock,
} from "./test-helpers.ts";

describe("test-helpers", () => {
  test("createMockTextResponse returns ok response with provided text", async () => {
    const response = createMockTextResponse("hello");
    await expect(response.text()).resolves.toBe("hello");
    expect(response.ok).toBe(true);
  });

  test("createMockDomRect computes right and bottom", () => {
    const rect = createMockDomRect(10, 20, 30, 40);

    expect(rect.left).toBe(10);
    expect(rect.top).toBe(20);
    expect(rect.right).toBe(40);
    expect(rect.bottom).toBe(60);
    expect(rect.toJSON()).toEqual({});
  });

  test("createBoardTileButton builds expected tile structure", () => {
    const rect = createMockDomRect(5, 6, 70, 80);
    const button = createBoardTileButton("🧠", rect);

    expect(button.className).toContain("tile");
    expect(button.querySelector(".tile-front")?.textContent).toBe("?");
    expect(button.querySelector(".tile-back")?.textContent).toBe("🧠");
    expect(button.getBoundingClientRect().width).toBe(70);
  });

  test("createDeterministicWinFxRandomSequence returns non-empty varied values", () => {
    const sequence = createDeterministicWinFxRandomSequence();

    expect(sequence.length).toBeGreaterThan(0);
    expect(new Set(sequence).size).toBeGreaterThan(1);
  });

  test("createRandomSequenceMock falls back to 0.5 for empty sequence", () => {
    const randomSpy = createRandomSequenceMock([]);

    expect(Math.random()).toBe(0.5);
    expect(Math.random()).toBe(0.5);

    randomSpy.mockRestore();
  });

  test("createRandomSequenceMock cycles through provided sequence", () => {
    const randomSpy = createRandomSequenceMock([0.1, 0.9]);

    expect(Math.random()).toBe(0.1);
    expect(Math.random()).toBe(0.9);
    expect(Math.random()).toBe(0.1);

    randomSpy.mockRestore();
  });

  test("manual random spy restore helper is compatible with vitest restore", () => {
    const randomSpy = createRandomSequenceMock([0.2]);
    expect(Math.random()).toBe(0.2);
    randomSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
