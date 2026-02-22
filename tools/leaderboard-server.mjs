import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLeaderboardPayloadEntry } from "./leaderboard/entry-schema.mjs";
import { createLeaderboardStore } from "./leaderboard/store-factory.mjs";

const DEFAULT_PORT = 8787;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const parsePortEnv = (rawValue, fallback) => {
  if (typeof rawValue !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue.trim(), 10);

  if (!Number.isFinite(parsed) || parsed < MIN_PORT || parsed > MAX_PORT) {
    return fallback;
  }

  return parsed;
};
const PORT = parsePortEnv(process.env.LEADERBOARD_PORT, DEFAULT_PORT);
const HOST = process.env.LEADERBOARD_HOST ?? "0.0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORAGE_DRIVER = process.env.LEADERBOARD_DB_DRIVER ?? "sqlite";
const DATABASE_FILE_PATH = resolve(__dirname, "../config/leaderboard.db");
const LEGACY_DATA_FILE_PATH = resolve(__dirname, "../config/leaderboard.data.json");
const DEFAULT_MAX_STORED_ENTRIES = 100;
// Leaderboard score payloads are small JSON objects (~a few hundred bytes).
// 1 MB is a generous ceiling that stops malicious clients from exhausting
// server memory with an unbounded body stream.
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

const parsePositiveIntegerEnv = (rawValue, fallback) => {
  if (typeof rawValue !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue.trim(), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const MAX_STORED_ENTRIES = parsePositiveIntegerEnv(
  process.env.LEADERBOARD_RETENTION,
  DEFAULT_MAX_STORED_ENTRIES,
);

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
};

const leaderboardStore = createLeaderboardStore({
  driver: STORAGE_DRIVER,
  databasePath: DATABASE_FILE_PATH,
  maxStoredEntries: MAX_STORED_ENTRIES,
});

const parseRequestBody = async (request) => {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      throw new Error(
        `Request body exceeds the ${MAX_REQUEST_BODY_BYTES / 1024} KB limit. `
          + "Leaderboard score payloads must be compact JSON objects.",
      );
    }

    chunks.push(chunk);
  }

  const bodyText = Buffer.concat(chunks).toString("utf-8");

  if (bodyText.trim().length === 0) {
    throw new Error("Request body is empty. Expected JSON leaderboard score payload.");
  }

  return JSON.parse(bodyText);
};

const migrateLegacyJsonData = async () => {
  try {
    const migratedCount = await leaderboardStore.migrateFromLegacyJson(
      LEGACY_DATA_FILE_PATH,
      parseLeaderboardPayloadEntry,
    );

    if (migratedCount > 0) {
      console.log(`[MEMORYBLOX] Migrated ${migratedCount} legacy scores into ${leaderboardStore.getStorageKind()}.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown migration error.";
    console.warn(`[MEMORYBLOX] Legacy score migration skipped: ${message}`);
  }
};

await migrateLegacyJsonData();

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname !== "/leaderboard") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    if (request.method === "GET") {
      const limitQuery = Number.parseInt(requestUrl.searchParams.get("limit") ?? "10", 10);
      const limit = Number.isFinite(limitQuery) && limitQuery > 0 ? limitQuery : 10;
      const entries = leaderboardStore.readEntries(limit);

      sendJson(response, 200, { entries });
      return;
    }

    if (request.method === "POST") {
      const payload = await parseRequestBody(request);
      const nextEntry = parseLeaderboardPayloadEntry(payload);
      leaderboardStore.writeEntry(nextEntry);
      sendJson(response, 201, { ok: true, entry: nextEntry });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    sendJson(response, 400, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[MEMORYBLOX] Local leaderboard API running at http://${HOST}:${PORT}/leaderboard`);
  console.log(`[MEMORYBLOX] Storage driver: ${leaderboardStore.getStorageKind()}`);
  console.log(`[MEMORYBLOX] Storage location: ${leaderboardStore.getStorageLocation()}`);
  console.log(`[MEMORYBLOX] Retention policy: keeping last ${MAX_STORED_ENTRIES} games.`);
});
