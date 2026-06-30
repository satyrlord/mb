# Development Tools and Utilities

<cite>
**Referenced Files in This Document**
- [generate-icon-packs.ts](file://tools/generate-icon-packs.ts)
- [generate-audio-indexes.mjs](file://tools/generate-audio-indexes.mjs)
- [sync-icon-artifacts.mjs](file://tools/sync-icon-artifacts.mjs)
- [validate-config.sh](file://tools/validate-config.sh)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [store-factory.mjs](file://tools/leaderboard/store-factory.mjs)
- [icon-pack-generator.json](file://config/icon-pack-generator.json)
- [audio-formats.json](file://config/audio-formats.json)
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [vitest.config.ts](file://vitest.config.ts)
- [eslint.config.mjs](file://eslint.config.mjs)
- [playwright.config.ts](file://playwright.config.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the development tools and utilities that power build automation, asset generation, and maintenance tasks for the project. It covers:
- A TypeScript-based icon pack generator that selects and downloads SVG assets, builds catalogs, and generates attribution records.
- An audio asset indexing script that scans audio directories and produces index files.
- A configuration validator shell script that enforces file presence, syntax, required keys, and absence of deprecated keys.
- A leaderboard utility stack including a lightweight HTTP server, schema validation, and a SQLite-backed store with migration support.
- The asset synchronization pipeline that keeps documentation and catalogs in sync with the canonical icon definitions.
- Automated testing utilities and deployment preparation scripts integrated with the build pipeline.
- Practical usage examples, extension guidance, and troubleshooting tips for tooling.

## Project Structure
The development toolchain is organized under the tools/ directory with supporting configuration files in config/. Scripts are wired into the project’s npm scripts for easy invocation.

```mermaid
graph TB
subgraph "Tools"
GIP["tools/generate-icon-packs.ts"]
GAI["tools/generate-audio-indexes.mjs"]
SIA["tools/sync-icon-artifacts.mjs"]
VCFG["tools/validate-config.sh"]
LBS["tools/leaderboard-server.mjs"]
LBSCH["tools/leaderboard/entry-schema.mjs"]
LBSQL["tools/leaderboard/sqlite-store.mjs"]
LBSF["tools/leaderboard/store-factory.mjs"]
end
subgraph "Configs"
CFG1["config/icon-pack-generator.json"]
CFG2["config/audio-formats.json"]
end
subgraph "Build & Test"
PKG["package.json"]
VITE["vite.config.ts"]
VITEST["vitest.config.ts"]
ESLINT["eslint.config.mjs"]
PW["playwright.config.ts"]
end
GIP --- CFG1
GAI --- CFG2
SIA --> GIP
LBS --> LBSCH
LBS --> LBSF
LBSF --> LBSQL
PKG --> GIP
PKG --> GAI
PKG --> SIA
PKG --> LBS
VITE --> |"Dev server and asset bundling"| PKG
VITEST --> |"Unit tests"| PKG
ESLINT --> |"Linting"| PKG
PW --> |"E2E tests"| PKG
```

**Diagram sources**
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)
- [validate-config.sh:1-129](file://tools/validate-config.sh#L1-L129)
- [leaderboard-server.mjs:1-161](file://tools/leaderboard-server.mjs#L1-L161)
- [entry-schema.mjs:1-91](file://tools/leaderboard/entry-schema.mjs#L1-L91)
- [sqlite-store.mjs:1-531](file://tools/leaderboard/sqlite-store.mjs#L1-L531)
- [store-factory.mjs:1-25](file://tools/leaderboard/store-factory.mjs#L1-L25)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)
- [package.json:1-1](file://package.json#L1-L1)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [vitest.config.ts:1-31](file://vitest.config.ts#L1-L31)
- [eslint.config.mjs:1-49](file://eslint.config.mjs#L1-L49)
- [playwright.config.ts:1-51](file://playwright.config.ts#L1-L51)

**Section sources**
- [package.json:1-1](file://package.json#L1-L1)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [eslint.config.mjs:1-49](file://eslint.config.mjs#L1-L49)
- [vitest.config.ts:1-31](file://vitest.config.ts#L1-L31)
- [playwright.config.ts:1-51](file://playwright.config.ts#L1-L51)

## Core Components
- Icon Pack Generator (TypeScript): Selects emoji and SVG assets based on keyword matching, applies configurable ratios, optionally downloads SVGs, and emits generated packs, attribution CSV, and asset registry.
- Audio Index Generator (Node.js): Scans audio directories and writes index.json files based on a configured set of extensions.
- Icon Artifacts Sync (Node.js): Reads the canonical icon definitions, writes a catalog JSON, and generates an inventory Markdown for documentation.
- Config Validator (Shell): Enforces presence of required files, key-value syntax, required keys per file, and absence of deprecated keys.
- Leaderboard Server (HTTP + SQLite): Provides GET/POST endpoints for leaderboard entries, validates payloads, persists to SQLite with retention trimming, and supports legacy JSON migration.
- Build/Test Tooling: Vite dev server and asset bundling, ESLint for TypeScript and tools, Vitest for unit tests, and Playwright for E2E mobile tests.

**Section sources**
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)
- [validate-config.sh:1-129](file://tools/validate-config.sh#L1-L129)
- [leaderboard-server.mjs:1-161](file://tools/leaderboard-server.mjs#L1-L161)
- [sqlite-store.mjs:1-531](file://tools/leaderboard/sqlite-store.mjs#L1-L531)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [eslint.config.mjs:1-49](file://eslint.config.mjs#L1-L49)
- [vitest.config.ts:1-31](file://vitest.config.ts#L1-L31)
- [playwright.config.ts:1-51](file://playwright.config.ts#L1-L51)

## Architecture Overview
The toolchain integrates with the main application via:
- Vite dev server middleware serving SVG assets from the icon/ directory.
- Build pipeline invoking artifact generation scripts before bundling.
- Testing utilities that exclude tools from coverage and focus on application code.

```mermaid
graph TB
Dev["Developer CLI"] --> NPM["npm scripts in package.json"]
NPM --> ART["Artifacts: audio index + icon sync + icon packs"]
ART --> VITE["Vite dev server"]
VITE --> APP["Application runtime"]
subgraph "Leaderboard"
LBS["leaderboard-server.mjs"] --> LBSCH["entry-schema.mjs"]
LBS --> LBSF["store-factory.mjs"]
LBSF --> LBSQL["sqlite-store.mjs"]
end
subgraph "Configs"
CFG1["icon-pack-generator.json"]
CFG2["audio-formats.json"]
end
GIP["generate-icon-packs.ts"] --- CFG1
GAI["generate-audio-indexes.mjs"] --- CFG2
```

**Diagram sources**
- [package.json:1-1](file://package.json#L1-L1)
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [leaderboard-server.mjs:1-161](file://tools/leaderboard-server.mjs#L1-L161)
- [entry-schema.mjs:1-91](file://tools/leaderboard/entry-schema.mjs#L1-L91)
- [store-factory.mjs:1-25](file://tools/leaderboard/store-factory.mjs#L1-L25)
- [sqlite-store.mjs:1-531](file://tools/leaderboard/sqlite-store.mjs#L1-L531)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)

## Detailed Component Analysis

### Icon Pack Generator (TypeScript)
Responsibilities:
- Parse CLI options (--config, --seed).
- Load generator configuration and validate ratios and counts.
- Fetch metadata from remote sources and build candidate lists weighted by keyword matches and source priority.
- Randomly select emoji and SVG assets respecting quotas and uniqueness.
- Optionally download SVGs, generate attribution CSV, and write pack catalog and asset registry.

Key behaviors:
- Deterministic seeding for reproducible runs.
- Metadata caching per URL to avoid redundant network requests.
- Source priority fallback: prefer higher-priority sources first, then fill with lower-priority candidates.
- Emits three outputs: generated packs JSON, attribution CSV, and asset registry mapping tokens to source paths.

```mermaid
flowchart TD
Start(["Run icon pack generator"]) --> ParseCLI["Parse CLI options<br/>--config, --seed"]
ParseCLI --> ReadCfg["Read and validate config"]
ReadCfg --> LoadCatalog["Load icon catalog"]
LoadCatalog --> InitSources["Resolve source priorities"]
InitSources --> FetchMeta["Fetch metadata (cache by URL)"]
FetchMeta --> BuildCandidates["Build candidates by keyword score"]
BuildCandidates --> PickSVG["Pick SVG candidates<br/>by score and priority"]
PickSVG --> PickEmoji["Pick emoji candidates<br/>from pack and global pool"]
PickEmoji --> Shuffle["Shuffle combined icons"]
Shuffle --> AutoDL{"autoDownloadSvg?"}
AutoDL --> |Yes| Download["Download selected SVGs"]
AutoDL --> |No| SkipDL["Skip download"]
Download --> WriteOutputs["Write packs JSON, attribution CSV,<br/>and asset registry"]
SkipDL --> WriteOutputs
WriteOutputs --> End(["Done"])
```

**Diagram sources**
- [generate-icon-packs.ts:80-474](file://tools/generate-icon-packs.ts#L80-L474)

**Section sources**
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)

### Audio Asset Index Generator (Node.js)
Responsibilities:
- Read audio formats configuration.
- Scan directories for audio files matching configured extensions.
- Sort filenames and write index.json files.

```mermaid
flowchart TD
Start(["Run audio index generator"]) --> ReadCfg["Read audio-formats.json"]
ReadCfg --> ListFiles["List audio files by extension"]
ListFiles --> Sort["Sort filenames"]
Sort --> WriteIdx["Write index.json"]
WriteIdx --> End(["Done"])
```

**Diagram sources**
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)

**Section sources**
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)

### Icon Artifacts Synchronization (Node.js)
Responsibilities:
- Extract emoji pack definitions from the canonical source file.
- Write icon-pack-catalog.json for downstream consumers.
- Generate emoji-inventory.md with active/inactive imported tokens and usage notes.

```mermaid
flowchart TD
Start(["Run icon artifacts sync"]) --> ReadPacks["Read emoji packs from src/icons.ts"]
ReadPacks --> ReadOpenMoji["Scan imported OpenMoji SVG tokens"]
ReadOpenMoji --> BuildMD["Build inventory Markdown"]
BuildMD --> WriteCatalog["Write icon-pack-catalog.json"]
WriteCatalog --> WriteDocs["Write emoji-inventory.md"]
WriteDocs --> End(["Done"])
```

**Diagram sources**
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)

**Section sources**
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)

### Configuration Validation (Shell)
Responsibilities:
- Ensure required files exist.
- Validate line syntax (key=value) excluding comments and blanks.
- Check required keys per file.
- Detect and reject deprecated keys.

```mermaid
flowchart TD
Start(["Run config validator"]) --> CheckFiles["Check required files exist"]
CheckFiles --> Syntax["Validate key=value syntax"]
Syntax --> RequiredKeys["Check required keys per file"]
RequiredKeys --> Deprecated["Reject deprecated keys"]
Deprecated --> End(["Done"])
```

**Diagram sources**
- [validate-config.sh:1-129](file://tools/validate-config.sh#L1-L129)

**Section sources**
- [validate-config.sh:1-129](file://tools/validate-config.sh#L1-L129)

### Leaderboard Utility Stack
Components:
- HTTP server: Exposes GET /leaderboard (with limit query) and POST /leaderboard endpoints, with CORS headers and request body limits.
- Schema validation: Parses and validates leaderboard payloads, normalizing fields and enforcing required values.
- Store factory: Creates a SQLite-backed store instance.
- SQLite store: Manages schema creation, WAL mode configuration, insertion with retention trimming, and one-time migration from legacy JSON.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "leaderboard-server.mjs"
participant Schema as "entry-schema.mjs"
participant Factory as "store-factory.mjs"
participant Store as "sqlite-store.mjs"
Client->>Server : GET /leaderboard?limit=N
Server->>Store : readEntries(N)
Store-->>Server : entries[]
Server-->>Client : 200 { entries }
Client->>Server : POST /leaderboard {payload}
Server->>Schema : parseLeaderboardPayloadEntry(payload)
Schema-->>Server : validated entry
Server->>Store : writeEntry(validated entry)
Store-->>Server : 201 { ok, entry }
Server-->>Client : 201 { ok, entry }
```

**Diagram sources**
- [leaderboard-server.mjs:117-153](file://tools/leaderboard-server.mjs#L117-L153)
- [entry-schema.mjs:18-90](file://tools/leaderboard/entry-schema.mjs#L18-L90)
- [store-factory.mjs:16-24](file://tools/leaderboard/store-factory.mjs#L16-L24)
- [sqlite-store.mjs:391-399](file://tools/leaderboard/sqlite-store.mjs#L391-L399)

```mermaid
classDiagram
class SqliteLeaderboardStore {
+constructor(options)
+readEntries(limit) Entry[]
+writeEntry(entry) void
+migrateFromLegacyJson(legacyPath, parseEntry) Promise<number>
+getStorageKind() string
+getStorageLocation() string
+close() void
-configureWalMode() void
-#insertEntry(entry) void
}
class StoreFactory {
+createLeaderboardStore(options) SqliteLeaderboardStore
}
class EntrySchema {
+parseLeaderboardPayloadEntry(payload, options) Entry
}
StoreFactory --> SqliteLeaderboardStore : "creates"
SqliteLeaderboardStore <-- EntrySchema : "consumed by"
```

**Diagram sources**
- [sqlite-store.mjs:150-531](file://tools/leaderboard/sqlite-store.mjs#L150-L531)
- [store-factory.mjs:1-25](file://tools/leaderboard/store-factory.mjs#L1-L25)
- [entry-schema.mjs:1-91](file://tools/leaderboard/entry-schema.mjs#L1-L91)

**Section sources**
- [leaderboard-server.mjs:1-161](file://tools/leaderboard-server.mjs#L1-L161)
- [entry-schema.mjs:1-91](file://tools/leaderboard/entry-schema.mjs#L1-L91)
- [sqlite-store.mjs:1-531](file://tools/leaderboard/sqlite-store.mjs#L1-L531)
- [store-factory.mjs:1-25](file://tools/leaderboard/store-factory.mjs#L1-L25)

## Dependency Analysis
Tooling dependencies and relationships:
- npm scripts orchestrate artifact generation and testing.
- Vite dev server serves SVG assets and copies icon assets to dist/.
- ESLint targets tools/**/*.mjs and tools/**/*.ts with Node globals.
- Vitest excludes tools/ from coverage and focuses on src/ and tests/.
- Playwright runs E2E tests against the Vite preview server.

```mermaid
graph LR
PKG["package.json scripts"] --> GIP["generate-icon-packs.ts"]
PKG --> GAI["generate-audio-indexes.mjs"]
PKG --> SIA["sync-icon-artifacts.mjs"]
PKG --> LBS["leaderboard-server.mjs"]
VITE["vite.config.ts"] --> |"Dev server middleware and copy"| ICON["icon/ assets"]
ESLINT["eslint.config.mjs"] --> |"Targets tools/*"| GIP
ESLINT --> |"Targets tools/*"| SIA
VITEST["vitest.config.ts"] --> |"Excludes tools/*"| PKG
PW["playwright.config.ts"] --> |"Tests Vite preview"| VITE
```

**Diagram sources**
- [package.json:1-1](file://package.json#L1-L1)
- [vite.config.ts:11-61](file://vite.config.ts#L11-L61)
- [eslint.config.mjs:33-47](file://eslint.config.mjs#L33-L47)
- [vitest.config.ts:16-28](file://vitest.config.ts#L16-L28)
- [playwright.config.ts:45-49](file://playwright.config.ts#L45-L49)

**Section sources**
- [package.json:1-1](file://package.json#L1-L1)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [eslint.config.mjs:1-49](file://eslint.config.mjs#L1-L49)
- [vitest.config.ts:1-31](file://vitest.config.ts#L1-L31)
- [playwright.config.ts:1-51](file://playwright.config.ts#L1-L51)

## Performance Considerations
- Icon pack generator:
  - Metadata caching avoids repeated network fetches.
  - Seeded randomization ensures reproducibility without impacting performance.
  - Sorting and shuffling are bounded by pack sizes and configured quotas.
- Audio index generator:
  - Single-pass directory scanning and sorting; minimal memory overhead.
- Leaderboard SQLite store:
  - WAL mode is configured via pragmas; warnings are logged if unsupported.
  - Retention trimming uses a windowed ranking to efficiently prune older entries.
  - One-time legacy migration builds an identity set to deduplicate entries; memory estimates are logged for large retention limits.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Icon pack generator errors:
  - Ratio validation failures indicate emojiRatio + svgRatio != 1 or iconsPerPack <= 0.
  - Unknown source IDs or missing packs in catalog cause immediate errors.
  - Network failures when fetching metadata or downloading SVGs will abort the run.
- Audio index generator:
  - Missing or invalid audio-formats.json will cause parsing errors; ensure extensions array is valid.
- Icon artifacts sync:
  - If EMOJI_PACKS cannot be located in src/icons.ts, the script throws an error indicating manual inspection is required.
- Config validator:
  - Missing required files or invalid key=value lines will fail fast with specific messages.
  - Deprecated keys in win-fx.cfg will cause failures; remove them before re-running.
- Leaderboard server:
  - Request body too large triggers a 400 error; keep payloads compact.
  - Empty request bodies are rejected; ensure JSON payloads are provided.
  - Migration warnings indicate potential memory usage during large retention migrations; adjust retention limits if needed.
  - WAL mode warnings suggest filesystem or SQLite build limitations; verify permissions and filesystem capabilities.

**Section sources**
- [generate-icon-packs.ts:141-149](file://tools/generate-icon-packs.ts#L141-L149)
- [generate-icon-packs.ts:384-396](file://tools/generate-icon-packs.ts#L384-L396)
- [generate-audio-indexes.mjs:11-20](file://tools/generate-audio-indexes.mjs#L11-L20)
- [sync-icon-artifacts.mjs:23-32](file://tools/sync-icon-artifacts.mjs#L23-L32)
- [validate-config.sh:24-30](file://tools/validate-config.sh#L24-L30)
- [validate-config.sh:48-52](file://tools/validate-config.sh#L48-L52)
- [leaderboard-server.mjs:80-96](file://tools/leaderboard-server.mjs#L80-L96)
- [sqlite-store.mjs:303-337](file://tools/leaderboard/sqlite-store.mjs#L303-L337)
- [sqlite-store.mjs:474-484](file://tools/leaderboard/sqlite-store.mjs#L474-L484)

## Conclusion
The development toolchain provides robust automation for asset generation, configuration validation, and leaderboard persistence. It integrates cleanly with the build and test pipeline, enabling repeatable development workflows and maintainable asset catalogs. Extending the tooling involves adding new scripts, updating npm scripts, and ensuring proper linting and coverage policies.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Practical Usage Examples
- Generate icon packs:
  - Run the TypeScript generator with a custom config path and seed for reproducibility.
  - Example invocation path: [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- Update audio indices:
  - Execute the audio index generator to refresh index.json files.
  - Example invocation path: [tools/generate-audio-indexes.mjs:51-58](file://tools/generate-audio-indexes.mjs#L51-L58)
- Sync icon artifacts:
  - Regenerate catalog and inventory documentation from the canonical source.
  - Example invocation path: [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- Validate runtime configs:
  - Run the shell validator to check required files, syntax, required keys, and deprecations.
  - Example invocation path: [tools/validate-config.sh:24-30](file://tools/validate-config.sh#L24-L30)
- Start leaderboard server:
  - Launch the HTTP server with optional environment overrides for port, host, driver, and retention.
  - Example invocation path: [tools/leaderboard-server.mjs:117-153](file://tools/leaderboard-server.mjs#L117-L153)
- Build and serve:
  - Prepare artifacts, then start Vite dev server and leaderboard server concurrently.
  - Example invocation paths:
    - [package.json:1-1](file://package.json#L1-L1)
    - [vite.config.ts:71-78](file://vite.config.ts#L71-L78)

### Extending Tool Functionality
- Add a new tool:
  - Place the script under tools/ with appropriate file extension (.mjs for Node modules, .ts for TypeScript).
  - Configure ESLint language options for tools/*. See [eslint.config.mjs:33-47](file://eslint.config.mjs#L33-L47).
  - Add an npm script alias in [package.json:1-1](file://package.json#L1-L1) to integrate with the pipeline.
- Modify asset generation:
  - Update [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67) to change ratios, sources, or packs.
  - Re-run the icon pack generator and rebuild the app to consume new assets.
- Extend leaderboard features:
  - Add new fields to the schema in [entry-schema.mjs:18-90](file://tools/leaderboard/entry-schema.mjs#L18-L90).
  - Update [sqlite-store.mjs:48-75](file://tools/leaderboard/sqlite-store.mjs#L48-L75) with new table columns and indexes.
  - Update [store-factory.mjs:16-24](file://tools/leaderboard/store-factory.mjs#L16-L24) and server handlers accordingly.

### Maintaining the Build Pipeline
- Linting:
  - Run ESLint across the project; tools are linted with Node globals.
  - See [eslint.config.mjs:33-47](file://eslint.config.mjs#L33-L47).
- Unit tests:
  - Exclude tools from coverage; focus on application and test code.
  - See [vitest.config.ts:16-28](file://vitest.config.ts#L16-L28).
- E2E tests:
  - Configure Playwright to test mobile-browser scenarios against the Vite preview server.
  - See [playwright.config.ts:45-49](file://playwright.config.ts#L45-L49).
- Asset bundling:
  - Vite copies icon assets to dist/ and serves them via middleware during development.
  - See [vite.config.ts:41-61](file://vite.config.ts#L41-L61).