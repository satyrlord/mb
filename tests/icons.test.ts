import { describe, expect, test } from "vitest";

import {
  EMOJI_PACKS,
  MIN_ICONS_PER_PACK,
  getEmojiPacks,
  validateMinPackIconCount,
  validateUniquePackIcons,
} from "../src/icons.ts";

describe("icons", () => {
  test("does not throw for an empty pack array", () => {
    expect(() => validateUniquePackIcons([])).not.toThrow();
  });

  test("does not throw for a pack with zero icons", () => {
    expect(() => validateUniquePackIcons([{ id: "empty-pack", icons: [] }])).not.toThrow();
  });

  test("throws when a pack contains duplicate icons", () => {
    const duplicatePacks = [
      {
        id: "test-pack",
        icons: ["😀", "🎯", "😀"],
      },
    ];

    expect(() => validateUniquePackIcons(duplicatePacks)).toThrow(/Duplicate icon found in/);
  });

  test("does not throw when all provided packs are unique", () => {
    const uniquePacks = [
      {
        id: "alpha",
        icons: ["😀", "🎯", "🚀"],
      },
      {
        id: "beta",
        icons: ["🌍", "🎵", "🧪"],
      },
    ];

    expect(() => validateUniquePackIcons(uniquePacks)).not.toThrow();
  });

  test("validates that each pack contains unique icons", () => {
    expect(() => validateUniquePackIcons()).not.toThrow();
  });

  test("validates that each pack has at least the minimum icon count", () => {
    expect(() => validateMinPackIconCount()).not.toThrow();
  });

  test("throws when a pack has fewer icons than the minimum required", () => {
    const underfilledPack = [
      {
        id: "underfilled-pack",
        // Provide one fewer icon than the threshold to guarantee the validation fires
        // regardless of future changes to MIN_ICONS_PER_PACK.
        icons: Array.from({ length: MIN_ICONS_PER_PACK - 1 }, (_, i) => String.fromCodePoint(0x1F600 + i)),
      },
    ];

    expect(() => validateMinPackIconCount(underfilledPack)).toThrow(
      /minimum required is/,
    );
  });

  test("error message includes the pack id and actual icon count", () => {
    const underfilledPack = [
      {
        id: "tiny-pack",
        icons: Array.from({ length: MIN_ICONS_PER_PACK - 3 }, (_, i) => String.fromCodePoint(0x1F600 + i)),
      },
    ];

    expect(() => validateMinPackIconCount(underfilledPack)).toThrow(
      new RegExp(
        `Emoji pack 'tiny-pack' has ${MIN_ICONS_PER_PACK - 3} icons; minimum required is ${MIN_ICONS_PER_PACK}`,
      ),
    );
  });

  test("throws for the first underfilled pack when multiple packs are underfilled", () => {
    const multiUnderfilled = [
      { id: "first-small", icons: ["😀"] },
      { id: "second-small", icons: ["🎯", "🚀"] },
    ];

    // The validation loop throws on the first offending pack;
    // only that pack's error message is surfaced.
    expect(() => validateMinPackIconCount(multiUnderfilled)).toThrow(
      /Emoji pack 'first-small'/,
    );
  });

  test("keeps an even number of emoji packs for two-column settings layout", () => {
    expect(EMOJI_PACKS.length % 2).toBe(0);
  });

  test("exposes a matching pack count from list API", () => {
    expect(getEmojiPacks()).toHaveLength(EMOJI_PACKS.length);
  });

  test("documents minimum icon count policy", () => {
    expect(MIN_ICONS_PER_PACK).toBe(25);
  });
});
