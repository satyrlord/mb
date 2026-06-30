# Leaderboard Configuration

<cite>
**Referenced Files in This Document**
- [leaderboard.cfg](file://config/leaderboard.cfg)
- [leaderboard.data.json](file://config/leaderboard.data.json)
- [leaderboard.ts](file://src/leaderboard.ts)
- [leaderboard-ui.ts](file://src/leaderboard-ui.ts)
- [leaderboard-view.ts](file://src/leaderboard-view.ts)
- [session-score.ts](file://src/session-score.ts)
- [runtime-config.ts](file://src/runtime-config.ts)
- [cfg.ts](file://src/cfg.ts)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)
- [leaderboard.test.ts](file://tests/leaderboard.test.ts)
- [leaderboard-ui.test.ts](file://tests/leaderboard-ui.test.ts)
- [leaderboard-view.test.ts](file://tests/leaderboard-view.test.ts)
- [session-score.test.ts](file://tests/session-score.test.ts)
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

## Introduction
This document explains the leaderboard configuration system, focusing on scoring parameters, persistence settings, and ranking behavior. It covers both the client-side local storage implementation and the optional server-side SQLite-based implementation. You will learn how to customize scoring algorithms, adjust record limits, implement different ranking systems, and understand the relationship between configuration and leaderboard functionality, including data persistence strategies and performance considerations for large datasets.

## Project Structure
The leaderboard system spans client-side TypeScript modules and optional server-side Node.js tools:
- Client-side runtime configuration and scoring logic
- UI controller for rendering and submitting scores
- View helpers for identity and highlighting
- Server-side leaderboard API and SQLite store
- Tests validating configuration parsing, scoring, and persistence

```mermaid
graph TB
subgraph "Client"
CFG["Runtime Config Loader<br/>runtime-config.ts"]
LBCFG["Leaderboard Config<br/>leaderboard.cfg"]
LBTS["Leaderboard Core<br/>leaderboard.ts"]
UICTRL["UI Controller<br/>leaderboard-ui.ts"]
VIEW["View Helpers<br/>leaderboard-view.ts"]
end
subgraph "Server (Optional)"
SRV["Leaderboard Server<br/>leaderboard-server.mjs"]
STORE["SQLite Store<br/>sqlite-store.mjs"]
SCHEMA["Entry Schema<br/>entry-schema.mjs"]
DB[("SQLite Database")]
end
CFG --> LBCFG
CFG --> LBTS
UICTRL --> LBTS
VIEW --> UICTRL
SRV --> STORE
STORE --> DB
LBTS -. "local scores" .-> UICTRL
SRV -. "remote scores" .-> UICTRL
```

**Diagram sources**
- [runtime-config.ts:92-97](file://src/runtime-config.ts#L92-L97)
- [leaderboard.cfg](file://config/leaderboard.cfg)
- [leaderboard.ts](file://src/leaderboard.ts)
- [leaderboard-ui.ts](file://src/leaderboard-ui.ts)
- [leaderboard-view.ts](file://src/leaderboard-view.ts)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)

**Section sources**
- [runtime-config.ts:92-97](file://src/runtime-config.ts#L92-L97)
- [leaderboard.cfg](file://config/leaderboard.cfg)
- [leaderboard.ts](file://src/leaderboard.ts)
- [leaderboard-ui.ts](file://src/leaderboard-ui.ts)
- [leaderboard-view.ts](file://src/leaderboard-view.ts)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)

## Core Components
- Leaderboard runtime configuration loader and defaults
- Scoring computation and penalty application
- Ranking and display logic
- Persistence (client: localStorage; server: SQLite)
- UI integration for submission and rendering

Key configuration options and their roles:
- Enable/disable leaderboard
- Maximum number of records to retain
- Scoring parameters: base dividend, scale factor, penalty factor, and debug reductions
- Portrait bonus factor
- Attempts penalty in milliseconds

These options are defined in the configuration file and loaded at runtime to construct the scoring model and persistence behavior.

**Section sources**
- [leaderboard.cfg](file://config/leaderboard.cfg)
- [leaderboard.ts:74-87](file://src/leaderboard.ts#L74-L87)
- [leaderboard.ts:300-352](file://src/leaderboard.ts#L300-L352)

## Architecture Overview
The system supports two operational modes:
- Local mode: Scores are stored in the browser’s localStorage and ranked client-side.
- Remote mode: A Node.js server exposes a simple API to persist and retrieve scores in an SQLite database.

```mermaid
sequenceDiagram
participant Player as "Player"
participant UI as "LeaderboardUiController"
participant Core as "LeaderboardClient"
participant Local as "localStorage"
participant Server as "Leaderboard Server"
participant SQLite as "SQLite Store"
Player->>UI : "submitWin(...)"
UI->>UI : "computeGameScoreResult(...)"
UI->>Core : "submitScore(submission)"
alt "Local mode enabled"
Core->>Local : "write JSON array"
Core-->>UI : "success"
else "Remote mode enabled"
Core->>Server : "POST /leaderboard"
Server->>SQLite : "insert + trim"
SQLite-->>Server : "ok"
Server-->>Core : "{ entry }"
end
UI->>Core : "fetchTopScores()"
alt "Local mode"
Core->>Local : "read JSON array"
Local-->>Core : "entries"
else "Remote mode"
Core->>Server : "GET /leaderboard?limit=N"
Server->>SQLite : "select top N"
SQLite-->>Server : "entries"
Server-->>Core : "{ entries }"
end
Core-->>UI : "ranked entries"
UI-->>Player : "render leaderboard"
```

**Diagram sources**
- [leaderboard-ui.ts:119-172](file://src/leaderboard-ui.ts#L119-L172)
- [leaderboard.ts:432-454](file://src/leaderboard.ts#L432-L454)
- [leaderboard-server.mjs:117-153](file://tools/leaderboard-server.mjs#L117-L153)
- [sqlite-store.mjs:391-399](file://tools/leaderboard/sqlite-store.mjs#L391-L399)

## Detailed Component Analysis

### Configuration Loading and Defaults
- Runtime configuration paths include a dedicated leaderboard config path.
- The leaderboard config file defines:
  - Global enable flag
  - Maximum entries to display/retain
  - Scoring parameters: penalty factor, attempts penalty ms, base score dividend, score scale factor, debug reduction factors, portrait bonus factor
- The loader validates and clamps numeric values and merges defaults when the remote config is unavailable.

Practical customization examples:
- Increase leaderboard visibility: adjust the maximum entries retained.
- Tune scoring sensitivity: adjust base dividend and scale factor.
- Penalize attempts more or less: adjust attempts penalty ms and/or penalty factor.
- Reduce debug scores further: adjust debug reduction factors.
- Encourage portrait mode: increase portrait bonus factor.

**Section sources**
- [runtime-config.ts:92-97](file://src/runtime-config.ts#L92-L97)
- [leaderboard.cfg](file://config/leaderboard.cfg)
- [leaderboard.ts:300-352](file://src/leaderboard.ts#L300-L352)
- [cfg.ts:54-96](file://src/cfg.ts#L54-L96)
- [leaderboard.test.ts:26-121](file://tests/leaderboard.test.ts#L26-L121)

### Scoring Model and Computation
The scoring pipeline:
- Base score calculation considers time and attempts, scaled by a multiplier.
- Difficulty-based multiplier is applied (easy, normal, hard).
- Optional portrait mode bonus increases the multiplier.
- Tile multiplier reduces the multiplier (inverse relationship).
- Auto-demo and debug categories apply penalties.
- Additional debug-specific reductions apply depending on mode.
- Flip-tiles condition forces zero score.

```mermaid
flowchart TD
Start(["Start computeGameScoreResult"]) --> Diff["Resolve difficulty multiplier"]
Diff --> Mode["Apply portrait bonus"]
Mode --> Tiles["Apply tile penalty (inverse)"]
Tiles --> BaseMult["Compute adjusted score multiplier"]
BaseMult --> Category{"Category & flags"}
Category --> |Debug| DebugPenalty["Apply debug penalty"]
Category --> |Auto-demo| AutoPenalty["Apply auto-demo penalty"]
Category --> |Standard| Standard["No extra penalty"]
DebugPenalty --> ModeAdj{"Mode"}
ModeAdj --> |debug-tiles| DebugTiles["Apply debug-tiles reduction"]
ModeAdj --> |game| DebugGame["Apply debug-win reduction"]
AutoPenalty --> Compute["Compute base score"]
Standard --> Compute
DebugTiles --> Compute
DebugGame --> Compute
Compute --> Flip{"Used flip tiles?"}
Flip --> |Yes| Zero["Set score to 0"]
Flip --> |No| ApplyRed["Apply category reductions"]
ApplyRed --> End(["Return result"])
Zero --> End
```

**Diagram sources**
- [leaderboard.ts:476-526](file://src/leaderboard.ts#L476-L526)

**Section sources**
- [leaderboard.ts:89-109](file://src/leaderboard.ts#L89-L109)
- [leaderboard.ts:476-526](file://src/leaderboard.ts#L476-L526)
- [session-score.ts:1-24](file://src/session-score.ts#L1-L24)
- [leaderboard.test.ts:649-798](file://tests/leaderboard.test.ts#L649-L798)

### Ranking Behavior
Ranking criteria (in order):
- Primary: score value (higher is better)
- Secondary: recency by creation timestamp (newer is better)
- Tertiary: time in milliseconds (lower is better)
- Quaternary: number of attempts (lower is better)

```mermaid
flowchart TD
A["Entries List"] --> B["Sort by score desc"]
B --> C{"Any ties?"}
C --> |No| Z["Done"]
C --> |Yes| D["For tied groups, sort by createdAt desc"]
D --> E{"Still tied?"}
E --> |No| Z
E --> |Yes| F["For remaining ties, sort by timeMs asc"]
F --> G{"Still tied?"}
G --> |No| Z
G --> |Yes| H["For remaining ties, sort by attempts asc"]
H --> Z
```

**Diagram sources**
- [leaderboard.ts:269-298](file://src/leaderboard.ts#L269-L298)

**Section sources**
- [leaderboard.ts:269-298](file://src/leaderboard.ts#L269-L298)
- [leaderboard.test.ts:449-494](file://tests/leaderboard.test.ts#L449-L494)

### Persistence Strategies
Client-side (localStorage):
- Stores a JSON array under a fixed key.
- Enforces a maximum payload size and logs warnings when approaching the limit.
- Reads and writes are synchronous wrappers around localStorage.

Server-side (SQLite):
- Provides a simple GET/POST API endpoint for leaderboard entries.
- Inserts entries and trims to a configurable maximum.
- Uses WAL mode when available for improved concurrency and durability.
- Supports a one-time migration from the legacy JSON file.

```mermaid
classDiagram
class LeaderboardClient {
+isEnabled() bool
+fetchTopScores() LeaderboardScoreEntry[]
+submitScore(score) void
-readStorage() LeaderboardScoreEntry[]
-writeStorage(entries) void
}
class SqliteLeaderboardStore {
+readEntries(limit) LeaderboardScoreEntry[]
+writeEntry(entry) void
+migrateFromLegacyJson(path, parse) number
+getStorageKind() string
+getStorageLocation() string
}
LeaderboardClient ..> "uses" localStorage : "persists"
SqliteLeaderboardStore ..> "persists" DB : "SQLite"
```

**Diagram sources**
- [leaderboard.ts:362-455](file://src/leaderboard.ts#L362-L455)
- [sqlite-store.mjs:150-531](file://tools/leaderboard/sqlite-store.mjs#L150-L531)

**Section sources**
- [leaderboard.ts:362-455](file://src/leaderboard.ts#L362-L455)
- [leaderboard-server.mjs:117-153](file://tools/leaderboard-server.mjs#L117-L153)
- [sqlite-store.mjs:150-531](file://tools/leaderboard/sqlite-store.mjs#L150-L531)

### UI Integration and Display
- The UI controller computes the score, submits it, refreshes the leaderboard, and highlights the most recent or submitted entry.
- Rendering respects the visible row count and displays player name, score, difficulty, and emoji set.
- Special suffixes indicate auto-demo and debug entries.

```mermaid
sequenceDiagram
participant UI as "UI Controller"
participant Core as "LeaderboardClient"
participant View as "View Helpers"
UI->>UI : "computeGameScoreResult(...)"
UI->>Core : "submitScore(submission)"
UI->>Core : "fetchTopScores()"
Core-->>UI : "ranked entries"
UI->>View : "resolveMostRecent / lastSubmitted"
UI-->>UI : "render rows with highlights"
```

**Diagram sources**
- [leaderboard-ui.ts:51-172](file://src/leaderboard-ui.ts#L51-L172)
- [leaderboard-view.ts:3-110](file://src/leaderboard-view.ts#L3-L110)

**Section sources**
- [leaderboard-ui.ts:51-172](file://src/leaderboard-ui.ts#L51-L172)
- [leaderboard-view.ts:3-110](file://src/leaderboard-view.ts#L3-L110)
- [leaderboard-ui.test.ts:71-406](file://tests/leaderboard-ui.test.ts#L71-L406)

### Legacy Data Migration
- The server can migrate legacy JSON data into SQLite.
- Migration deduplicates entries using an identity built from core fields.
- Migration state is persisted to prevent repeated runs.

**Section sources**
- [leaderboard-server.mjs:99-115](file://tools/leaderboard-server.mjs#L99-L115)
- [sqlite-store.mjs:442-529](file://tools/leaderboard/sqlite-store.mjs#L442-L529)
- [entry-schema.mjs:18-90](file://tools/leaderboard/entry-schema.mjs#L18-L90)

## Dependency Analysis
- Configuration loading depends on a generic config parser and a runtime config path registry.
- The leaderboard core depends on configuration for scoring parameters and on localStorage for persistence.
- The UI controller depends on the leaderboard core and view helpers for identity resolution.
- The server depends on the SQLite store and entry schema for normalization and persistence.

```mermaid
graph LR
CFG["cfg.ts"] --> RC["runtime-config.ts"]
RC --> LB["leaderboard.ts"]
LB --> UI["leaderboard-ui.ts"]
UI --> VIEW["leaderboard-view.ts"]
SRV["leaderboard-server.mjs"] --> STORE["sqlite-store.mjs"]
STORE --> DB[("SQLite")]
SRV --> SCHEMA["entry-schema.mjs"]
```

**Diagram sources**
- [cfg.ts:54-96](file://src/cfg.ts#L54-L96)
- [runtime-config.ts:92-97](file://src/runtime-config.ts#L92-L97)
- [leaderboard.ts](file://src/leaderboard.ts)
- [leaderboard-ui.ts](file://src/leaderboard-ui.ts)
- [leaderboard-view.ts](file://src/leaderboard-view.ts)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)

**Section sources**
- [cfg.ts:54-96](file://src/cfg.ts#L54-L96)
- [runtime-config.ts:92-97](file://src/runtime-config.ts#L92-L97)
- [leaderboard.ts](file://src/leaderboard.ts)
- [leaderboard-ui.ts](file://src/leaderboard-ui.ts)
- [leaderboard-view.ts](file://src/leaderboard-view.ts)
- [leaderboard-server.mjs](file://tools/leaderboard-server.mjs)
- [sqlite-store.mjs](file://tools/leaderboard/sqlite-store.mjs)
- [entry-schema.mjs](file://tools/leaderboard/entry-schema.mjs)

## Performance Considerations
- Client-side:
  - localStorage payload size is guarded to prevent excessive growth; warnings are logged when approaching thresholds.
  - Ranking is performed on arrays up to the configured maximum entries.
- Server-side:
  - WAL mode is configured when supported to improve write performance and concurrency.
  - Index on creation timestamp ensures efficient retrieval of recent entries.
  - Request body size is bounded to prevent abuse.
  - Migration builds an identity set to deduplicate entries; memory usage scales with retention limit.

Recommendations:
- Keep max entries reasonable to balance visibility and performance.
- Monitor localStorage usage in browsers to avoid quota exceeded errors.
- On the server, tune retention limits and monitor memory usage during migration.

**Section sources**
- [leaderboard.ts:374-422](file://src/leaderboard.ts#L374-L422)
- [sqlite-store.mjs:303-337](file://tools/leaderboard/sqlite-store.mjs#L303-L337)
- [sqlite-store.mjs:391-399](file://tools/leaderboard/sqlite-store.mjs#L391-L399)
- [leaderboard-server.mjs:32-35](file://tools/leaderboard-server.mjs#L32-L35)
- [leaderboard.test.ts:604-636](file://tests/leaderboard.test.ts#L604-L636)

## Troubleshooting Guide
Common issues and resolutions:
- Configuration fetch failures:
  - The loader falls back to defaults and warns on network or parse errors.
- Corrupted or oversized localStorage:
  - The client ignores malformed data and logs warnings; very large payloads are rejected.
- Submission failures:
  - UI controller reports appropriate status messages and logs warnings.
- Server-side errors:
  - The server responds with structured error messages for invalid payloads or method misuse.

Validation and tests:
- Configuration parsing and clamping are validated in tests.
- Scoring computation correctness and penalties are covered by tests.
- UI rendering and identity resolution are verified by tests.

**Section sources**
- [leaderboard.ts:300-352](file://src/leaderboard.ts#L300-L352)
- [leaderboard.ts:374-422](file://src/leaderboard.ts#L374-L422)
- [leaderboard-ui.ts:119-172](file://src/leaderboard-ui.ts#L119-L172)
- [leaderboard-server.mjs:117-153](file://tools/leaderboard-server.mjs#L117-L153)
- [leaderboard.test.ts:87-95](file://tests/leaderboard.test.ts#L87-L95)
- [leaderboard.test.ts:256-262](file://tests/leaderboard.test.ts#L256-L262)
- [leaderboard-ui.test.ts:321-334](file://tests/leaderboard-ui.test.ts#L321-L334)

## Conclusion
The leaderboard configuration system offers flexible scoring, robust persistence, and clear ranking rules. Administrators can tailor scoring parameters and record limits via configuration, while developers can rely on well-tested client and server implementations. For large datasets, pay attention to localStorage quotas on the client and SQLite retention policies on the server to maintain performance and reliability.