// @vitest-environment node

import { copyFile, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import upgradeFixture from "./fixtures/leaderboard-v12.json";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// @ts-expect-error - sqlite-store.mjs is a plain JS runtime file without type declarations
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

const openStore = (databasePath: string, maxStoredEntries = 100) => {
  const store = new SqliteLeaderboardStore({ databasePath, maxStoredEntries });
  openStores.push({ close: () => { if (store.database.open) store.close(); } });
  return store;
};

const createPaths = async () => {
  const dir = await mkdtemp(join(tmpdir(), "mb-sqlite-regression-"));
  tempDirs.push(dir);
  return { databasePath: join(dir, "leaderboard.sqlite3"), legacyPath: join(dir, "legacy.json") };
};

beforeEach(() => {
  // Suppress expected WAL warnings from :memory: databases during tests.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();

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

    const store = openStore(join(dir, "leaderboard.sqlite3"));

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

    const store = openStore(":memory:");

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

    const store = openStore(":memory:");

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

      const store = openStore(":memory:");

      const migratedCount = await store.migrateFromLegacyJson(legacyPath, parseEntryForTest);

      expect(migratedCount).toBe(0);
      expect(store.readEntries(10)).toHaveLength(0);
    }
  });
});

describe("SqliteLeaderboardStore persistence and upgrade", () => {
  test("opens a v12.11.1 database without reimporting legacy JSON or changing fields", async () => {
    const { databasePath, legacyPath } = await createPaths();
    await copyFile(resolve("tests/fixtures/leaderboard-v12.sqlite3"), databasePath);
    await writeFile(legacyPath, JSON.stringify({ entries: [createScoreEntry()] }));
    const store = openStore(databasePath);

    expect(store.readEntries(100)).toEqual([upgradeFixture.entry]);
    expect(store.database.prepare(
      "SELECT meta_value FROM leaderboard_meta WHERE meta_key = ?",
    ).pluck().get("legacy-json-migration-complete")).toBe("1");
    const parse = vi.fn(parseEntryForTest);
    expect(await store.migrateFromLegacyJson(legacyPath, parse)).toBe(0);
    expect(parse).not.toHaveBeenCalled();
    const next = createScoreEntry({ playerName: "After upgrade" });
    store.writeEntry(next);
    expect(store.database.pragma("integrity_check", { simple: true })).toBe("ok");
    store.close();

    expect(openStore(databasePath).readEntries(100)).toEqual([next, upgradeFixture.entry]);
  });

  test.each([false, true])("persists completion across restart (all malformed: %s)", async (malformed) => {
    const { databasePath, legacyPath } = await createPaths();
    const entry = createScoreEntry();
    await writeFile(legacyPath, JSON.stringify({ entries: [malformed ? {} : entry] }));
    const store = openStore(databasePath);
    expect(await store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).toBe(malformed ? 0 : 1);
    store.close();

    // A new, valid row distinguishes persisted completion from deduplication.
    await writeFile(legacyPath, JSON.stringify({ entries: [createScoreEntry({ playerName: "New legacy row" })] }));
    const reopened = openStore(databasePath);
    const parse = vi.fn(parseEntryForTest);
    expect(reopened.getMigrationState()).toBe(1);
    expect(await reopened.migrateFromLegacyJson(legacyPath, parse)).toBe(0);
    expect(parse).not.toHaveBeenCalled();
    expect(reopened.readEntries(100)).toEqual(malformed ? [] : [entry]);
  });

  test("rolls back inserted rows, trimming, and completion together, then permits retry", async () => {
    const { databasePath, legacyPath } = await createPaths();
    const store = openStore(databasePath, 1);
    const original = createScoreEntry({ playerName: "Original", createdAt: "2025-01-01T00:00:00.000Z" });
    const incoming = createScoreEntry({ playerName: "Incoming" });
    store.writeEntry(original);
    await writeFile(legacyPath, JSON.stringify({ entries: [incoming] }));
    // Fail after insertion and retention trimming, using a real SQLite error.
    store.database.exec(`CREATE TRIGGER fail_completion BEFORE INSERT ON leaderboard_meta
      BEGIN SELECT RAISE(ABORT, 'injected metadata failure'); END;`);

    await expect(store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).rejects.toThrow("injected metadata failure");
    expect(store.readEntries(100)).toEqual([original]);
    expect(store.getMigrationState()).toBe(0);
    store.database.exec("DROP TRIGGER fail_completion");
    expect(await store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).toBe(1);
    expect(store.readEntries(100)).toEqual([incoming]);
    store.close();
    expect(openStore(databasePath, 1).getMigrationState()).toBe(1);
  });

  test("deduplicates existing and repeated legacy rows while preserving timestamps", async () => {
    const { databasePath, legacyPath } = await createPaths();
    const store = openStore(databasePath);
    const existing = createScoreEntry();
    const incoming = createScoreEntry({ playerName: "Other", isAutoDemo: true, scoreMultiplier: 2.75 });
    store.writeEntry(existing);
    await writeFile(legacyPath, JSON.stringify({ entries: [existing, incoming, incoming] }));
    expect(await store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).toBe(1);
    expect(store.readEntries(100)).toEqual([incoming, existing]);
  });

  test("retains the most recent rows and resolves equal timestamps by insertion order", () => {
    const store = openStore(":memory:", 2);
    const first = createScoreEntry({ playerName: "First" });
    const second = createScoreEntry({ playerName: "Second" });
    const third = createScoreEntry({ playerName: "Third" });
    for (const entry of [first, second, third]) store.writeEntry(entry);
    store.writeEntry(createScoreEntry({ playerName: "Older", createdAt: "2020-01-01T00:00:00.000Z" }));
    expect(store.readEntries(100)).toEqual([third, second]);
    expect(store.readEntries(1)).toEqual([third]);
  });

  test("missing and invalid JSON leave migration retryable", async () => {
    const { databasePath, legacyPath } = await createPaths();
    const store = openStore(databasePath);
    expect(await store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).toBe(0);
    expect(store.getMigrationState()).toBe(0);
    await writeFile(legacyPath, "{broken");
    await expect(store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).rejects.toThrow();
    expect(store.getMigrationState()).toBe(0);
    const entry = createScoreEntry();
    await writeFile(legacyPath, JSON.stringify({ entries: [entry] }));
    expect(await store.migrateFromLegacyJson(legacyPath, parseEntryForTest)).toBe(1);
    expect(store.readEntries(100)).toEqual([entry]);
  });

  test("recovers committed WAL data after a process exits without closing the store", async () => {
    const { databasePath } = await createPaths();
    const entry = createScoreEntry({ playerName: "WAL recovery" });
    const moduleUrl = pathToFileURL(resolve("tools/leaderboard/sqlite-store.mjs")).href;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import { SqliteLeaderboardStore } from ${JSON.stringify(moduleUrl)};
      const store = new SqliteLeaderboardStore({ databasePath: process.argv[1] });
      if (store.database.pragma('journal_mode', { simple: true }) !== 'wal') process.exit(2);
      store.database.pragma('wal_autocheckpoint = 0');
      store.writeEntry(JSON.parse(process.argv[2]));
      process.exit(0);
    `, databasePath, JSON.stringify(entry)], { encoding: "utf8", timeout: 10_000 });
    expect(child.error).toBeUndefined();
    expect(child.stderr).toBe("");
    expect(child.status).toBe(0);
    expect((await stat(`${databasePath}-wal`)).size).toBeGreaterThan(0);
    const store = openStore(databasePath);
    expect(store.database.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(store.readEntries(100)).toEqual([entry]);
    expect(store.database.pragma("integrity_check", { simple: true })).toBe("ok");
    store.close();
    expect(openStore(databasePath).readEntries(100)).toEqual([entry]);
  });

  test("warns on unsupported WAL and pragma failures while keeping the store usable", () => {
    const store = openStore(":memory:");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("resulting journal mode is 'memory'"));
    const pragma = vi.spyOn(store.database, "pragma").mockImplementation(() => { throw new Error("WAL unavailable"); });
    store.configureWalMode();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("WAL unavailable"));
    pragma.mockRestore();
    const entry = createScoreEntry();
    store.writeEntry(entry);
    expect(store.readEntries(100)).toEqual([entry]);
  });
});
