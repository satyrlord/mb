import { shuffle } from "./utils.js";
import {
  IMPORTED_OPENMOJI_ICON_TOKENS,
  IMPORTED_OPENMOJI_ICON_TOKEN_SET,
} from "./openmoji-imports.js";

export type EmojiPackId =
  | "space-astronomy"
  | "plants-nature"
  | "food-drinks"
  | "technology"
  | "world-flags"
  | "medieval-fantasy"
  | "music-performance"
  | "religious-symbols";

interface EmojiPackDefinition {
  id: EmojiPackId;
  name: string;
  previewIcon: string;
  icons: readonly string[];
}

/**
 * Minimum number of icons required in a pack to support all difficulties.
 *
 * The 1x tile-multiplier uniqueness policy targets up to 50 unique tiles.
 * Each icon pack must therefore provide at least 50 unique icons so the
 * deck generator can satisfy this no-repetition target from a single pack.
 *
 * This value is the single source of truth for the minimum icon count within
 * the icon system. It is enforced at runtime by
 * {@link validateMinPackIconCount}, which throws an `Error` if any
 * registered pack falls below this threshold. If the hardest board size
 * changes, update this constant (and the related validation/error messaging)
 * to keep it in sync with the game configuration that defines board layouts.
 *
 * See the `DIFFICULTIES` array in `src/index.ts` when modifying the
 * hardest board size or tile count.
 */
export const MIN_ICONS_PER_PACK = 50;

export const MIN_ASSET_ICON_RATIO = 0.3;

/**
 * Icon pack definitions embedded inline for type safety and instant availability.
 *
 * These are kept in source rather than loaded from JSON because:
 * - `EmojiPackId` union type is verified against pack `id` fields at compile time.
 * - Icons are available at module load without async I/O or fetch.
 * - Tree-shaking can eliminate unused packs in downstream builds.
 *
 * The equivalent machine-readable catalog for tooling lives separately in
 * `icon/icon-pack-catalog.json` (synced via `npm run icons:sync`).
 */
