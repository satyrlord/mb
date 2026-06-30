# Asset Management Architecture

<cite>
**Referenced Files in This Document**
- [vite.config.ts](file://vite.config.ts)
- [icon-assets.ts](file://src/icon-assets.ts)
- [openmoji-imports.ts](file://src/openmoji-imports.ts)
- [icons.ts](file://src/icons.ts)
- [audio-loader.ts](file://src/audio-loader.ts)
- [sound-engine.ts](file://src/sound-engine.ts)
- [icon-pack-catalog.json](file://icon/icon-pack-catalog.json)
- [icon-pack-generator.json](file://config/icon-pack-generator.json)
- [generate-icon-packs.ts](file://tools/generate-icon-packs.ts)
- [generate-audio-indexes.mjs](file://tools/generate-audio-indexes.mjs)
- [audio-formats.json](file://config/audio-formats.json)
- [runtime-config.ts](file://src/runtime-config.ts)
- [index.json](file://sound/index.json)
- [icon-pack-generator.md](file://docs/icon-pack-generator.md)
- [emoji-inventory.md](file://docs/emoji-inventory.md)
- [ICON_SOURCES.md](file://icon/ICON_SOURCES.md)
- [icon/README.md](file://icon/README.md)
- [sync-icon-artifacts.mjs](file://tools/sync-icon-artifacts.mjs)
</cite>

## Update Summary
**Changes Made**
- Updated Build System Integration section to reflect comprehensive icon asset handling system
- Added detailed coverage of custom Vite plugin with security middleware
- Enhanced asset bundling documentation with automatic directory copying
- Updated architecture diagrams to show new icon asset pipeline
- Added security considerations for path traversal protection

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document describes the asset management architecture for the Memory Blox project, focusing on icon and audio asset discovery, loading, cataloging, and runtime switching. The system uses a catalog-based approach with JSON manifests for metadata, supports lazy loading and caching, and integrates with the build system for bundling. It documents the icon asset pipeline from OpenMoji imports through catalog generation to runtime selection, along with validation, fallback strategies, and performance optimizations.

**Updated** Added comprehensive icon asset handling system with custom Vite plugin that serves icons under /mb/icon path, includes security middleware for path traversal protection, and automatically copies icon directory structure to dist/icon during build.

## Project Structure
The asset system spans several areas:
- Icon assets: built-in Unicode glyphs and imported SVGs (OpenMoji), managed via catalogs and generators
- Audio assets: organized by index manifest and decoded at runtime
- Build integration: Vite plugin for development and production bundling of icon assets with security middleware
- Runtime configuration: controls UI behavior and asset-related parameters

```mermaid
graph TB
subgraph "Build System"
Vite["Vite Config<br/>vite.config.ts"]
Dist["dist/icon/"]
IconPlugin["Custom Icon Plugin<br/>/mb/icon/*"]
Security["Security Middleware<br/>Path Traversal Protection"]
end
subgraph "Icon Assets"
SrcIcons["src/icons.ts"]
SrcOpenmojiImports["src/openmoji-imports.ts"]
SrcIconAssets["src/icon-assets.ts"]
IconCatalog["icon/icon-pack-catalog.json"]
GenConfig["config/icon-pack-generator.json"]
GenScript["tools/generate-icon-packs.ts"]
SyncScript["tools/sync-icon-artifacts.mjs"]
end
subgraph "Audio Assets"
AudioIndex["sound/index.json"]
AudioLoader["src/audio-loader.ts"]
SoundEngine["src/sound-engine.ts"]
AudioFormats["config/audio-formats.json"]
AudioTool["tools/generate-audio-indexes.mjs"]
end
subgraph "Runtime"
RuntimeCfg["src/runtime-config.ts"]
end
Vite --> IconPlugin
IconPlugin --> Security
IconPlugin --> Dist
SrcIcons --> IconCatalog
GenScript --> IconCatalog
GenScript --> SrcOpenmojiImports
SyncScript --> IconCatalog
SrcIconAssets --> SrcIcons
AudioLoader --> SoundEngine
AudioTool --> AudioIndex
RuntimeCfg --> SrcIcons
RuntimeCfg --> SrcIconAssets
```

**Diagram sources**
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [icons.ts:1-726](file://src/icons.ts#L1-L726)
- [openmoji-imports.ts:1-199](file://src/openmoji-imports.ts#L1-L199)
- [icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [runtime-config.ts:1-399](file://src/runtime-config.ts#L1-L399)

**Section sources**
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [icons.ts:1-726](file://src/icons.ts#L1-L726)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [runtime-config.ts:1-399](file://src/runtime-config.ts#L1-L399)

## Core Components
- Icon asset definitions and runtime lookup: centralized mapping and dynamic resolution for OpenMoji tokens
- Icon pack catalog and generation: JSON catalog drives pack composition; generator selects emoji and SVG assets with ratios and priorities
- Audio loader and sound engine: fetch, decode, cache, and play audio with gain control and muting
- **Custom Vite plugin**: comprehensive icon asset handling system with security middleware for path traversal protection and automatic directory copying
- Runtime configuration: exposes UI and gameplay parameters that influence asset usage and behavior

Key responsibilities:
- Catalog-based icon discovery and validation
- Lazy loading and caching for both icons and audio
- Fallback strategies for missing assets and invalid configurations
- **Secure development server with path traversal protection**
- **Automatic asset bundling and distribution**
- Integration with build system for bundling and development serving

**Updated** Enhanced with custom Vite plugin that provides secure development server functionality and automated asset distribution.

**Section sources**
- [icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [icons.ts:1-726](file://src/icons.ts#L1-L726)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [runtime-config.ts:1-399](file://src/runtime-config.ts#L1-L399)

## Architecture Overview
The asset architecture combines static catalogs, dynamic generators, runtime loaders, and build-time bundling with enhanced security:

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Tool as "Generator Script<br/>generate-icon-packs.ts"
participant Sync as "Sync Script<br/>sync-icon-artifacts.mjs"
participant Cfg as "Generator Config<br/>icon-pack-generator.json"
participant Cat as "Catalog<br/>icon/icon-pack-catalog.json"
participant Src as "Sources (OpenMoji)"
participant FS as "Filesystem"
participant App as "Game Runtime"
participant Vite as "Vite Plugin"
Dev->>Tool : Run generator
Tool->>Cfg : Read generator config
Tool->>Cat : Read catalog
Tool->>Src : Fetch metadata and SVGs
Src-->>Tool : Metadata and SVGs
Tool->>FS : Write generated packs, assets, attribution
Sync->>Cat : Sync from src/icons.ts
Vite->>FS : Serve /mb/icon/* with security
App->>App : Load packs and assets at runtime
```

**Diagram sources**
- [generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)

## Detailed Component Analysis

### Icon Asset Pipeline (OpenMoji Imports to Runtime Selection)
The icon pipeline transforms OpenMoji assets into runtime-ready packs:
- Discovery: imported OpenMoji tokens are enumerated and validated
- Catalog generation: generator selects emoji and SVG assets based on keywords, ratios, and source priorities
- Packaging: packs are written to artifacts with asset registries and attributions
- Runtime selection: packs are embedded and validated; decks are generated with fallbacks for asset ratios

```mermaid
flowchart TD
Start(["Start"]) --> ReadCfg["Read Generator Config"]
ReadCfg --> ReadCat["Read Catalog"]
ReadCat --> FetchMeta["Fetch Metadata from Sources"]
FetchMeta --> BuildCandidates["Build Token Candidates"]
BuildCandidates --> PickEmoji["Pick Emoji Icons"]
BuildCandidates --> PickSVG["Pick SVG Icons (Prioritized)"]
PickEmoji --> Assemble["Assemble Pack Icons"]
PickSVG --> Assemble
Assemble --> WriteOutputs["Write Packs, Assets, Attribution"]
WriteOutputs --> End(["End"])
```

**Diagram sources**
- [generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)

Implementation highlights:
- Token scoring and prioritization ensure high-quality matches while falling back to lower-priority sources when needed
- Asset registry maps tokens to on-disk paths and labels for runtime resolution
- Attribution CSV generation tracks licenses and authors for compliance

**Section sources**
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icon/ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)
- [icon/README.md:1-23](file://icon/README.md#L1-L23)

### Icon Asset Definitions and Runtime Lookup
The runtime system resolves icon tokens to asset definitions:
- Static registry for known tokens
- Dynamic resolution for OpenMoji tokens using a standardized prefix
- Validation helpers to check token existence

```mermaid
flowchart TD
In(["Icon Token"]) --> CheckStatic["Lookup Static Registry"]
CheckStatic --> |Found| ReturnStatic["Return Static Definition"]
CheckStatic --> |Not Found| CheckPrefix["Check OpenMoji Prefix"]
CheckPrefix --> |Yes| BuildDynamic["Build Dynamic Path"]
CheckPrefix --> |No| NotFound["Return Null"]
BuildDynamic --> ReturnDynamic["Return Dynamic Definition"]
```

**Diagram sources**
- [icon-assets.ts:167-188](file://src/icon-assets.ts#L167-L188)

**Section sources**
- [icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)

### Icon Pack Catalog and Deck Generation
Icon packs are defined in a catalog and embedded in the application:
- Catalog JSON lists packs with preview icons and icon arrays
- Embedded pack definitions enforce uniqueness and minimum sizes
- Deck generation selects icons from packs, applies copy counts, and ensures asset-to-standard icon balance

```mermaid
sequenceDiagram
participant Game as "Game"
participant Packs as "Embedded Packs<br/>icons.ts"
participant Assets as "Asset Resolver<br/>icon-assets.ts"
participant Loader as "Deck Generator<br/>icons.ts"
Game->>Packs : Select Pack
Packs-->>Game : Pack Definition
Game->>Loader : Request Deck (unique count, copies)
Loader->>Packs : Get Icons
Loader->>Assets : Resolve Asset Tokens
Assets-->>Loader : Asset Paths
Loader-->>Game : Shuffled Tiles
```

**Diagram sources**
- [icons.ts:56-528](file://src/icons.ts#L56-L528)
- [icons.ts:652-725](file://src/icons.ts#L652-L725)
- [icon-assets.ts:167-188](file://src/icon-assets.ts#L167-L188)

Validation and fallbacks:
- Unique icon validation prevents duplicates within and across packs
- Minimum icon count enforcement ensures sufficient variety for all difficulties
- Asset ratio constraints ensure a balanced mix of imported and standard icons

**Section sources**
- [icons.ts:541-580](file://src/icons.ts#L541-L580)
- [icons.ts:652-725](file://src/icons.ts#L652-L725)
- [emoji-inventory.md:1-166](file://docs/emoji-inventory.md#L1-L166)

### Audio Asset Loading and Playback
Audio assets are discovered via an index manifest and loaded lazily with caching:
- Index manifest enumerates supported audio files
- Loader fetches and decodes audio buffers, caching decoded results
- Sound engine plays buffers with gain control and muting

```mermaid
sequenceDiagram
participant UI as "UI"
participant Loader as "AudioLoader"
participant Engine as "SoundEngine"
participant FS as "Audio Files"
UI->>Loader : preload(urls)
par Parallel fetch and decode
Loader->>FS : fetch(url)
FS-->>Loader : ArrayBuffer
Loader->>Loader : decodeAudioData()
end
Loader-->>UI : cache populated
UI->>Engine : playSoundFX(buffer)
Engine->>Engine : stop previous, connect gain
Engine-->>UI : onended callback
```

**Diagram sources**
- [audio-loader.ts:30-88](file://src/audio-loader.ts#L30-L88)
- [sound-engine.ts:47-75](file://src/sound-engine.ts#L47-L75)
- [index.json:1-17](file://sound/index.json#L1-L17)
- [generate-audio-indexes.mjs:34-57](file://tools/generate-audio-indexes.mjs#L34-L57)

**Section sources**
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [index.json:1-17](file://sound/index.json#L1-L17)
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)

### Build System Integration and Asset Bundling
**Updated** The build system now features a comprehensive custom Vite plugin that handles icon assets with security middleware and automatic bundling:

- **Development server**: Secure middleware serves icon assets from `/mb/icon/*` with path traversal protection
- **Security measures**: MIME type enforcement, path normalization, and directory traversal prevention
- **Build phase**: Recursive copying of icon directory structure to `dist/icon/` during bundle generation
- **Automatic synchronization**: Asset registry generation and catalog synchronization

```mermaid
flowchart TD
DevStart["Vite Dev Server"] --> IconPlugin["Custom Icon Plugin"]
IconPlugin --> Security["Security Middleware"]
Security --> Normalize["Normalize Path"]
Normalize --> Validate["Validate Directory Access"]
Validate --> |Valid| ServeIcon["Stream icon files"]
Validate --> |Invalid| BlockReq["Block Request"]
Build["Build Process"] --> Copy["Copy icon/** to dist/icon/**"]
Copy --> DistReady["Production Bundle Ready"]
```

**Diagram sources**
- [vite.config.ts:10-62](file://vite.config.ts#L10-L62)

**Section sources**
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)

### Runtime Configuration and Theme/Difficulty Switching
Runtime configuration influences asset-related behavior:
- UI and gameplay timing parameters affect asset usage and perceived performance
- Asset-related toggles (e.g., opacity) impact visual fidelity
- Theme and difficulty levels can be mapped to packs and asset ratios via configuration

**Section sources**
- [runtime-config.ts:99-353](file://src/runtime-config.ts#L99-L353)

## Dependency Analysis
The asset system exhibits low coupling and high cohesion with enhanced build-time integration:
- Icon pipeline: generator depends on catalog and sources; outputs are consumed by runtime packs
- Audio pipeline: loader and engine are loosely coupled; index manifest decouples discovery from runtime
- **Custom Vite plugin**: provides isolated asset serving and bundling with security guarantees
- Build integration: Vite plugin manages asset distribution and development server functionality

```mermaid
graph LR
Gen["generate-icon-packs.ts"] --> Cat["icon-pack-catalog.json"]
Gen --> OutPacks["Generated Packs"]
Gen --> OutAssets["Generated Assets"]
OutPacks --> Packs["Embedded Packs<br/>icons.ts"]
OutAssets --> Resolver["Asset Resolver<br/>icon-assets.ts"]
Packs --> Deck["Deck Generator<br/>icons.ts"]
Resolver --> Deck
Loader["AudioLoader"] --> Engine["SoundEngine"]
Index["sound/index.json"] --> Loader
Vite["Custom Vite Plugin"] --> Dist["dist/icon/"]
Dist --> Resolver
Sync["sync-icon-artifacts.mjs"] --> Cat
```

**Diagram sources**
- [generate-icon-packs.ts:351-474](file://tools/generate-icon-packs.ts#L351-L474)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [icons.ts:56-528](file://src/icons.ts#L56-L528)
- [icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [index.json:1-17](file://sound/index.json#L1-L17)
- [vite.config.ts:10-62](file://vite.config.ts#L10-L62)
- [sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)

**Section sources**
- [generate-icon-packs.ts:1-474](file://tools/generate-icon-packs.ts#L1-L474)
- [icons.ts:1-726](file://src/icons.ts#L1-L726)
- [icon-assets.ts:1-189](file://src/icon-assets.ts#L1-L189)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)
- [index.json:1-17](file://sound/index.json#L1-L17)
- [vite.config.ts:1-80](file://vite.config.ts#L1-L80)
- [sync-icon-artifacts.mjs:1-142](file://tools/sync-icon-artifacts.mjs#L1-L142)

## Performance Considerations
- Lazy loading and caching: both icon and audio systems defer work until needed and reuse decoded/cached buffers
- Parallel preloading: audio loader supports concurrent loading with partial failure logging
- Balanced asset ratios: generator maintains emoji/SVG ratios to reduce bundle size while preserving visual diversity
- Minimizing DOM work: embedded pack definitions enable immediate deck generation without network requests
- **Optimized build-time bundling**: Vite plugin avoids runtime asset discovery overhead in production
- **Efficient development server**: Custom middleware provides fast icon asset serving with minimal overhead

**Updated** Enhanced performance through optimized build-time bundling and efficient development server implementation.

## Security Considerations
**Updated** The custom Vite plugin implements comprehensive security measures:

- **Path traversal protection**: Validates file paths to prevent directory traversal attacks
- **Method restriction**: Only allows GET and HEAD requests for icon assets
- **MIME type enforcement**: Sets appropriate content types for SVG files
- **Directory access control**: Prevents access to parent directories and disallows directory listing
- **Request normalization**: Strips prefixes and normalizes incoming URLs
- **File existence verification**: Ensures requested files actually exist before serving

```mermaid
flowchart TD
Request["Incoming Request"] --> MethodCheck["Check HTTP Method"]
MethodCheck --> |GET/HEAD| PathNormalize["Normalize Path"]
MethodCheck --> |Other| Next["Pass to Next Handler"]
PathNormalize --> ResolvePath["Resolve Absolute Path"]
ResolvePath --> SecurityCheck["Security Validation"]
SecurityCheck --> |Valid| Serve["Serve File"]
SecurityCheck --> |Invalid| Block["Block Request"]
```

**Diagram sources**
- [vite.config.ts:18-39](file://vite.config.ts#L18-L39)

**Section sources**
- [vite.config.ts:18-39](file://vite.config.ts#L18-L39)

## Troubleshooting Guide
Common issues and resolutions:
- Missing or invalid asset tokens: use resolver checks and fallbacks; validate tokens against imported sets
- Insufficient icons per pack: ensure minimum counts and re-run generator with adjusted ratios
- Audio load failures: inspect network errors and decoder exceptions; confirm file extensions and index manifest
- **Build bundling problems**: verify Vite plugin configuration and copied asset paths; check for permission issues
- **Development server errors**: ensure security middleware is properly configured; verify file permissions
- **License compliance**: maintain accurate attribution CSV entries for imported assets
- **Path traversal issues**: check security middleware logs; verify file paths are properly normalized

**Updated** Added troubleshooting guidance for new security middleware and build system components.

**Section sources**
- [icon-assets.ts:167-188](file://src/icon-assets.ts#L167-L188)
- [icons.ts:541-580](file://src/icons.ts#L541-L580)
- [audio-loader.ts:30-88](file://src/audio-loader.ts#L30-L88)
- [vite.config.ts:18-39](file://vite.config.ts#L18-L39)
- [ICON_SOURCES.md:1-28](file://icon/ICON_SOURCES.md#L1-L28)

## Conclusion
The asset management system employs a robust, catalog-driven approach for icons and audio, combining static catalogs, deterministic generation, lazy loading, and caching. It integrates seamlessly with the build system through a custom Vite plugin that provides secure development server functionality and automated asset distribution. The enhanced architecture includes comprehensive security measures, automatic asset bundling, and runtime configuration hooks for theme and difficulty adaptation. Validation and fallback strategies ensure reliability, while performance optimizations minimize latency and resource usage.

**Updated** Enhanced with comprehensive icon asset handling system featuring custom Vite plugin, security middleware, and automated asset distribution.

## Appendices

### Appendix A: Icon Pack Generator Workflow
- Run the generator with optional seed for reproducibility
- Review generated outputs before promotion
- Merge attributions into the project's attribution records

**Section sources**
- [icon-pack-generator.md:1-43](file://docs/icon-pack-generator.md#L1-L43)
- [generate-icon-packs.ts:80-107](file://tools/generate-icon-packs.ts#L80-L107)
- [icon-pack-generator.json:1-67](file://config/icon-pack-generator.json#L1-L67)

### Appendix B: Audio Index Generation
- Automatically scan configured audio directories and write index manifests
- Enforce supported extensions from configuration

**Section sources**
- [generate-audio-indexes.mjs:1-58](file://tools/generate-audio-indexes.mjs#L1-L58)
- [audio-formats.json:1-4](file://config/audio-formats.json#L1-L4)

### Appendix C: Icon Asset Synchronization
**Updated** The sync script maintains consistency between source code and catalog files:
- Extracts icon packs from `src/icons.ts` for validation
- Generates `icon/icon-pack-catalog.json` from source definitions
- Creates comprehensive documentation in `docs/emoji-inventory.md`
- Maintains imported OpenMoji token inventory

**Section sources**
- [sync-icon-artifacts.mjs:126-142](file://tools/sync-icon-artifacts.mjs#L126-L142)
- [icons.ts:1-726](file://src/icons.ts#L1-L726)
- [icon-pack-catalog.json:1-474](file://icon/icon-pack-catalog.json#L1-L474)
- [emoji-inventory.md:1-166](file://docs/emoji-inventory.md#L1-L166)