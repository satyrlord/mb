import { access, readFile } from "node:fs/promises";

import Database from "better-sqlite3";

const DEFAULT_MAX_STORED_ENTRIES = 100;
// Numeric 0/1 flags are intentional — these values are persisted in the SQLite meta table
// and must remain stable across releases. See the IMPORTANT comment below on migration state,
// and see the "Legacy JSON to SQLite migration" section in docs/runtime-config.md for migration documentation.
const MIGRATION_INCOMPLETE_FLAG = 0;
const MIGRATION_COMPLETE_FLAG = 1;
// IMPORTANT: This persisted migration state (both the key and flag values) must remain
// stable across releases. Changing LEGACY_MIGRATION_STATE_KEY or changing how
// MIGRATION_INCOMPLETE_FLAG / MIGRATION_COMPLETE_FLAG are interpreted or valued will
// cause the legacy JSON → SQLite leaderboard migration to run again for users who have
// already been migrated, which can duplicate or reset stored leaderboard data.
// Only change this key or these flag values as part of a deliberate, one-time migration
// plan (for example, after intentionally discarding all previous leaderboard data). If
// you do change them, also update docs/runtime-config.md to describe the new behavior
// and rationale.
const LEGACY_MIGRATION_STATE_KEY = "legacy-json-migration-complete";
// Identity strings average ~100-200 bytes each (concatenation of ~11 fields). At this
// threshold the in-memory Set reaches roughly 10_000 × BYTES_PER_ENTRY_ESTIMATE bytes ≈ 1.4 MB — acceptable
// as a one-time migration cost, but worth warning operators who have configured
// non-default retention limits. Adjust BYTES_PER_ENTRY_ESTIMATE if the identity
// string fields change significantly.
const MIGRATION_MEMORY_WARNING_THRESHOLD = 10_000;
// Number of fields joined in createEntryIdentity. Must stay in sync with that
// function's array literal; the assertion inside it enforces this at runtime.
const IDENTITY_FIELD_COUNT = 11;
const BYTES_PER_ENTRY_ESTIMATE = 150; // based on IDENTITY_FIELD_COUNT fields — update if fields change
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const DECIMAL_PRECISION_FACTOR = 10;

/**
 * Estimates the peak memory cost (in MB) of holding one identity string per
 * entry during the one-time legacy-JSON migration deduplication pass.
 *
 * @param {number} entryCount - Number of entries to estimate for.
 * @returns {number} Estimated memory usage in MB, rounded to one decimal place.
 */
const estimateMigrationMemoryMb = (entryCount) =>
  Math.round(
    (entryCount * BYTES_PER_ENTRY_ESTIMATE / BYTES_PER_KB / KB_PER_MB)
      * DECIMAL_PRECISION_FACTOR,
  ) / DECIMAL_PRECISION_FACTOR;

const SQL_CREATE_SCORES_TABLE = `
  CREATE TABLE IF NOT EXISTS leaderboard_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    difficulty_id TEXT NOT NULL,
    difficulty_label TEXT NOT NULL,
    emoji_set_id TEXT NOT NULL,
    emoji_set_label TEXT NOT NULL,
    score_multiplier REAL NOT NULL,
    score_value INTEGER NOT NULL,
    is_auto_demo INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`;

const SQL_CREATE_SCORES_INDEX = `
  CREATE INDEX IF NOT EXISTS leaderboard_scores_recent_idx
  ON leaderboard_scores (created_at DESC, id DESC);
`;

const SQL_CREATE_META_TABLE = `
  CREATE TABLE IF NOT EXISTS leaderboard_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT NOT NULL
  );
`;

/**
 * Builds a standardised WAL warning message by prepending a caller-supplied
 * context string to the shared troubleshooting guidance. Centralises message
 * construction so wording stays consistent across both warn paths (mode
 * detection failure and pragma exception).
 *
 * @param {string} context - Sentence(s) describing the specific failure.
 * @returns {string} Full console.warn message.
 */