export const EMOJI_PACKS: readonly EmojiPackDefinition[] = [
  {
    id: "space-astronomy",
    name: "Space & Astronomy",
    previewIcon: "🪐",
    icons: [
      "☀️",
      "🌞",
      "🌕",
      "🌙",
      "🌍",
      "🌀",
      "🕳️",
      "🧑‍🔬",
      "🧠",
      "🌉",
      "🏙️",
      "🔥",
      "❄️",
      "🪂",
      "🛸",
      "🔦",
      "🪐",
      "💫",
      "⭐",
      "🌟",
      "✨",
      "⚡",
      "☄️",
      "🌠",
      "🌌",
      "🌃",
      "🌄",
      "🌅",
      "🗼",
      "🚀",
      "🛰️",
      "🔭",
      "asset:openmoji:1F680",
      "asset:openmoji:1F916",
      "asset:openmoji:1F52C",
      "👽",
      "🌐",
      "♈",
      "♉",
      "♊",
      "♋",
      "♌",
      "♍",
      "♎",
      "♏",
      "♐",
      "♑",
      "♒",
      "♓",
      "🛰",
      "🛩️",
    ],
  },
  {
    id: "plants-nature",
    name: "Biosphere",
    previewIcon: "🌿",
    icons: [
      "🌱",
      "🌿",
      "☘️",
      "🍀",
      "🎍",
      "🪴",
      "🎋",
      "🍃",
      "🍂",
      "🍁",
      "🌾",
      "🌵",
      "🌴",
      "🌳",
      "🌲",
      "🪵",
      "🌷",
      "🌸",
      "🌺",
      "🌻",
      "🌼",
      "💐",
      "🪻",
      "🦉",
      "🍄",
      "🦔",
      "🪺",
      "🌊",
      "⛰️",
      "🗻",
      "🦋",
      "🐝",
      "🐞",
      "🪲",
      "🦬",
      "🕷️",
      "🦫",
      "🦦",
      "🦭",
      "🐸",
      "🦆",
      "🦩",
      "🐿️",
      "🦎",
      "🪸",
      "🐚",
      "🐬",
      "🦪",
      "🦞",
      "🪼",
    ],
  },
  {
    id: "food-drinks",
    name: "Food & Drinks",
    previewIcon: "🥤",
    icons: [
      "🍉",
      "🍓",
      "🍋",
      "🍇",
      "🍛",
      "🥪",
      "🥞",
      "🍎",
      "🧇",
      "🍗",
      "🥑",
      "🌽",
      "🥕",
      "🍕",
      "🍔",
      "🌮",
      "🍣",
      "🍩",
      "🧁",
      "🍪",
      "🍿",
      "🥤",
      "🧋",
      "☕",
      "🍵",
      "🧃",
      "🍊", // was 🥛 — replaced for better cross-platform rendering
      "🍺",
      "🍷",
      "🍹",
      "🍖",
      "🍤",
      "🍜",
      "🫐",
      "🍝",
      "🥟",
      "🥭",
      "🍅",
      "🍆",
      "🥔",
      "🧅",
      "🧄",
      "🥦",
      "🥬",
      "🫛",
      "🫘",
      "🌶️",
      "🫑",
      "🥒",
      "🫒",
    ],
  },
  {
    id: "technology",
    name: "Technology",
    previewIcon: "🤖",
    icons: [
      "🚗",
      "🧮",
      "🔐",
      "🚌",
      "🗜️",
      "🚓",
      "🚑",
      "🚒",
      "📺",
      "📠",
      "🚜",
      "🚲",
      "🛵",
      "🏍️",
      "🚂",
      "🚆",
      "✈️",
      "🚁",
      "🚢",
      "⚓",
      "⛽",
      "🔧",
      "🔨",
      "🪛",
      "🪚",
      "⚙️",
      "⛓️",
      "🧰",
      "🧪",
      "⚗️",
      "🔬",
      "🧬",
      "🧫",
      "🧲",
      "⚛️",
      "💡",
      "🔋",
      "🪫",
      "🔌",
      "💻",
      "🖥️",
      "⌨️",
      "🖱️",
      "🖨️",
      "📱",
      "📡",
      "📼",
      "📀",
      "🤖",
      "🦾",
      "asset:openmoji:1F9EA",
      "📶",
      "asset:openmoji:1F6DE",
      "asset:openmoji:1F9ED",
      "asset:openmoji:1FA9D",
      "asset:openmoji:1FAAA",
      "asset:openmoji:1F6DF",
      "asset:openmoji:1F9EF",
      "asset:openmoji:1FA83",
      "asset:openmoji:1FA99",
      "asset:openmoji:1FA9C",
      "asset:openmoji:1FAA0",
      "asset:openmoji:1F9F1",
      "asset:openmoji:1F6DD",
    ],
  },
  {
    id: "world-flags",
    name: "World Flags",
    previewIcon: "🌍",
    icons: [
      "🇳🇵",
      "🇦🇺",
      "🇯🇲",
      "🇧🇷",
      "🇨🇦",
      "🇨🇱",
      "🇨🇳",
      "🇨🇴",
      "🇩🇰",
      "🇪🇬",
      "🇫🇮",
      "🇸🇨",
      "🇩🇪",
      "🇬🇷",
      "🇮🇳",
      "🇰🇪",
      "🇮🇪",
      "🇧🇹",
      "🇯🇵",
      "🇨🇭",
      "🇲🇽",
      "🇰🇭",
      "🇲🇳",
      "🇳🇴",
      "🇵🇱",
      "🇵🇹",
      "🇰🇷",
      "🇪🇸",
      "🇸🇪",
      "🇦🇪",
      "🇺🇸",
      "🇬🇧",
      "🇺🇦",
      "🇹🇷",
      "🇿🇦",
      "🇳🇿",
      "🇹🇭",
      "🇻🇳",
      "🇸🇬",
      "🇲🇾",
      "🇵🇭",
      "🇵🇰",
      "🇸🇦",
      "🇮🇱",
      "🇨🇿",
      "🇭🇺",
      "🇦🇹",
      "🇧🇬",
      "🇭🇷",
      "🇸🇰",
    ],
  },
  {
    id: "medieval-fantasy",
    name: "Medieval Fantasy",
    previewIcon: "🐉",
    icons: [
      "asset:openmoji:1F3F0",
      "asset:openmoji:1F6E1",
      "asset:openmoji:2694",
      "🗡️",
      "🏹",
      "🪄",
      "🔮",
      "asset:openmoji:1F409",
      "🧙",
      "🧝",
      "🧚",
      "🧌",
      "🦄",
      "👑",
      "🏇",
      "🐎",
      "🧞",
      "🧛",
      "🧟",
      "🧟‍♂️",
      "🪓",
      "🏔️",
      "🏞️",
      "🌋",
      "🐍", // was 🌫️ — replaced for better visual distinctiveness on tile
      "🧿",
      "🗝️",
      "☠️",
      "♖",
      "🦁",
      "♘",
      "🐏",
      "asset:openmoji:1F432",
      "asset:openmoji:1F43A",
      "asset:openmoji:1F987",
      "asset:openmoji:1F982",
      "asset:openmoji:1F5FA-FE0F",
      "asset:openmoji:1FAA4",
      "asset:openmoji:1FAA8",
      "🏺",
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
    ],
  },
  {
    id: "music-performance",
    name: "Arts & Crafts",
    previewIcon: "🎵",
    icons: [
      "🎵",
      "🎶",
      "🎼",
      "🎤",
      "🎙️",
      "🎚️",
      "🎛️",
      "🎧",
      "📻",
      "🪩",
      "asset:openmoji:1F3B8",
      "🎹",
      "🥁",
      "🎷",
      "🎺",
      "🪗",
      "🪕",
      "🎻",
      "🕺",
      "💃",
      "🩰",
      "asset:openmoji:1F3AD",
      "🎬",
      "🎥",
      "🎞️",
      "🎟️",
      "🎨",
      "🎪",
      "🖌️",
      "🧵",
      "🪡",
      "🧶",
      "🧷",
      "🎲",
      "🎯",
      "🎮",
      "🕹️",
      "👾",
      "🎰",
      "🎳",
      "🪀",
      "🪁",
      "🪈",
      "🧑‍🎤",
      "📝",
      "✂️",
      "🎐",
      "🪅",
      "🧸",
      "🎎",
    ],
  },
  {
    id: "religious-symbols",
    name: "Religious Symbols",
    previewIcon: "🛐",
    icons: [
      "✝️",
      "☦️",
      "☪️",
      "✡️",
      "☸️",
      "🕉️",
      "☯️",
      "🔯",
      "🛐",
      "🕋",
      "🕌",
      "🕍",
      "⛩️",
      "🛕",
      "⛪",
      "🕎",
      "📿",
      "🙏",
      "🧕",
      "👳",
      "🧘",
      "🧎",
      "🕯️",
      "🪔",
      "🪷",
      "📖",
      "📜",
      "⚱️",
      "🪦",
      "☮️",
      "🕊️",
      "👼",
      "🪽",
      "🤲",
      "🙌",
      "🙇",
      "🫶",
      "💒",
      "🪬",
      "⚜️",
      "🪧",
      "🪆",
      "⚖️",
      "⏳",
      "⏱️",
      "🔔",
      "📯",
      "🏛️", // was ☁️ — replaced for better visual distinctiveness on tile
      "🌈",
      "⛲", // was 🫧 — replaced for better cross-platform rendering
    ],
  },
] as const;

