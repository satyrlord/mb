# Icon Assets Management

<cite>
**Referenced Files in This Document**
- [src/icon-assets.ts](file://src/icon-assets.ts)
- [src/icons.ts](file://src/icons.ts)
- [src/openmoji-imports.ts](file://src/openmoji-imports.ts)
- [icon/ATTRIBUTION.csv](file://icon/ATTRIBUTION.csv)
- [icon/ICON_SOURCES.md](file://icon/ICON_SOURCES.md)
- [icon/icon-pack-catalog.json](file://icon/icon-pack-catalog.json)
- [icon/README.md](file://icon/README.md)
- [tools/generate-icon-packs.ts](file://tools/generate-icon-packs.ts)
- [tools/sync-icon-artifacts.mjs](file://tools/sync-icon-artifacts.mjs)
- [docs/icon-pack-generator.md](file://docs/icon-pack-generator.md)
- [config/icon-pack-generator.json](file://config/icon-pack-generator.json)
- [tests/icon-assets.test.ts](file://tests/icon-assets.test.ts)
- [tests/icon-attribution.test.ts](file://tests/icon-attribution.test.ts)
- [tests/icon-sync.test.ts](file://tests/icon-sync.test.ts)
- [package.json](file://package.json)
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
This document explains the icon assets management and attribution system used by the project. It covers how icon assets are defined, resolved, validated, and synchronized; how attribution and licensing are tracked; and how the system supports large icon libraries with performance-conscious design. It also documents the asset synchronization workflow, automated update mechanisms, quality assurance procedures, and legal compliance practices for commercial distribution.

## Project Structure
The icon system spans several areas:
- Runtime asset resolution and validation live in the source tree.
- Canonical icon pack catalogs and attribution records live under the icon directory.
- Tooling automates generation, synchronization, and inventory maintenance.
- Tests enforce correctness and compliance.

```mermaid
graph TB
subgraph "Runtime"
A["src/icons.ts"]
B["src/icon-assets.ts"]
C["src/openmoji-imports.ts"]
end
subgraph "Assets & Catalogs"
D["icon/icon-pack-catalog.json"]
E["icon/ATTRIBUTION.csv"]
F["icon/ICON_SOURCES.md"]
end
subgraph "Tooling"
G["tools/generate-icon-packs.ts"]
H["tools/sync-icon-artifacts.mjs"]
I["config/icon-pack-generator.json"]
end
subgraph "Docs & Tests"
J["docs/icon-pack-generator.md"]
K["tests/icon-assets.test.ts"]
L["tests/icon-attribution.test.ts"]
M["tests/icon-sync.test.ts"]
end
A --> D
B --> E
C --> D
G --> I
G --> E
G --> D
H --> A
H --> D
H --> J
K --> B
L --> E
M --> D
M --> A
```

**Diagram sources**
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [docs/icon-pack-generator.md:1-43](file://docs/icon-pack-generator.md#L1-L43)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

**Section sources**
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [docs/icon-pack-generator.md:1-43](file://docs/icon-pack-generator.md#L1-L43)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

## Core Components
- Icon asset definition and resolution: resolves tokenized asset identifiers to on-disk paths and labels.
- Icon pack catalog and validation: defines packs, validates uniqueness and minimum sizes, and generates decks.
- Attribution and licensing: tracks per-asset licenses and authors, enforcing compliance.
- Synchronization and inventory: keeps catalogs and documentation in sync with source definitions.
- Generation pipeline: fetches metadata, selects candidates, downloads assets, and emits attribution.

Key responsibilities:
- Token parsing and fallback resolution for OpenMoji assets.
- Enforcing minimum icon counts and uniqueness across packs.
- Generating decks with controlled asset-to-standard icon ratios.
- Maintaining a unified attribution record and source policy.
- Automating catalog and inventory updates.

**Section sources**
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)

## Architecture Overview
The system separates concerns between runtime asset resolution, pack composition, and tooling-driven generation and synchronization.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Gen as "generate-icon-packs.ts"
participant Src as "src/icons.ts"
participant Cat as "icon-pack-catalog.json"
participant Attr as "ATTRIBUTION.csv"
Dev->>Gen : Configure sources and ratios
Gen->>Gen : Fetch metadata and select candidates
Gen->>Cat : Write generated packs
Gen->>Attr : Write attribution rows
Dev->>Src : Review generated packs
Dev->>Src : Commit changes to packs
Src-->>Dev : Packs available at module load
```

**Diagram sources**
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)

## Detailed Component Analysis

### Icon Asset Resolution
The runtime resolver:
- Supports explicit manual entries for known tokens.
- Provides a fallback mechanism for OpenMoji tokens by deriving paths and labels.
- Identifies whether a given token refers to an asset.

```mermaid
flowchart TD
Start(["getIconAssetByToken(token)"]) --> CheckManual["Lookup in ICON_ASSET_DEFINITIONS"]
CheckManual --> FoundManual{"Found?"}
FoundManual --> |Yes| ReturnManual["Return manual definition"]
FoundManual --> |No| CheckPrefix["Starts with 'asset:openmoji:'?"]
CheckPrefix --> |Yes| BuildPath["Build 'icon/openmoji/svg/{code}.svg'"]
BuildPath --> ReturnFallback["Return fallback definition"]
CheckPrefix --> |No| ReturnNull["Return null"]
```

**Diagram sources**
- [src/icon-assets.ts:167-188](file://src/icon-assets.ts#L167-L188)

**Section sources**
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)

### Icon Pack Catalog and Deck Generation
The pack catalog:
- Defines canonical packs with IDs, names, preview icons, and icon lists.
- Enforces uniqueness and minimum counts per pack.
- Exposes helpers to compute active/inactive imported OpenMoji tokens.

Deck generation:
- Selects icons from a pack with a controlled ratio of asset icons to standard emojis.
- Ensures at least one copy per icon (pairs) and supports mixed copy counts.
- Shuffles to avoid bias and prevent repetition across the deck.

```mermaid
flowchart TD
Start(["generateEmojiDeck(uniqueIconCount, packId, copiesPerIcon)"]) --> GetPack["Resolve pack by ID"]
GetPack --> NormalizeCopies["Normalize copies per icon"]
NormalizeCopies --> ValidateCount["Validate requested sets vs available icons"]
ValidateCount --> SplitTypes["Split into asset and standard icons"]
SplitTypes --> SelectAsset["Select min asset icons respecting ratio"]
SelectAsset --> FillRemaining["Fill remaining slots with standard icons"]
FillRemaining --> FallbackAsset["Add fallback asset icons if needed"]
FallbackAsset --> Flatten["Flatten selected icons into tiles with copy counts"]
Flatten --> Shuffle["Shuffle tiles"]
Shuffle --> Done(["Return deck"])
```

**Diagram sources**
- [src/icons.ts:652-725](file://src/icons.ts#L652-L725)

**Section sources**
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)

### Attribution Tracking and License Compliance
Attribution tracking:
- Maintains a CSV with per-asset fields: file path, title, author, source URL, license, license URL, modifications, notes.
- Source policy document enumerates approved sources and intake checklist.

Quality assurance:
- Tests verify that all imported OpenMoji SVGs exist and are recorded in attribution.
- Tests verify that the catalog JSON matches the source packs and that inventory documentation reflects the generated source.

```mermaid
graph LR
A["OpenMoji metadata"] --> B["generate-icon-packs.ts"]
B --> C["icon/openmoji/svg/*.svg"]
B --> D["ATTRIBUTION.csv"]
E["sync-icon-artifacts.mjs"] --> F["icon/icon-pack-catalog.json"]
E --> G["docs/emoji-inventory.md"]
H["ICON_SOURCES.md"] --> B
```

**Diagram sources**
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)

**Section sources**
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

### Asset Synchronization Workflow
The synchronization script:
- Reads packs from the canonical source file.
- Writes the catalog JSON and generates an inventory Markdown.
- Tracks imported OpenMoji tokens and distinguishes active vs inactive usage.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Sync as "sync-icon-artifacts.mjs"
participant Src as "src/icons.ts"
participant Cat as "icon-pack-catalog.json"
participant Inv as "docs/emoji-inventory.md"
Dev->>Sync : Run sync
Sync->>Src : Parse EMOJI_PACKS
Sync->>Cat : Write catalog JSON
Sync->>Inv : Generate inventory Markdown
Sync-->>Dev : Report synced files
```

**Diagram sources**
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)

**Section sources**
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

### Automated Update Mechanisms
Generation pipeline:
- Loads configuration for sources, ratios, and pack keywords.
- Fetches metadata, ranks candidates, and selects assets.
- Optionally downloads SVGs and writes outputs for packs, attribution, and asset registry.

```mermaid
flowchart TD
Start(["generate-icon-packs.ts"]) --> ReadCfg["Read config and catalog"]
ReadCfg --> FetchMeta["Fetch metadata from sources"]
FetchMeta --> Rank["Rank candidates by keywords and source priority"]
Rank --> Select["Select top candidates respecting quotas"]
Select --> Download{"autoDownloadSvg?"}
Download --> |Yes| SaveSVG["Download and save SVGs"]
Download --> |No| SkipSVG["Skip download"]
SaveSVG --> Emit["Write packs, attribution, and registry"]
SkipSVG --> Emit
Emit --> End(["Done"])
```

**Diagram sources**
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)

**Section sources**
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [docs/icon-pack-generator.md:1-43](file://docs/icon-pack-generator.md#L1-L43)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)

## Dependency Analysis
The following diagram shows how core modules depend on each other and on external assets and tools.

```mermaid
graph TB
Icons["src/icons.ts"] --> Imports["src/openmoji-imports.ts"]
Icons --> Catalog["icon/icon-pack-catalog.json"]
Assets["src/icon-assets.ts"] --> Attr["icon/ATTRIBUTION.csv"]
Sync["tools/sync-icon-artifacts.mjs"] --> Icons
Sync --> Catalog
Gen["tools/generate-icon-packs.ts"] --> Config["config/icon-pack-generator.json"]
Gen --> Attr
Gen --> Catalog
TestsA["tests/icon-assets.test.ts"] --> Assets
TestsI["tests/icon-attribution.test.ts"] --> Attr
TestsS["tests/icon-sync.test.ts"] --> Icons
TestsS --> Catalog
```

**Diagram sources**
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

**Section sources**
- [src/icons.ts:56-528](file://src/icons.ts#L56-L528)
- [src/icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [icon/icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)

## Performance Considerations
- Inline pack definitions: Packs are embedded in source for immediate availability and tree-shaking benefits.
- Deterministic shuffling: Uses seeded randomization to ensure reproducible outcomes during generation and testing.
- Ratio-based selection: Controls the proportion of asset vs standard icons to balance fidelity and performance.
- Metadata caching: Generator caches metadata fetches to reduce network overhead.
- Minimal runtime I/O: Asset resolution relies on precomputed token sets and simple string operations.

Recommendations:
- Keep asset icons minimal and representative to reduce bundle size.
- Prefer SVG assets for scalability and consistent rendering.
- Monitor pack sizes to maintain the minimum icon count requirement.

**Section sources**
- [src/icons.ts:48-54](file://src/icons.ts#L48-L54)
- [tools/generate-icon-packs.ts:109-127](file://tools/generate-icon-packs.ts#L109-L127)
- [tools/generate-icon-packs.ts:177-199](file://tools/generate-icon-packs.ts#L177-L199)

## Troubleshooting Guide
Common issues and resolutions:
- Missing asset files: Ensure all imported OpenMoji SVGs exist in the unified folder and are recorded in attribution.
- Out-of-sync catalog: Re-run the synchronization script to regenerate the catalog and inventory.
- License mismatch: Verify that the source policy allows the asset and that attribution fields are complete.
- Deck generation errors: Confirm that each pack meets the minimum icon count and that the requested sets are feasible.

Validation steps:
- Run the test suite to validate asset resolution, attribution completeness, and synchronization accuracy.
- Use the generation script with a fixed seed to reproduce candidate selections.

**Section sources**
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)
- [tools/sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)

## Conclusion
The icon assets management system combines explicit runtime resolution, robust pack validation, and automated tooling to support large icon libraries while maintaining legal compliance and performance. By centralizing attribution, synchronizing catalogs, and enforcing quality checks, the system ensures reliable asset delivery and straightforward maintenance for commercial distribution.

## Appendices

### Adding New Icon Sources
Steps:
- Add the source to the generator configuration with metadata URL, SVG base URL, and priority.
- Define keywords per target pack to guide candidate selection.
- Run the generation script to fetch metadata, select candidates, and optionally download assets.
- Merge generated attribution rows into the unified attribution CSV.
- Regenerate the catalog and inventory to reflect changes.

**Section sources**
- [config/icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [docs/icon-pack-generator.md:1-43](file://docs/icon-pack-generator.md#L1-L43)
- [tools/generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)

### Managing Asset Dependencies
- Keep imported OpenMoji tokens in a dedicated set for quick lookup.
- Track active vs inactive tokens to identify unused assets.
- Maintain a unified folder for SVGs and a single attribution record.

**Section sources**
- [src/openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [tools/sync-icon-artifacts.mjs:63-124](file://tools/sync-icon-artifacts.mjs#L63-L124)

### Implementing Fallback Systems
- Use tokenized asset identifiers with fallback resolution for unknown OpenMoji codes.
- Ensure fallback paths align with the unified asset directory structure.
- Validate that fallback assets exist and are properly attributed.

**Section sources**
- [src/icon-assets.ts:167-188](file://src/icon-assets.ts#L167-L188)
- [tests/icon-assets.test.ts:17-24](file://tests/icon-assets.test.ts#L17-L24)

### Copyright and Legal Compliance
- Approved sources and intake checklist are documented for legal compliance.
- Attribution records must include author, source URL, license, and license URL.
- Keep source URLs intact and avoid importing assets with unclear terms.
- Prefer SVG resources for visual consistency and licensing clarity.

**Section sources**
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [icon/ATTRIBUTION.csv:1-42](file://icon/ATTRIBUTION.csv#L1-L42)

### Quality Assurance Procedures
- Unit tests validate asset resolution and attribution coverage.
- Integration tests verify catalog synchronization and inventory generation.
- Run the full validation pipeline to catch issues early.

**Section sources**
- [tests/icon-assets.test.ts:1-37](file://tests/icon-assets.test.ts#L1-L37)
- [tests/icon-attribution.test.ts:1-67](file://tests/icon-attribution.test.ts#L1-L67)
- [tests/icon-sync.test.ts:1-27](file://tests/icon-sync.test.ts#L1-L27)
- [package.json:1-1](file://package.json#L1-L1)