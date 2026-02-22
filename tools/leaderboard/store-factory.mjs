import { SqliteLeaderboardStore } from "./sqlite-store.mjs";

/**
 * @typedef {Object} LeaderboardStoreOptions
 * @property {string} [driver="sqlite"] - Storage driver identifier. Currently only `"sqlite"` is supported.
 * @property {string} databasePath - Filesystem path to the SQLite database file.
 * @property {number} [maxStoredEntries] - Optional maximum number of leaderboard entries to keep.
 */

/**
 * Create a leaderboard store instance based on the provided options.
 *
 * @param {LeaderboardStoreOptions} options - Configuration for the leaderboard store.
 * @returns {SqliteLeaderboardStore} A leaderboard store instance for the configured driver.
 */
export const createLeaderboardStore = (options) => {
  const { driver = "sqlite" } = options;

  if (driver === "sqlite") {
    return new SqliteLeaderboardStore(options);
  }

  throw new Error(`Unsupported leaderboard storage driver: ${driver}`);
};
