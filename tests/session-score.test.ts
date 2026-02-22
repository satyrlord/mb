import { describe, expect, test } from "vitest";

import { normalizeScoreFlagsForPlayerSelection } from "../src/session-score.ts";

describe("normalizeScoreFlagsForPlayerSelection", () => {
  test("converts auto-demo takeover back to standard scoring for regular games", () => {
    const normalized = normalizeScoreFlagsForPlayerSelection({
      mode: "game",
      scoreCategory: "debug",
      isAutoDemoScore: true,
    });

    expect(normalized).toEqual({
      mode: "game",
      scoreCategory: "standard",
      isAutoDemoScore: false,
    });
  });

  test("keeps debug-tiles score category while clearing auto-demo flag", () => {
    const normalized = normalizeScoreFlagsForPlayerSelection({
      mode: "debug-tiles",
      scoreCategory: "debug",
      isAutoDemoScore: true,
    });

    expect(normalized).toEqual({
      mode: "debug-tiles",
      scoreCategory: "debug",
      isAutoDemoScore: false,
    });
  });

  test("returns unchanged flags when auto-demo scoring is already off", () => {
    const input = {
      mode: "game" as const,
      scoreCategory: "standard" as const,
      isAutoDemoScore: false,
    };

    const normalized = normalizeScoreFlagsForPlayerSelection(input);

    expect(normalized).toEqual(input);
  });
});