/**
 * Validates that each icon pack contains only unique icons.
 *
 * Iterates over the provided icon packs (or {@link EMOJI_PACKS} by default)
 * and throws an error as soon as a duplicate icon is found within a pack.
 * The error message includes the pack ID and the first duplicate icon.
 *
 * @param packs - The icon packs to validate for duplicate icons.
 * @throws {Error} If any pack contains duplicate icons. The error message
 * includes the pack ID and the duplicate icon that triggered the error.
 */
export const validateUniquePackIcons = (
  packs: readonly { id: string; icons: readonly string[] }[] = EMOJI_PACKS,
): void => {
  const globalSeen = new Map<string, string>();

  for (const pack of packs) {
    const seen = new Set<string>();

    for (const icon of pack.icons) {
      if (seen.has(icon)) {
        throw new Error(
          `[MEMORYBLOX] Duplicate icon found in '${pack.id}': ${icon}`,
        );
      }

      const existingPackId = globalSeen.get(icon);

      if (existingPackId !== undefined) {
        throw new Error(
          `[MEMORYBLOX] Duplicate icon found across packs '${existingPackId}' and '${pack.id}': ${icon}`,
        );
      }

      seen.add(icon);
      globalSeen.set(icon, pack.id);
    }
  }
};

export const validateMinPackIconCount = (
  packs: readonly { id: string; icons: readonly string[] }[] = EMOJI_PACKS,
): void => {
  for (const pack of packs) {
    if (pack.icons.length < MIN_ICONS_PER_PACK) {
      throw new Error(
        `[MEMORYBLOX] Icon pack '${pack.id}' has ${pack.icons.length} icons; minimum required is ${MIN_ICONS_PER_PACK}.`,
      );
    }
  }
};

