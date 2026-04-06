import { afterEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_EMOJI_PACK_ID,
  EMOJI_PACKS,
  getActiveOpenmojiIconTokens,
  MIN_ASSET_ICON_RATIO,
  MIN_ICONS_PER_PACK,
  OPENMOJI_IMPORTED_ICON_TOKENS,
  generateEmojiDeck,
  getEmojiPacks,
  getInactiveImportedOpenmojiIconTokens,
  validateMinPackIconCount,
  validateUniquePackIcons,
} from "../src/icons.ts";
import { ICON_ASSET_DEFINITIONS } from "../src/icon-assets.ts";
import type { EmojiPackId } from "../src/icons.ts";

const OPENMOJI_SECOND_BATCH_ICONS = [
  "asset:openmoji:1F6DD",
  "asset:openmoji:1F6DE",
  "asset:openmoji:1F6DF",
  "asset:openmoji:1F9ED",
  "asset:openmoji:1F9EF",
  "asset:openmoji:1F9F1",
  "asset:openmoji:1FA83",
  "asset:openmoji:1FA99",
  "asset:openmoji:1FA9C",
  "asset:openmoji:1FA9D",
  "asset:openmoji:1FAA0",
  "asset:openmoji:1FAAA",
] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

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

  test("throws when an icon is duplicated across packs", () => {
    const overlappingPacks = [
      {
        id: "alpha",
        icons: ["😀", "🎯", "🚀"],
      },
      {
        id: "beta",
        icons: ["🌍", "🎵", "🚀"],
      },
    ];

    expect(() => validateUniquePackIcons(overlappingPacks)).toThrow(/across packs/);
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
        `Icon pack 'tiny-pack' has ${MIN_ICONS_PER_PACK - 3} icons; minimum required is ${MIN_ICONS_PER_PACK}`,
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
      /Icon pack 'first-small'/,
    );
  });

  test("keeps an even number of icon packs for two-column settings layout", () => {
    expect(EMOJI_PACKS.length % 2).toBe(0);
  });

  test("exposes a matching pack count from list API", () => {
    expect(getEmojiPacks()).toHaveLength(EMOJI_PACKS.length);
  });

  test("documents minimum icon count policy", () => {
    expect(MIN_ICONS_PER_PACK).toBe(50);
  });

  test("technology pack includes second OpenMoji CC batch symbols", () => {
    const technologyPack = EMOJI_PACKS.find((pack) => pack.id === "technology");

    expect(technologyPack).toBeDefined();

    for (const icon of OPENMOJI_SECOND_BATCH_ICONS) {
      expect(technologyPack?.icons).toContain(icon);
    }
  });

  test("medieval fantasy pack uses imported medieval SVG tokens", () => {
    const medievalPack = EMOJI_PACKS.find((pack) => pack.id === "medieval-fantasy");

    expect(medievalPack).toBeDefined();

    for (const icon of [
      "asset:openmoji:1F3F0",
      "asset:openmoji:1F6E1",
      "asset:openmoji:2694",
      "asset:openmoji:1F409",
      "asset:openmoji:1F432",
      "asset:openmoji:1F43A",
      "asset:openmoji:1F987",
      "asset:openmoji:1F982",
      "asset:openmoji:1F5FA-FE0F",
      "asset:openmoji:1FAA4",
      "asset:openmoji:1FAA8",
      "asset:openmoji:1F578-FE0F",
      "asset:openmoji:1F9B4",
      "asset:openmoji:1F985",
      "asset:openmoji:1F417",
      "asset:openmoji:1F99C",
      "asset:openmoji:1FAB6",
      "asset:openmoji:1F6D6",
      "asset:openmoji:1F531",
      "asset:openmoji:26B0-FE0F",
      "asset:openmoji:1F98F",
    ] as const) {
      expect(medievalPack?.icons).toContain(icon);
    }

    for (const icon of [
      "🧙‍♂️",
      "🧙‍♀️",
      "🧝‍♂️",
      "🧝‍♀️",
      "🧚‍♂️",
      "🧚‍♀️",
      "🧞‍♂️",
      "🧞‍♀️",
      "🧛‍♂️",
      "🧛‍♀️",
      "♔",
      "♕",
      "♚",
      "♛",
      "♜",
      "♝",
      "♞",
      "♟",
      "🐉",
      "🛡️",
      "⚔️",
      "🗺️",
      "🐲",
      "🐗",
      "🦂",
      "⚰️",
    ] as const) {
      expect(medievalPack?.icons).not.toContain(icon);
    }
  });

  test("every imported SVG asset token is assigned to at least one icon pack", () => {
    const assignedIcons = new Set(EMOJI_PACKS.flatMap((pack) => pack.icons));

    for (const token of Object.keys(ICON_ASSET_DEFINITIONS)) {
      expect(assignedIcons.has(token)).toBe(true);
    }
  });

  test("space pack integrates imported SVG icon tokens and removes astronaut triplet", () => {
    const spacePack = EMOJI_PACKS.find((pack) => pack.id === "space-astronomy");

    expect(spacePack).toBeDefined();

    for (const icon of [
      "asset:openmoji:1F680",
      "asset:openmoji:1F916",
      "asset:openmoji:1F52C",
    ] as const) {
      expect(spacePack?.icons).toContain(icon);
    }

    expect(spacePack?.icons).not.toContain("🧑‍🚀");
    expect(spacePack?.icons).not.toContain("👨‍🚀");
    expect(spacePack?.icons).not.toContain("👩‍🚀");
  });

  test("space pack avoids repetitive moon-phase and duplicate-earth clusters", () => {
    const spacePack = EMOJI_PACKS.find((pack) => pack.id === "space-astronomy");

    expect(spacePack).toBeDefined();

    for (const icon of [
      "🌝",
      "🌚",
      "🌛",
      "🌜",
      "🌖",
      "🌗",
      "🌘",
      "🌑",
      "🌒",
      "🌓",
      "🌔",
      "🌎",
      "🌏",
    ] as const) {
      expect(spacePack?.icons).not.toContain(icon);
    }

    expect(spacePack?.icons).toContain("🌍");
  });

  test("each pack removes curated anti-cluster symbols", () => {
    const forbiddenByPack: Partial<Record<EmojiPackId, readonly string[]>> = {
      "space-astronomy": ["🌆", "🌇", "🌁", "🌤️", "🌧️", "☔"],
      "plants-nature": ["🪹", "🦚"],
      "food-drinks": ["🥨", "🥯"],
      technology: ["🚚", "🚛"],
      "world-flags": ["🇦🇷", "🇧🇪", "🇫🇷", "🇮🇹", "🇳🇱", "🇷🇴"],
      "medieval-fantasy": ["♗", "♙"],
      "music-performance": ["🎊", "🎉"],
      "religious-symbols": ["🗿", "🪢"],
    };

    for (const pack of EMOJI_PACKS) {
      const forbiddenIcons = forbiddenByPack[pack.id] ?? [];
      for (const icon of forbiddenIcons) {
        expect(pack.icons).not.toContain(icon);
      }
    }
  });

  test("returns sorted active imported openmoji tokens", () => {
    const activeTokens = getActiveOpenmojiIconTokens();
    const sorted = [...activeTokens].sort((a, b) => a.localeCompare(b));

    expect(activeTokens).toEqual(sorted);
    expect(activeTokens.every((token) => (OPENMOJI_IMPORTED_ICON_TOKENS as readonly string[]).includes(token))).toBe(true);
  });

  test("active and inactive imported token sets partition imported tokens", () => {
    const activeTokens = getActiveOpenmojiIconTokens();
    const inactiveTokens = getInactiveImportedOpenmojiIconTokens();
    const importedTokens = OPENMOJI_IMPORTED_ICON_TOKENS;

    const activeSet = new Set(activeTokens);
    const inactiveSet = new Set(inactiveTokens);

    expect(activeTokens.every((token) => !inactiveSet.has(token))).toBe(true);
    expect(inactiveTokens.every((token) => !activeSet.has(token))).toBe(true);

    const union = new Set([...activeTokens, ...inactiveTokens]);
    expect(union.size).toBe(importedTokens.length);
    expect(importedTokens.every((token) => union.has(token))).toBe(true);
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

  test("guarantees a minimum SVG token presence when a pack has asset tokens", () => {
    const uniqueIconCount = 10;
    const expectedUniqueAssetIcons = Math.ceil(uniqueIconCount * MIN_ASSET_ICON_RATIO);
    const deck = generateEmojiDeck(uniqueIconCount, "space-astronomy");
    const assetTiles = deck.filter((icon) => icon.startsWith("asset:")).length;

    expect(assetTiles).toBeGreaterThanOrEqual(expectedUniqueAssetIcons * 2);
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
    // Suppress the expected console.error from generateEmojiDeck's error path.
    vi.spyOn(console, "error").mockImplementation(() => {});
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

  test("can generate a full technology deck containing second-batch imported icons", () => {
    const technologyPack = EMOJI_PACKS.find((pack) => pack.id === "technology");

    expect(technologyPack).toBeDefined();

    const deck = generateEmojiDeck(technologyPack!.icons.length, "technology");

    for (const icon of OPENMOJI_SECOND_BATCH_ICONS) {
      const count = deck.filter((entry) => entry === icon).length;
      expect(count).toBe(2);
    }
  });
});