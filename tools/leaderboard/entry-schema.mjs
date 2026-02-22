const DEFAULT_EMOJI_SET_LABEL = "Unknown Pack";

const parseNonNegativeInteger = (value) => {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  if (value < 0) {
    console.warn(
      `[MEMORYBLOX] parseNonNegativeInteger received a negative value (${value}). `
        + "Clamping to 0. Verify the score payload for data quality issues.",
    );
  }

  return Math.max(0, Math.round(value));
};

export const parseLeaderboardPayloadEntry = (payload, options = {}) => {
  const { allowCreatedAt = false } = options;
  const playerName = typeof payload.playerName === "string" ? payload.playerName.trim() : "";
  const difficultyId = typeof payload.difficultyId === "string" ? payload.difficultyId.trim() : "";
  const difficultyLabel = typeof payload.difficultyLabel === "string" ? payload.difficultyLabel.trim() : "";
  const emojiSetId = typeof payload.emojiSetId === "string" ? payload.emojiSetId.trim() : "";
  const rawEmojiSetLabel = typeof payload.emojiSetLabel === "string" ? payload.emojiSetLabel.trim() : "";
  const emojiSetLabel = rawEmojiSetLabel.length > 0
    ? rawEmojiSetLabel
    : DEFAULT_EMOJI_SET_LABEL;
  const timeMs = parseNonNegativeInteger(payload.timeMs);
  const attempts = parseNonNegativeInteger(payload.attempts);
  const isAutoDemo = payload.isAutoDemo === true;
  const scoreMultiplier = Number.isFinite(payload.scoreMultiplier)
    ? Math.max(0, payload.scoreMultiplier)
    : 1;
  const scoreValue = Number.isFinite(payload.scoreValue)
    ? Math.max(0, Math.round(payload.scoreValue))
    : 0;
  const createdAt = allowCreatedAt
    && typeof payload.createdAt === "string"
    && payload.createdAt.trim().length > 0
    ? payload.createdAt.trim()
    : new Date().toISOString();

  const invalidFields = [];

  if (playerName.length === 0) {
    invalidFields.push("playerName");
  }

  if (difficultyId.length === 0) {
    invalidFields.push("difficultyId");
  }

  if (difficultyLabel.length === 0) {
    invalidFields.push("difficultyLabel");
  }

  if (emojiSetId.length === 0) {
    invalidFields.push("emojiSetId");
  }

  if (emojiSetLabel.length === 0) {
    invalidFields.push("emojiSetLabel");
  }

  if (!Number.isFinite(timeMs)) {
    invalidFields.push("timeMs");
  }

  if (!Number.isFinite(attempts)) {
    invalidFields.push("attempts");
  }

  if (invalidFields.length > 0) {
    throw new Error(`Invalid score payload: missing or invalid ${invalidFields.join(", ")}.`);
  }

  return {
    playerName,
    timeMs,
    attempts,
    difficultyId,
    difficultyLabel,
    emojiSetId,
    emojiSetLabel,
    scoreMultiplier,
    scoreValue,
    isAutoDemo,
    createdAt,
  };
};
