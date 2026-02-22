// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import { SqliteLeaderboardStore } from "../tools/leaderboard/sqlite-store.mjs";

const createScoreEntry = (overrides: Partial<{
  playerName: string;
  timeMs: number;
  attempts: number;
  difficultyId: string;
  difficultyLabel: string;
  emojiSetId: string;
  emojiSetLabel: string;
  scoreMultiplier: number;
  scoreValue: number;
  isAutoDemo: boolean;
  createdAt: string;
}> = {}) => {
  return {
    playerName: "Player",
    timeMs: 12_000,
    attempts: 10,
    difficultyId: "normal",
    difficultyLabel: "Normal",
    emojiSetId: "space-astronomy",
    emojiSetLabel: "Space Astronomy",
    scoreMultiplier: 1.5,
    scoreValue: 68,
    isAutoDemo: false,
    createdAt: "2026-02-21T00:00:00.000Z",
    ...overrides,
  };
};

const parseEntryForTest = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    throw new Error("invalid");
  }

  const record = value as Record<string, unknown>;

  if (typeof record.playerName !== "string" || record.playerName.trim().length === 0) {
    throw new Error("invalid playerName");
  }

  return createScoreEntry({
    ...record,
    playerName: record.playerName,
    timeMs: Number(record.timeMs),
    attempts: Number(record.attempts),
    scoreMultiplier: Number(record.scoreMultiplier),
    scoreValue: Number(record.scoreValue),
    isAutoDemo: record.isAutoDemo === true,
    createdAt: typeof record.createdAt === "string" && record.createdAt.length > 0
      ? record.createdAt
      : "2026-02-21T00:00:00.000Z",
  });
};

const tempDirs: string[] = [];
const openStores: { close: () => void }[] = [];

afterEach(async () => {
  while (openStores.length > 0) {
    openStores.pop()?.close();
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();

    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("SqliteLeaderboardStore migration", () => {
  test("migrates valid legacy entries even when some entries are malformed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mb-sqlite-migration-"));
    tempDirs.push(dir);

    const legacyPath = join(dir, "leaderboard.data.json");

    await writeFile(
      legacyPath,
      JSON.stringify({
        entries: [
          createScoreEntry({
            playerName: "Valid One",
            createdAt: "2026-02-20T22:00:00.000Z",
            scoreValue: 71,
          }),
          // Intentionally malformed legacy entry: missing playerName to verify malformed entry handling.
          // Migration may skip malformed entries like this while still preserving valid entries; this test
          // only verifies that valid entries are migrated and malformed entries are skipped.
          {
            timeMs: 9000,
            attempts: 8,
            difficultyId: "hard",
            difficultyLabel: "Hard",
            emojiSetId: "science-tech",
            emojiSetLabel: "Science & Tech",
            scoreMultiplier: 2,
            scoreValue: 92,
            isAutoDemo: false,
            createdAt: "2026-02-20T22:10:00.000Z",
          },
          createScoreEntry({
            playerName: "Valid Two",
            createdAt: "2026-02-20T22:20:00.000Z",
            scoreValue: 65,
          }),
        ],
      }),
      "utf-8",
    );

    const store = new SqliteLeaderboardStore({
      databasePath: join(dir, "leaderboard.sqlite3"),
      maxStoredEntries: 100,
    });
    openStores.push(store);

    const migratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);

    expect(migratedCount).toBe(2);
    // Explicitly confirm the malformed entry (missing playerName) was excluded:
    // 3 entries were provided in the legacy JSON, only 2 valid ones should be migrated.
    expect(migratedCount).not.toBe(3);

    const scores = store.readEntries(10);
    expect(scores).toHaveLength(2);
    expect(scores.map((entry: ReturnType<typeof createScoreEntry>) => entry.playerName).sort()).toEqual([
      "Valid One",
      "Valid Two",
    ]);
    expect(scores.some((entry: ReturnType<typeof createScoreEntry>) => entry.timeMs === 9000)).toBe(false);
  });

  test("completes migration with zero insertions when all legacy entries are malformed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mb-sqlite-migration-"));
    tempDirs.push(dir);

    const legacyPath = join(dir, "leaderboard.data.json");

    // All entries are intentionally malformed (missing playerName) so the
    // migration should insert nothing while still marking the state flag as complete.
    await writeFile(
      legacyPath,
      JSON.stringify({
        entries: [
          {
            timeMs: 5000,
            attempts: 3,
            difficultyId: "easy",
            difficultyLabel: "Easy",
            emojiSetId: "space-astronomy",
            emojiSetLabel: "Space & Astronomy",
            scoreMultiplier: 1,
            scoreValue: 80,
            isAutoDemo: false,
            createdAt: "2026-02-20T10:00:00.000Z",
          },
          {
            timeMs: 8000,
            attempts: 6,
            difficultyId: "normal",
            difficultyLabel: "Normal",
            emojiSetId: "space-astronomy",
            emojiSetLabel: "Space & Astronomy",
            scoreMultiplier: 1.5,
            scoreValue: 60,
            isAutoDemo: false,
            createdAt: "2026-02-20T11:00:00.000Z",
          },
        ],
      }),
      "utf-8",
    );

    const store = new SqliteLeaderboardStore({
      databasePath: ":memory:",
      maxStoredEntries: 100,
    });

    const migratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);

    // No valid entries — migration count must be zero.
    expect(migratedCount).toBe(0);
    // The store should be empty.
    expect(store.readEntries(10)).toHaveLength(0);
    // State flag must be marked complete so the migration is not re-attempted.
    const secondMigratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);
    expect(secondMigratedCount).toBe(0);
    expect(store.readEntries(10)).toHaveLength(0);
  });

  test("skips migration when migration state is already complete", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mb-sqlite-migration-"));
    tempDirs.push(dir);

    const legacyPath = join(dir, "leaderboard.data.json");
    await writeFile(
      legacyPath,
      JSON.stringify({
        entries: [
          createScoreEntry({
            playerName: "Test Player",
            createdAt: "2026-02-20T22:00:00.000Z",
            scoreValue: 100,
          }),
        ],
      }),
      "utf-8",
    );

    const store = new SqliteLeaderboardStore({
      databasePath: ":memory:",
      maxStoredEntries: 100,
    });

    // First migration
    const firstMigratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);
    expect(firstMigratedCount).toBe(1);

    // Second migration should return 0 since state is already complete
    const secondMigratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);
    expect(secondMigratedCount).toBe(0);

    // Verify entries were only migrated once
    const scores = store.readEntries(10);
    expect(scores).toHaveLength(1);
    expect(scores[0].playerName).toBe("Test Player");
  });

  test("treats non-array entries field as empty during migration", async () => {
    for (const invalidEntries of [null, "invalid", 42, {}]) {
      const dir = await mkdtemp(join(tmpdir(), "mb-sqlite-migration-"));
      tempDirs.push(dir);

      const legacyPath = join(dir, "leaderboard.data.json");
      await writeFile(legacyPath, JSON.stringify({ entries: invalidEntries }), "utf-8");

      const store = new SqliteLeaderboardStore({
        databasePath: ":memory:",
        maxStoredEntries: 100,
      });

      const migratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);

      expect(migratedCount).toBe(0);
      expect(store.readEntries(10)).toHaveLength(0);
    }
  });
});