export const DEFAULT_EMOJI_PACK_ID: EmojiPackId = "space-astronomy";

/** Minimum number of copies generated per icon; standard pairs require exactly 2 tiles. */
export const MIN_COPIES_PER_ICON = 2;

export const OPENMOJI_IMPORTED_ICON_TOKENS = IMPORTED_OPENMOJI_ICON_TOKENS;

export const OPENMOJI_IMPORTED_ICON_COUNT = OPENMOJI_IMPORTED_ICON_TOKENS.length;

export const getActiveOpenmojiIconTokens = (): string[] => {
  const activeTokens = new Set<string>();

  for (const pack of EMOJI_PACKS) {
    for (const icon of pack.icons) {
      if (IMPORTED_OPENMOJI_ICON_TOKEN_SET.has(icon)) {
        activeTokens.add(icon);
      }
    }
  }

  return [...activeTokens].sort((a, b) => a.localeCompare(b));
};

export const getInactiveImportedOpenmojiIconTokens = (): string[] => {
  const activeTokens = new Set(getActiveOpenmojiIconTokens());

  return OPENMOJI_IMPORTED_ICON_TOKENS.filter((token) => !activeTokens.has(token));
};

const isAssetToken = (icon: string): boolean => {
  return icon.startsWith("asset:");
};

export const getEmojiPacks = (): Array<{ id: EmojiPackId; name: string; previewIcon: string }> => {
  return EMOJI_PACKS.map((pack) => ({ id: pack.id, name: pack.name, previewIcon: pack.previewIcon }));
};

const getPackById = (packId: EmojiPackId): EmojiPackDefinition => {
  const pack = EMOJI_PACKS.find((candidate) => candidate.id === packId);

  if (pack !== undefined) {
    return pack;
  }

  const fallbackPack = EMOJI_PACKS.find((candidate) => candidate.id === DEFAULT_EMOJI_PACK_ID);

  if (fallbackPack === undefined) {
    throw new Error(
      `[MEMORYBLOX] Default icon pack '${DEFAULT_EMOJI_PACK_ID}' is missing from pack definitions.`,
    );
  }

  return fallbackPack;
};

