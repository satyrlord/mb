import { describe, expect, it } from "vitest";
import type { LeaderboardScoreEntry } from "../src/leaderboard.ts";
import {
  createLeaderboardEntryKey,
  createLeaderboardSubmissionIdentity,
  resolveLastSubmittedLeaderboardEntryKey,
  resolveMostRecentLeaderboardEntryKey,
} from "../src/leaderboard-view.ts";

const makeEntry = (overrides: Partial<LeaderboardScoreEntry> = {}): LeaderboardScoreEntry => ({
  playerName: "Player",
  timeMs: 5000,
  attempts: 10,
  difficultyId: "normal",
  difficultyLabel: "Normal",
  emojiSetId: "classic",
  emojiSetLabel: "Classic",
  scoreMultiplier: 1,
  scoreValue: 100,
  isAutoDemo: false,
  createdAt: "2025-01-15T12:00:00.000Z",
  ...overrides,
});

describe("createLeaderboardEntryKey", () => {
  it("returns deterministic JSON string for entry", () => {
    const entry = makeEntry();
    const key1 = createLeaderboardEntryKey(entry);
    const key2 = createLeaderboardEntryKey(entry);
    expect(key1).toBe(key2);
    expect(typeof key1).toBe("string");
  });

  it("produces different keys for entries with different fields", () => {
    const a = createLeaderboardEntryKey(makeEntry({ playerName: "Alice" }));
    const b = createLeaderboardEntryKey(makeEntry({ playerName: "Bob" }));
    expect(a).not.toBe(b);
  });
});

describe("createLeaderboardSubmissionIdentity", () => {
  it("produces identity string excluding createdAt", () => {
    const entry = makeEntry();
    const identity = createLeaderboardSubmissionIdentity(entry);
    expect(identity).not.toContain(entry.createdAt);
    expect(identity).toContain(entry.playerName);
  });

  it("matches entries with same data but different createdAt", () => {
    const a = createLeaderboardSubmissionIdentity(makeEntry({ createdAt: "2025-01-01T00:00:00Z" }));
    const b = createLeaderboardSubmissionIdentity(makeEntry({ createdAt: "2025-06-01T00:00:00Z" }));
    expect(a).toBe(b);
  });
});

describe("resolveLastSubmittedLeaderboardEntryKey", () => {
  it("returns null when no entries match", () => {
    const entries = [makeEntry({ playerName: "Other" })];
    const submitted = makeEntry({ playerName: "Player" });
    expect(resolveLastSubmittedLeaderboardEntryKey(entries, submitted)).toBeNull();
  });

  it("returns key of matching entry", () => {
    const entry = makeEntry();
    const result = resolveLastSubmittedLeaderboardEntryKey([entry], entry);
    expect(result).toBe(createLeaderboardEntryKey(entry));
  });

  it("returns most recent match when multiple entries match", () => {
    const older = makeEntry({ createdAt: "2025-01-01T00:00:00Z" });
    const newer = makeEntry({ createdAt: "2025-06-01T00:00:00Z" });
    const result = resolveLastSubmittedLeaderboardEntryKey([older, newer], older);
    expect(result).toBe(createLeaderboardEntryKey(newer));
  });

  it("handles entries with invalid timestamps via string comparison", () => {
    const a = makeEntry({ createdAt: "zzz-invalid" });
    const b = makeEntry({ createdAt: "aaa-invalid" });
    const result = resolveLastSubmittedLeaderboardEntryKey([a, b], a);
    expect(result).toBe(createLeaderboardEntryKey(a));
  });

  it("returns null for empty entries", () => {
    expect(resolveLastSubmittedLeaderboardEntryKey([], makeEntry())).toBeNull();
  });
});

describe("resolveMostRecentLeaderboardEntryKey", () => {
  it("returns null for empty array", () => {
    expect(resolveMostRecentLeaderboardEntryKey([])).toBeNull();
  });

  it("returns key of the only entry", () => {
    const entry = makeEntry();
    expect(resolveMostRecentLeaderboardEntryKey([entry])).toBe(createLeaderboardEntryKey(entry));
  });

  it("returns most recent entry by timestamp", () => {
    const older = makeEntry({ createdAt: "2025-01-01T00:00:00Z", playerName: "Old" });
    const newer = makeEntry({ createdAt: "2025-06-01T00:00:00Z", playerName: "New" });
    expect(resolveMostRecentLeaderboardEntryKey([older, newer])).toBe(createLeaderboardEntryKey(newer));
  });

  it("prefers valid timestamp over invalid", () => {
    const valid = makeEntry({ createdAt: "2025-01-01T00:00:00Z", playerName: "Valid" });
    const invalid = makeEntry({ createdAt: "not-a-date", playerName: "Invalid" });
    expect(resolveMostRecentLeaderboardEntryKey([invalid, valid])).toBe(createLeaderboardEntryKey(valid));
  });

  it("uses string comparison when both timestamps are invalid", () => {
    const a = makeEntry({ createdAt: "zzz", playerName: "A" });
    const b = makeEntry({ createdAt: "aaa", playerName: "B" });
    expect(resolveMostRecentLeaderboardEntryKey([b, a])).toBe(createLeaderboardEntryKey(a));
  });
});