const buildWalWarning = (context) =>
  [
    `[MEMORYBLOX] ${context}`,
    "Verify write permissions for the database file and parent directory so WAL mode can be enabled.",
    "Confirm the filesystem supports WAL (avoid read-only and some network mounts), and check that your SQLite/better-sqlite3 build supports WAL mode.",
    "If needed, see SQLite WAL documentation: https://sqlite.org/wal.html",
  ].join("\n");

const fileExists = async (path) => {
  try {
    // Called with no mode argument, so access() checks only for the file's
    // existence (F_OK). It does NOT check read or write permissions — despite
    // the name, this is purely an existence probe.
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const mapRowToEntry = (row) => {
  return {
    playerName: String(row.player_name),
    timeMs: Number(row.time_ms),
    attempts: Number(row.attempts),
    difficultyId: String(row.difficulty_id),
    difficultyLabel: String(row.difficulty_label),
    emojiSetId: String(row.emoji_set_id),
    emojiSetLabel: String(row.emoji_set_label),
    scoreMultiplier: Number(row.score_multiplier),
    scoreValue: Number(row.score_value),
    isAutoDemo: Number(row.is_auto_demo) === 1,
    createdAt: String(row.created_at),
  };
};

// NOTE: If you add, remove, or reorder fields here, update IDENTITY_FIELD_COUNT
// and BYTES_PER_ENTRY_ESTIMATE above. The runtime assertion below will catch any
// mismatch between the array length and IDENTITY_FIELD_COUNT immediately.
// The threshold value itself may also need revisiting if individual field lengths
// change materially.
const createEntryIdentity = (entry) => {
  const fields = [
    entry.playerName,
    String(entry.timeMs),
    String(entry.attempts),
    entry.difficultyId,
    entry.difficultyLabel,
    entry.emojiSetId,
    entry.emojiSetLabel,
    String(entry.scoreMultiplier),
    String(entry.scoreValue),
    String(entry.isAutoDemo === true),
    entry.createdAt,
  ];
  if (fields.length !== IDENTITY_FIELD_COUNT) {
    throw new Error(
      `createEntryIdentity field count mismatch: expected ${IDENTITY_FIELD_COUNT}, got ${fields.length}. ` +
      "Update IDENTITY_FIELD_COUNT and BYTES_PER_ENTRY_ESTIMATE to match.",
    );
  }
  return fields.join("|");
};

export class SqliteLeaderboardStore {
  constructor(options) {
    if (options == null || typeof options !== "object") {
      throw new Error(
        "SqliteLeaderboardStore requires an options object with a non-empty 'databasePath' string.",
      );
    }

    const { databasePath, maxStoredEntries = DEFAULT_MAX_STORED_ENTRIES } = options;

    if (typeof databasePath !== "string" || databasePath.trim() === "") {
      throw new Error(
        "SqliteLeaderboardStore requires a non-empty string 'databasePath' in the options object.",
      );
    }
    this.databasePath = databasePath;
    this.maxStoredEntries = maxStoredEntries;
    try {
      this.database = new Database(databasePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to open SQLite database at path "${databasePath}": ${errorMessage}. ` +
          "This often indicates that the parent directory does not exist, the process lacks read/write file permissions, or the filesystem is read-only. " +
          "Verify that the directory exists and that the process has sufficient permissions to create and modify the database file.",
        { cause: error },
      );
    }
    // cachedMigrationComplete is set to its definitive value at the end of
    // the constructor once all prepared statements are ready.
    this.cachedMigrationComplete = false;

    this.database.exec(SQL_CREATE_SCORES_TABLE);
    this.database.exec(SQL_CREATE_SCORES_INDEX);
    this.database.exec(SQL_CREATE_META_TABLE);

    this.readTopEntriesStatement = this.database.prepare(`
      SELECT
        player_name,
        time_ms,
        attempts,
        difficulty_id,
        difficulty_label,
        emoji_set_id,
        emoji_set_label,
        score_multiplier,
        score_value,
        is_auto_demo,
        created_at
      FROM leaderboard_scores
      ORDER BY created_at DESC, id DESC
      LIMIT ?;
    `);
    // Full table scan — only used during legacy migration to build the duplicate
    // identity set. Not called during normal read/write operations.
    this.readAllEntriesStatement = this.database.prepare(`
      SELECT
        player_name,
        time_ms,
        attempts,
        difficulty_id,
        difficulty_label,
        emoji_set_id,
        emoji_set_label,
        score_multiplier,
        score_value,
        is_auto_demo,
        created_at
      FROM leaderboard_scores;
    `);
    this.getMigrationStateStatement = this.database.prepare(`
      SELECT meta_value
      FROM leaderboard_meta
      WHERE meta_key = ?;
    `);
    this.setMigrationStateStatement = this.database.prepare(`
      INSERT INTO leaderboard_meta (meta_key, meta_value)
      VALUES (?, ?)
      ON CONFLICT(meta_key) DO UPDATE SET meta_value = excluded.meta_value;
    `);
    this.insertEntryStatement = this.database.prepare(`
      INSERT INTO leaderboard_scores (
        player_name,
        time_ms,
        attempts,
        difficulty_id,
        difficulty_label,
        emoji_set_id,
        emoji_set_label,
        score_multiplier,
        score_value,
        is_auto_demo,
        created_at
      ) VALUES (
        :player_name,
        :time_ms,
        :attempts,
        :difficulty_id,
        :difficulty_label,
        :emoji_set_id,
        :emoji_set_label,
        :score_multiplier,
        :score_value,
        :is_auto_demo,
        :created_at
      );
    `);
    // Named parameters above keep column order and #insertEntry's object
    // keys in sync automatically — no separate positional alignment needed.

    this.trimEntriesStatement = this.database.prepare(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY created_at DESC, id DESC
          ) AS rank
        FROM leaderboard_scores
      )
      DELETE FROM leaderboard_scores
      WHERE id IN (
        SELECT id FROM ranked WHERE rank > ?
      );
    `);

    // Pre-populate the cached migration flag synchronously. better-sqlite3's
    // synchronous API makes this safe without async. All subsequent calls to
    // migrateFromLegacyJson skip the DB query via this cached value.
    // Note: meta_value is stored as TEXT in SQLite (e.g. '1' instead of 1).
    // getMigrationState() normalizes this by calling Number() and handling NaN,
    // so the strict equality check against MIGRATION_COMPLETE_FLAG (numeric 1)
    // here is reliable.
    this.cachedMigrationComplete = this.getMigrationState() === MIGRATION_COMPLETE_FLAG;

    this.configureWalMode();
  }

  getMigrationState() {
    const row = this.getMigrationStateStatement.get(LEGACY_MIGRATION_STATE_KEY);
    const rawValue = row?.meta_value;

    const numericValue =
      rawValue == null
        ? MIGRATION_INCOMPLETE_FLAG
        : Number(rawValue);

    return Number.isNaN(numericValue) ? MIGRATION_INCOMPLETE_FLAG : numericValue;
  }
  getStorageKind() {
    return "sqlite";
  }

  configureWalMode() {
    try {
      // { simple: true } makes pragma() return the scalar value directly (a string
      // for journal_mode) rather than wrapping it in a single-row result object.
      const effectiveJournalMode = this.database.pragma("journal_mode = WAL", { simple: true });

      if (typeof effectiveJournalMode !== "string" || effectiveJournalMode.toLowerCase() !== "wal") {
        const effectiveModeDescription =
          typeof effectiveJournalMode === "string" ? effectiveJournalMode : "unknown";

        console.warn(
          buildWalWarning(
            `SQLite WAL (Write-Ahead Logging) mode was requested via `
              + `database.pragma('journal_mode = WAL') `
              + `for database '${this.databasePath}', but the resulting journal mode is `
              + `'${effectiveModeDescription}' `
              + "(expected 'wal' for better write performance and crash safety). "
              + "The leaderboard will still work, but saving scores may be slower or block concurrent reads.",
          ),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "Failed to configure SQLite journal mode via database.pragma('journal_mode = WAL') (unknown error object).";
      console.warn(
        buildWalWarning(
          "Unable to enable SQLite WAL (Write-Ahead Logging) mode. "
            + "The leaderboard will fall back to SQLite's default journal mode, which is safe but may be slower for writes. "
            + `Details: ${message}`,
        ),
      );
    }
  }

  getStorageLocation() {
    return this.databasePath;
  }

  /**
   * Close the underlying SQLite database connection and release all file locks.
   *
   * After calling this method the store is no longer usable. This is primarily
   * intended for test teardown and graceful process shutdown — production code
   * typically lets the process exit naturally instead.
   */
  close() {
    this.database.close();
  }

  /**
   * Executes the pre-compiled INSERT statement for a single normalised leaderboard
   * entry. Centralises the parameter mapping so both {@link writeEntry} and
   * the migration transaction stay consistent without duplicating the argument
   * list.
   *
   * @param {Object} entry - Normalised leaderboard entry to persist.
   * @param {string} entry.playerName - Display name of the player.
   * @param {number} entry.timeMs - Completion time for the run in milliseconds.
   * @param {number} entry.attempts - Number of attempts taken for the run.
   * @param {string} entry.difficultyId - Stable identifier for the difficulty level.
   * @param {string} entry.difficultyLabel - Human-readable label for the difficulty level.
   * @param {string} entry.emojiSetId - Stable identifier for the emoji set used.
   * @param {string} entry.emojiSetLabel - Human-readable label for the emoji set used.
   * @param {number} entry.scoreMultiplier - Multiplier applied when calculating the score.
   * @param {number} entry.scoreValue - Final calculated score value.
   * @param {boolean} entry.isAutoDemo - Whether the run was an automatic demo run.
   * @param {string} entry.createdAt - ISO-8601 timestamp string when the entry was created.
   */
  #insertEntry(entry) {
    this.insertEntryStatement.run({
      player_name: entry.playerName,
      time_ms: entry.timeMs,
      attempts: entry.attempts,
      difficulty_id: entry.difficultyId,
      difficulty_label: entry.difficultyLabel,
      emoji_set_id: entry.emojiSetId,
      emoji_set_label: entry.emojiSetLabel,
      score_multiplier: entry.scoreMultiplier,
      score_value: entry.scoreValue,
      is_auto_demo: entry.isAutoDemo ? 1 : 0,
      created_at: entry.createdAt,
    });
  }

  readEntries(limit) {
    return this.readTopEntriesStatement.all(limit).map((row) => mapRowToEntry(row));
  }

  writeEntry(entry) {
    this.#insertEntry(entry);
    this.trimEntriesStatement.run(this.maxStoredEntries);
  }

  /**
   * Perform a one-time migration of leaderboard data from the legacy JSON file
   * into the SQLite-backed store.
   *
   * The migration flow is:
   * 1. Consult the in-memory cache (`cachedMigrationComplete`) and, if needed,
   *    the persisted migration state row keyed by {@link LEGACY_MIGRATION_STATE_KEY}
   *    to determine whether migration has already been completed. If the state is
   *    marked as complete, or if the legacy JSON file does not exist, the method
   *    returns without modifying the database.
   * 2. Read and parse the legacy JSON file at `legacyPath`, extracting the
   *    `entries` array if present.
   * 3. For each raw legacy entry, call the provided `parseEntry` callback with
   *    `{ allowCreatedAt: true }` to normalize it into the current leaderboard
   *    entry shape, ignoring any entries that cannot be parsed.
   * 4. Load all existing SQLite entries, build an identity set using
   *    {@link createEntryIdentity}, and filter out any normalized legacy entries
   *    that would duplicate existing ones.
   * 5. In a single transaction, insert all non-duplicate entries, trim the table
   *    to `maxStoredEntries`, update the persisted migration state value for
   *    {@link LEGACY_MIGRATION_STATE_KEY} to {@link MIGRATION_COMPLETE_FLAG}, and
   *    set `cachedMigrationComplete` to `true` so subsequent calls are no-ops.
   *
   * The migration state flag (stored under `LEGACY_MIGRATION_STATE_KEY`) is a
   * durable indicator of whether the legacy JSON → SQLite migration has already
   * run for this database. `MIGRATION_INCOMPLETE_FLAG` and
   * `MIGRATION_COMPLETE_FLAG` are persisted numeric values that must remain stable
   * across releases; changing them will cause the migration to run again and may
   * duplicate or reset leaderboard data.
   *
   * @template TEntry
   * @param {string} legacyPath - Absolute or relative filesystem path to the legacy
   *   JSON leaderboard file to migrate from.
   * @param {(entry: unknown, options: {allowCreatedAt: boolean}) => TEntry} parseEntry -
   *   Callback that converts a raw legacy entry object into a normalized leaderboard
   *   entry. It should throw for invalid data; such entries are skipped during
   *   migration. The migration always passes `{ allowCreatedAt: true }` as the
   *   options argument.
   * @returns {Promise<number>} Resolves to the number of legacy entries that were
   *   successfully inserted into the SQLite store during this call.
   */
  async migrateFromLegacyJson(legacyPath, parseEntry) {
    if (this.cachedMigrationComplete) {
      return 0;
    }

    if (!(await fileExists(legacyPath))) {
      return 0;
    }

    const raw = await readFile(legacyPath, "utf-8");
    const parsed = JSON.parse(raw);
    const legacyEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const normalizedEntries = legacyEntries
      .map((entry) => {
        try {
          return parseEntry(entry, { allowCreatedAt: true });
        } catch {
          return null;
        }
      })
      .filter((entry) => entry !== null);

    // Build an identity set to detect duplicates. Rows are streamed via iterate()
    // to avoid materialising full row objects, but each identity string is held in
    // the Set for the duration of the migration. At the default retention limit
    // (100 entries) memory pressure is negligible; warn operators whose configuration
    // exceeds MIGRATION_MEMORY_WARNING_THRESHOLD so they can evaluate the trade-off.
    // NOTE: A SQL-based duplicate check (UNIQUE constraint or SELECT EXISTS) would
    // avoid loading all entries into memory and be more efficient for very large
    // datasets. The in-memory Set is used here to keep this one-time migration
    // simple and avoid a schema migration on existing databases. Revisit if
    // retention limits grow significantly beyond the default of 100 entries.
    if (this.maxStoredEntries > MIGRATION_MEMORY_WARNING_THRESHOLD) {
      const estimatedMb = estimateMigrationMemoryMb(this.maxStoredEntries);
      console.warn(
        `[MEMORYBLOX] maxStoredEntries is set to ${this.maxStoredEntries}. ` +
        `The one-time legacy migration will hold an identity string for every existing row in memory ` +
        `(~${estimatedMb} MB estimated at ${BYTES_PER_ENTRY_ESTIMATE} bytes/entry). ` +
        `This is informational only — the migration will proceed normally unless memory is exhausted. ` +
        `If you need to rerun this migration (or run it in another environment), ` +
        `configure a lower retention limit in the server configuration beforehand, ` +
        `or run the migration on a machine with sufficient memory.`,
      );
    }
    const existingIdentitySet = new Set();
    for (const row of this.readAllEntriesStatement.iterate()) {
      existingIdentitySet.add(createEntryIdentity(mapRowToEntry(row)));
    }

    const entriesToInsert = [];

    for (const entry of normalizedEntries) {
      const identity = createEntryIdentity(entry);

      if (existingIdentitySet.has(identity)) {
        continue;
      }

      existingIdentitySet.add(identity);
      entriesToInsert.push(entry);
    }

    const migrateAndTrimTransaction = this.database.transaction((entries) => {
      try {
        for (const entry of entries) {
          this.#insertEntry(entry);
        }

        this.trimEntriesStatement.run(this.maxStoredEntries);

        this.setMigrationStateStatement.run(
          LEGACY_MIGRATION_STATE_KEY,
          String(MIGRATION_COMPLETE_FLAG),
        );
      } catch (error) {
        const message =
          "[MEMORYBLOX] Legacy JSON → SQLite migration transaction failed. "
          + `Inserted entries may have been rolled back. Original error: ${
            error instanceof Error ? error.message : String(error)
          }`;
        throw new Error(message, { cause: error });
      }
    });

    migrateAndTrimTransaction(entriesToInsert);
    this.cachedMigrationComplete = true;
    return entriesToInsert.length;
  }
}
