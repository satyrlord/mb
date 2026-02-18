import { shuffle } from "./utils.js";

const ICON_POOL = [
  "🛰️",
  "🚀",
  "🌟",
  "🎧",
  "🎯",
  "🧩",
  "🎮",
  "🎨",
  "💡",
  "⚙️",
  "🛸",
  "📦",
  "🧠",
  "🔮",
  "🪐",
  "🌈",
  "🔥",
  "❄️",
  "🍀",
  "🌙",
  "☀️",
  "🐙",
  "🦊",
  "🐼",
  "🐧",
  "🐢",
  "🦄",
  "🍉",
  "🍓",
  "🍋",
  "🍇",
  "🥝",
  "🍒",
  "🍍",
  "🧁",
  "🍪",
  "🥨",
  "🍿",
  "⚡",
  "🧲",
  "🧪",
  "🧭",
  "🔔",
  "🎲",
  "🪁",
  "🎈",
  "🎵",
  "🏁",
  "🧱",
  "🔷",
  "🔶",
  "🔺",
  "🟣",
  "🟢",
  "🔴",
  "🔵",
  "⭐",
  "✨",
  "🌻",
  "🌵",
] as const;

export const generateEmojiDeck = (pairCount: number): string[] => {
  if (pairCount > ICON_POOL.length) {
    throw new Error(
      `Not enough unique icons in the pool. Requested ${pairCount} pairs but only ${ICON_POOL.length} icons available.`,
    );
  }

  const chosenIcons = shuffle([...ICON_POOL]).slice(0, pairCount);
  const pairs = chosenIcons.flatMap((icon) => [icon, icon]);

  return shuffle(pairs);
};