/**
 * Generates a shuffled emoji deck by picking `uniqueIconCount` unique icons from the
 * specified pack and duplicating each according to `copiesPerIcon`.
 *
 * @param uniqueIconCount - Number of unique icons to include. Must not exceed the
 *   pack's icon count (minimum `MIN_ICONS_PER_PACK` = 50 icons per pack).
 * @param packId - The icon pack to draw icons from.
 * @param copiesPerIcon - Number of tiles to create per icon. Accepts either:
 *   - A single `number` applied uniformly to all icons (default: `2` for standard pairs).
 *   - A `readonly number[]` with one entry per icon, allowing a mixed deck where
 *     some icons appear as pairs (2 copies) and others as larger sets (3+ copies).
 *     The array length must equal `uniqueIconCount`.
 *
 *   Values below {@link MIN_COPIES_PER_ICON} (2) are clamped up to that minimum
 *   so every icon always produces at least one matchable pair. Fractional values
 *   are rounded to the nearest integer before clamping.
 */
export const generateEmojiDeck = (
  uniqueIconCount: number,
  packId: EmojiPackId = DEFAULT_EMOJI_PACK_ID,
  copiesPerIcon: number | readonly number[] = MIN_COPIES_PER_ICON,
): string[] => {
  const pack = getPackById(packId);
  let normalizedCopies: number | number[];

  if (typeof copiesPerIcon === "number") {
    normalizedCopies = Math.max(MIN_COPIES_PER_ICON, Math.round(copiesPerIcon));
  } else {
    normalizedCopies = copiesPerIcon.map((count) => Math.max(MIN_COPIES_PER_ICON, Math.round(count)));
  }

  if (uniqueIconCount <= 0) {
    return [];
  }

  if (Array.isArray(normalizedCopies) && normalizedCopies.length !== uniqueIconCount) {
    throw new Error(
      `[MEMORYBLOX] Expected ${uniqueIconCount} copy counts but received ${normalizedCopies.length}. Ensure the copiesPerIcon array length matches uniqueIconCount.`,
    );
  }

  if (uniqueIconCount > pack.icons.length) {
    const requestedTiles = Array.isArray(normalizedCopies)
      ? normalizedCopies.reduce((sum, count) => sum + count, 0)
      : uniqueIconCount * normalizedCopies;
    console.error(
      "[MEMORYBLOX] Emoji deck generation failed due to insufficient icons.",
      {
        packId,
        packName: pack.name,
        availableIcons: pack.icons.length,
        requestedSets: uniqueIconCount,
        requestedTiles,
      },
    );
    throw new Error(
      `Not enough unique icons in the '${pack.name}' pack. Requested ${uniqueIconCount} sets (${requestedTiles} tiles) but only ${pack.icons.length} icons available.`,
    );
  }

  const shuffledIcons = shuffle([...pack.icons]);
  const assetIcons = shuffledIcons.filter((icon) => isAssetToken(icon));
  const standardIcons = shuffledIcons.filter((icon) => !isAssetToken(icon));
  const minAssetIcons = assetIcons.length === 0
    ? 0
    : Math.min(
      assetIcons.length,
      uniqueIconCount,
      Math.max(1, Math.ceil(uniqueIconCount * MIN_ASSET_ICON_RATIO)),
    );
  const selectedAssetIcons = assetIcons.slice(0, minAssetIcons);
  const remainingSlots = uniqueIconCount - selectedAssetIcons.length;
  const selectedStandardIcons = standardIcons.slice(0, remainingSlots);
  const fallbackAssetIcons = assetIcons.slice(
    selectedAssetIcons.length,
    selectedAssetIcons.length + Math.max(0, remainingSlots - selectedStandardIcons.length),
  );
  const chosenIcons = shuffle([
    ...selectedAssetIcons,
    ...selectedStandardIcons,
    ...fallbackAssetIcons,
  ]);
  const tiles = chosenIcons.flatMap((icon, index) => {
    const copyCount = Array.isArray(normalizedCopies)
      ? (normalizedCopies[index] ?? MIN_COPIES_PER_ICON)
      : normalizedCopies;
    return Array.from({ length: copyCount }, () => icon);
  });

  return shuffle(tiles);
};
