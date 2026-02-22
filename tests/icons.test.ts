import { describe, expect, test } from "vitest";

import {
  DEFAULT_EMOJI_PACK_ID,
  EMOJI_PACKS,
  MIN_ICONS_PER_PACK,
  generateEmojiDeck,
  getEmojiPacks,
  validateMinPackIconCount,
  validateUniquePackIcons,
} from "../src/icons.ts";
import type { EmojiPackId } from "../src/icons.ts";

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

describe("generateEmojiDeck", () => {
  test("returns a shuffled deck of the correct length for uniform copies", () => {
    const deck = generateEmojiDeck(5);
    expect(deck).toHaveLength(10); // 5 icons × 2 copies each
  });

  test("returns an empty array when uniqueIconCount is 0", () => {
    expect(generateEmojiDeck(0)).toEqual([]);
  });

  test("uses an explicit pack id to source icons", () => {
    const deck = generateEmojiDeck(3, "food-drinks");
    expect(deck).toHaveLength(6);
  });

  test("respects a per-icon copies array for mixed-set decks", () => {
    // 2 + 3 + 2 = 7 tiles
    const deck = generateEmojiDeck(3, DEFAULT_EMOJI_PACK_ID, [2, 3, 2]);
    expect(deck).toHaveLength(7);
  });

  test("each icon appears the requested number of times", () => {
    const deck = generateEmojiDeck(4, DEFAULT_EMOJI_PACK_ID, 3);
    expect(deck).toHaveLength(12); // 4 icons × 3 copies each
    // Every icon in the deck should appear exactly 3 times
    const counts = new Map<string, number>();
    for (const icon of deck) {
      counts.set(icon, (counts.get(icon) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBe(3);
    }
  });

  test("throws when copiesPerIcon array length does not match uniqueIconCount", () => {
    expect(() => generateEmojiDeck(5, DEFAULT_EMOJI_PACK_ID, [2, 2])).toThrow(
      /Expected 5 copy counts but received 2/,
    );
  });

  test("throws when uniqueIconCount exceeds the number of available icons in the pack", () => {
    const maxIcons = EMOJI_PACKS.find((p) => p.id === DEFAULT_EMOJI_PACK_ID)!.icons.length;
    expect(() => generateEmojiDeck(maxIcons + 1)).toThrow(
      /Not enough unique icons/,
    );
  });

  test("falls back to the default pack when an unrecognised pack id is provided", () => {
    // Cast to bypass TypeScript; simulates a runtime value that slips past the type
    const deck = generateEmojiDeck(4, "nonexistent-pack" as EmojiPackId);
    // Should silently fall back to DEFAULT_EMOJI_PACK_ID and return a valid deck
    expect(deck).toHaveLength(8);
  });
});
