import type { LeaderboardScoreEntry } from "./leaderboard.js";

export const formatLeaderboardTimestampGmt = (createdAt: string): string => {
  const timestamp = new Date(createdAt);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown time (GMT)";
  }

  return timestamp.toUTCString();
};

export const createLeaderboardEntryKey = (entry: LeaderboardScoreEntry): string => {
  return JSON.stringify([
    entry.playerName,
    entry.timeMs,
    entry.attempts,
    entry.difficultyId,
    entry.difficultyLabel,
    entry.emojiSetId,
    entry.emojiSetLabel,
    entry.scoreMultiplier,
    entry.scoreValue,
    entry.isAutoDemo,
    entry.createdAt,
  ]);
};

export type LeaderboardSubmissionIdentity = Pick<
  LeaderboardScoreEntry,
  "playerName"
  | "timeMs"
  | "attempts"
  | "difficultyId"
  | "difficultyLabel"
  | "emojiSetId"
  | "emojiSetLabel"
  | "scoreMultiplier"
  | "scoreValue"
  | "isAutoDemo"
>;

export const createLeaderboardSubmissionIdentity = (
  value: LeaderboardSubmissionIdentity,
): string => {
  return JSON.stringify([
    value.playerName,
    value.timeMs,
    value.attempts,
    value.difficultyId,
    value.difficultyLabel,
    value.emojiSetId,
    value.emojiSetLabel,
    value.scoreMultiplier,
    value.scoreValue,
    value.isAutoDemo,
  ]);
};

export const resolveLastSubmittedLeaderboardEntryKey = (
  entries: readonly LeaderboardScoreEntry[],
  submittedScore: LeaderboardSubmissionIdentity,
): string | null => {
  const submittedIdentity = createLeaderboardSubmissionIdentity(submittedScore);
  let mostRecentMatch: LeaderboardScoreEntry | null = null;
  let mostRecentMatchTimestamp = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    if (createLeaderboardSubmissionIdentity(entry) !== submittedIdentity) {
      continue;
    }

    const entryTimestamp = Date.parse(entry.createdAt);

    if (
      mostRecentMatch === null
      || (Number.isFinite(entryTimestamp) && entryTimestamp > mostRecentMatchTimestamp)
      || (!Number.isFinite(entryTimestamp) && entry.createdAt > mostRecentMatch.createdAt)
    ) {
      mostRecentMatch = entry;
      mostRecentMatchTimestamp = entryTimestamp;
    }
  }

  if (mostRecentMatch === null) {
    return null;
  }

  return createLeaderboardEntryKey(mostRecentMatch);
};

export const resolveMostRecentLeaderboardEntryKey = (
  entries: readonly LeaderboardScoreEntry[],
): string | null => {
  if (entries.length === 0) {
    return null;
  }

  let mostRecent = entries[0];
  let mostRecentTimestamp = Date.parse(entries[0].createdAt);

  for (let index = 1; index < entries.length; index += 1) {
    const entry = entries[index];
    const entryTimestamp = Date.parse(entry.createdAt);
    const hasValidEntryTimestamp = Number.isFinite(entryTimestamp);
    const hasValidMostRecentTimestamp = Number.isFinite(mostRecentTimestamp);

    if (
      (hasValidEntryTimestamp && !hasValidMostRecentTimestamp)
      || (hasValidEntryTimestamp && hasValidMostRecentTimestamp && entryTimestamp > mostRecentTimestamp)
      || (!hasValidEntryTimestamp && !hasValidMostRecentTimestamp && entry.createdAt > mostRecent.createdAt)
    ) {
      mostRecent = entry;
      mostRecentTimestamp = entryTimestamp;
    }
  }

  return createLeaderboardEntryKey(mostRecent);
};
