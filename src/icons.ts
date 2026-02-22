import { shuffle } from "./utils.js";

export type EmojiPackId =
  | "space-astronomy"
  | "plants-nature"
  | "food-drinks"
  | "industry"
  | "world-flags"
  | "science-tech"
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
 * The hardest board currently uses 50 tiles, which corresponds to 25 pairs.
 * Each emoji pack must therefore provide at least 25 unique icons so the
 * deck generator can build a full hard-mode board from a single pack.
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
export const MIN_ICONS_PER_PACK = 25;

export const EMOJI_PACKS: readonly EmojiPackDefinition[] = [
  {
    id: "space-astronomy",
    name: "Space & Astronomy",
    previewIcon: "🪐",
    icons: [
      "☀️",
      "🌞",
      "🌝",
      "🌚",
      "🌛",
      "🌜",
      "🌕",
      "🌖",
      "🌗",
      "🌘",
      "🌑",
      "🌒",
      "🌓",
      "🌔",
      "🌙",
      "🌍",
      "🌎",
      "🌏",
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
      "🛸",
      "🚀",
      "🛰️",
      "🔭",
      "🧑‍🚀",
      "👨‍🚀",
      "👩‍🚀",
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
      "🪷",
      "🍄",
      "🪹",
      "🪺",
      "🌊",
      "⛰️",
      "🗻",
      "🦋",
      "🐝",
      "🐞",
      "🪲",
      "🪳",
      "🕷️",
      "🦗",
      "🐌",
      "🐛",
      "🐸",
      "🦆",
      "🦢",
      "🐢",
      "🦎",
      "🐠",
      "🐟",
      "🐬",
      "🦀",
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
      "🥝",
      "🍒",
      "🍍",
      "🍎",
      "🍑",
      "🥥",
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
      "🥛",
      "🍺",
      "🍷",
      "🍹",
    ],
  },
  {
    id: "industry",
    name: "Industry",
    previewIcon: "🏗️",
    icons: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🚓",
      "🚑",
      "🚒",
      "🚚",
      "🚛",
      "🚜",
      "🚲",
      "🛵",
      "🏍️",
      "🚂",
      "🚆",
      "✈️",
      "🚁",
      "🚀",
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
      "🏗️",
    ],
  },
  {
    id: "world-flags",
    name: "World Flags",
    previewIcon: "🌍",
    icons: [
      "🇦🇷",
      "🇦🇺",
      "🇧🇪",
      "🇧🇷",
      "🇨🇦",
      "🇨🇱",
      "🇨🇳",
      "🇨🇴",
      "🇩🇰",
      "🇪🇬",
      "🇫🇮",
      "🇫🇷",
      "🇩🇪",
      "🇬🇷",
      "🇮🇳",
      "🇮🇩",
      "🇮🇪",
      "🇮🇹",
      "🇯🇵",
      "🇨🇭",
      "🇲🇽",
      "🇳🇱",
      "🇲🇳",
      "🇳🇴",
      "🇵🇱",
      "🇵🇹",
      "🇰🇷",
      "🇪🇸",
      "🇸🇪",
      "🇷🇴",
    ],
  },
  {
    id: "science-tech",
    name: "Science & Tech",
    previewIcon: "🧪",
    icons: [
      "🧪",
      "⚗️",
      "🔬",
      "🔭",
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
      "📟",
      "📠",
      "🛰️",
      "🤖",
      "🦾",
      "⚙️",
      "🔧",
      "🪛",
      "🧰",
      "🛜",
      "📶",
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
      "🎸",
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
      "🎭",
      "🎬",
      "🎥",
      "🎞️",
      "🎟️",
      "🎨",
      "🎪",
      "✨",
      "🌟",
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
    ],
  },
] as const;

/**
 * Validates that each emoji pack contains only unique icons.
 *
 * Iterates over the provided emoji packs (or {@link EMOJI_PACKS} by default)
 * and throws an error as soon as a duplicate icon is found within a pack.
 * The error message includes the pack ID and the first duplicate icon.
 *
 * @param packs - The emoji packs to validate for duplicate icons.
 * @throws {Error} If any pack contains duplicate icons. The error message
 * includes the pack ID and the duplicate icon that triggered the error.
 */
export const validateUniquePackIcons = (
  packs: readonly Pick<EmojiPackDefinition, "id" | "icons">[] = EMOJI_PACKS,
): void => {
  for (const pack of packs) {
    const seen = new Set<string>();

    for (const icon of pack.icons) {
      if (seen.has(icon)) {
        throw new Error(
          `[MEMORYBLOX] Duplicate icon found in '${pack.id}': ${icon}`,
        );
      }
      seen.add(icon);
    }
  }
};

export const validateMinPackIconCount = (
  packs: readonly Pick<EmojiPackDefinition, "id" | "icons">[] = EMOJI_PACKS,
): void => {
  for (const pack of packs) {
    if (pack.icons.length < MIN_ICONS_PER_PACK) {
      throw new Error(
        `[MEMORYBLOX] Emoji pack '${pack.id}' has ${pack.icons.length} icons; minimum required is ${MIN_ICONS_PER_PACK}.`,
      );
    }
  }
};

export const DEFAULT_EMOJI_PACK_ID: EmojiPackId = "space-astronomy";

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
      `[MEMORYBLOX] Default emoji pack '${DEFAULT_EMOJI_PACK_ID}' is missing from pack definitions.`,
    );
  }

  return fallbackPack;
};

/**
 * Generates a shuffled emoji deck of `pairCount * 2` tiles by picking
 * `pairCount` unique icons from the specified pack and duplicating each.
 *
 * @param pairCount - Number of matched pairs to include. Must not exceed the
 *   pack's icon count (minimum `MIN_ICONS_PER_PACK` = 25 icons per pack).
 * @param packId - The emoji pack to draw icons from.
 */
export const generateEmojiDeck = (
  pairCount: number,
  packId: EmojiPackId = DEFAULT_EMOJI_PACK_ID,
): string[] => {
  const pack = getPackById(packId);

  if (pairCount > pack.icons.length) {
    console.error(
      "[MEMORYBLOX] Emoji deck generation failed due to insufficient icons.",
      {
        packId,
        packName: pack.name,
        availableIcons: pack.icons.length,
        requestedPairs: pairCount,
        requestedTiles: pairCount * 2,
      },
    );
    throw new Error(
      `Not enough unique icons in the '${pack.name}' pack. Requested ${pairCount} pairs (${pairCount * 2} tiles) but only ${pack.icons.length} icons available.`,
    );
  }

  const chosenIcons = shuffle([...pack.icons]).slice(0, pairCount);
  const pairs = chosenIcons.flatMap((icon) => [icon, icon]);

  return shuffle(pairs);
};
