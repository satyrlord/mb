# Sound Manager Component

<cite>
**Referenced Files in This Document**
- [sound-manager.ts](file://src/sound-manager.ts)
- [audio-file-discovery.ts](file://src/audio-file-discovery.ts)
- [audio-loader.ts](file://src/audio-loader.ts)
- [sound-engine.ts](file://src/sound-engine.ts)
- [utils.ts](file://src/utils.ts)
- [audio-ui-controller.ts](file://src/audio-ui-controller.ts)
- [index.ts](file://src/index.ts)
- [win-sequence-controller.ts](file://src/win-sequence-controller.ts)
- [sound/index.json](file://sound/index.json)
- [config/audio-formats.json](file://config/audio-formats.json)
- [sound-manager.test.ts](file://tests/sound-manager.test.ts)
</cite>

## Update Summary
**Changes Made**
- Updated architecture overview to reflect the new audio discovery module separation
- Added documentation for the new audio-file-discovery.ts module and its testing exports
- Updated initialization process to show the moved audio discovery logic
- Enhanced dependency analysis to show the new module boundaries
- Updated troubleshooting guide to address the new module structure

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
The SoundManager class serves as the central coordinator for all audio operations in the application. It manages audio file discovery, categorization, preloading, and playback orchestration. The component implements sophisticated patterns for randomizing sound effects while avoiding repetition, handles browser autoplay policy compliance, and provides robust error handling and fallback mechanisms.

**Updated** The SoundManager now delegates audio file discovery responsibilities to a dedicated module, improving separation of concerns and testability.

## Project Structure
The sound system is organized around four primary components that work together to deliver seamless audio experiences:

```mermaid
graph TB
subgraph "Sound System Architecture"
SM[SoundManager]
AE[AudioEngine]
AL[AudioLoader]
RR[RandomRoundRobinPicker]
AFD[AudioFileDiscovery]
LC[LocalStorage]
end
subgraph "Audio Assets"
SF[sound/ directory]
SI[index.json]
AF[Audio Files]
end
subgraph "Integration Points"
AUI[Audio UI Controller]
WSC[Win Sequence Controller]
APP[Main Application]
end
SM --> AE
SM --> AL
SM --> RR
SM --> AFD
AFD --> SF
AFD --> SI
SF --> AF
AUI --> SM
WSC --> SM
APP --> SM
```

**Diagram sources**
- [sound-manager.ts:112-136](file://src/sound-manager.ts#L112-L136)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [audio-loader.ts:7-18](file://src/audio-loader.ts#L7-L18)
- [sound-engine.ts:8-29](file://src/sound-engine.ts#L8-L29)

**Section sources**
- [sound-manager.ts:1-336](file://src/sound-manager.ts#L1-L336)
- [audio-file-discovery.ts:1-150](file://src/audio-file-discovery.ts#L1-L150)
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-engine.ts:1-110](file://src/sound-engine.ts#L1-L110)

## Core Components
The SoundManager system consists of several interconnected components that handle different aspects of audio management:

### SoundManager Class
The central orchestrator that coordinates all audio operations, manages asset discovery and categorization, and provides the public API for game events.

### AudioFileDiscovery Module
**New** Dedicated module responsible for audio file discovery from multiple sources with robust fallback strategies. Handles JSON index files, asset-index endpoints, and HTML directory listings.

### AudioLoader
Handles audio file loading, decoding, and caching using the Web Audio API. Provides efficient resource management through intelligent caching strategies.

### SoundEngine
Manages the Web Audio API context, audio playback, and volume control. Implements mute functionality and handles browser autoplay policy compliance.

### RandomRoundRobinPicker
Implements the round-robin pattern for randomizing audio playback while preventing immediate repetitions.

**Section sources**
- [sound-manager.ts:112-136](file://src/sound-manager.ts#L112-L136)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [audio-loader.ts:7-117](file://src/audio-loader.ts#L7-L117)
- [sound-engine.ts:8-109](file://src/sound-engine.ts#L8-L109)

## Architecture Overview
The SoundManager follows a layered architecture pattern that separates concerns between asset discovery, categorization, loading, and playback:

```mermaid
sequenceDiagram
participant Game as Game Events
participant SM as SoundManager
participant AFD as AudioFileDiscovery
participant RR as Round Robin Picker
participant AL as AudioLoader
participant SE as SoundEngine
participant AC as AudioContext
Game->>SM : playTileFlip()
SM->>AFD : discoverAudioFilesInDirectory('./sound')
AFD->>AFD : tryLoadFileListFromJson()
AFD->>AFD : tryLoadFileListFromAssetIndexEndpoint()
AFD->>AFD : tryLoadFileListFromDirectoryHtml()
AFD-->>SM : Discovered audio files
SM->>SM : waitForPendingNewGameFx()
SM->>AC : ensureAudioContextRunning()
SM->>RR : next()
RR-->>SM : audio file URL
SM->>AL : load(audioUrl)
AL-->>SM : AudioBuffer
SM->>SE : playSoundFX(AudioBuffer)
SE->>AC : createBufferSource()
SE-->>Game : playback complete
Note over SM,AC : Browser autoplay policy compliance
Note over SM,AL : Caching and preloading optimization
```

**Diagram sources**
- [sound-manager.ts:138-171](file://src/sound-manager.ts#L138-L171)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [audio-loader.ts:30-64](file://src/audio-loader.ts#L30-L64)
- [sound-engine.ts:47-75](file://src/sound-engine.ts#L47-L75)

## Detailed Component Analysis

### Initialization Process
The SoundManager performs a comprehensive initialization sequence that discovers, categorizes, and prepares audio assets through the dedicated AudioFileDiscovery module:

```mermaid
flowchart TD
Start([Initialize SoundManager]) --> CheckInit{Already Initialized?}
CheckInit --> |Yes| Return([Return Early])
CheckInit --> |No| Discover["AudioFileDiscovery.discoverAudioFilesInDirectory('./sound')"]
Discover --> Filter["Filter by File Patterns<br/>- flip*, match*, mismatch*<br/>- newgame*, win*"]
Filter --> BuildURLs["Build Absolute Asset URLs"]
BuildURLs --> SetPickers["Set Round Robin Pickers"]
SetPickers --> LoadMute["Load Mute State from localStorage"]
LoadMute --> Preload["AudioLoader.preload()"]
Preload --> Complete([Initialization Complete])
subgraph "Discovery Methods"
JSON["JSON Index Method"]
Endpoint["Asset Index Endpoint"]
HTML["HTML Directory Listing"]
Fallback["Fallback Chain"]
end
Discover --> JSON
Discover --> Endpoint
Discover --> HTML
Discover --> Fallback
```

**Diagram sources**
- [sound-manager.ts:138-171](file://src/sound-manager.ts#L138-L171)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)

The initialization process employs multiple discovery strategies with fallback mechanisms through the AudioFileDiscovery module:
1. **JSON Index Method**: Reads structured audio file listings from `./sound/index.json`
2. **Asset Index Endpoint**: Uses server-side asset indexing for dynamic discovery
3. **HTML Directory Listing**: Parses directory listings when other methods fail
4. **Robust Fallback Chain**: Sequentially attempts methods until successful discovery

**Section sources**
- [sound-manager.ts:138-171](file://src/sound-manager.ts#L138-L171)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [sound/index.json:1-17](file://sound/index.json#L1-L17)

### AudioFileDiscovery Module
**New** The AudioFileDiscovery module encapsulates all audio file discovery logic with comprehensive error handling and testing support:

```mermaid
classDiagram
class AudioFileDiscovery {
+parseDirectoryListingForAudioFiles(html : string) : string[]
+discoverAudioFilesInDirectory(directory : string) : Promise<string[]>
+buildAbsoluteAssetUrl(directory : string, fileName : string) : string
+tryLoadFileListFromJson(directory : string) : Promise<string[] | null>
+tryLoadFileListFromAssetIndexEndpoint(directory : string) : Promise<string[] | null>
+tryLoadFileListFromDirectoryHtml(directory : string) : Promise<string[] | null>
}
class TestingExports {
+audioFileDiscoveryTesting : {
tryLoadFileListFromJson,
tryLoadFileListFromAssetIndexEndpoint,
tryLoadFileListFromDirectoryHtml
}
}
AudioFileDiscovery --> TestingExports : "exports for testing"
```

**Diagram sources**
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [audio-file-discovery.ts:142-149](file://src/audio-file-discovery.ts#L142-L149)

The module provides:
- **File Pattern Filtering**: Regex-based filtering for audio file extensions
- **Deduplication**: Automatic removal of duplicate file names
- **Network Fallback Strategies**: Three-tier discovery approach
- **Testing Exports**: Isolated testing utilities for network methods

**Section sources**
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [audio-file-discovery.ts:142-149](file://src/audio-file-discovery.ts#L142-L149)

### Round-Robin Picker Pattern
The RandomRoundRobinPicker implements a sophisticated pattern that ensures randomization while preventing immediate repetitions:

```mermaid
classDiagram
class RandomRoundRobinPicker {
-source : T[]
-currentCycle : T[]
-index : number
+setItems(items : readonly T[]) : void
+next() : T | null
}
class SoundManager {
-fxPicker : RandomRoundRobinPicker~string~
-tileFlipPicker : RandomRoundRobinPicker~string~
-matchPicker : RandomRoundRobinPicker~string~
-mismatchPicker : RandomRoundRobinPicker~string~
-newGamePicker : RandomRoundRobinPicker~string~
-winPicker : RandomRoundRobinPicker~string~
}
SoundManager --> RandomRoundRobinPicker : "uses 6 instances"
RandomRoundRobinPicker --> Utils : "shuffle()"
```

**Diagram sources**
- [sound-manager.ts:53-82](file://src/sound-manager.ts#L53-L82)
- [sound-manager.ts:117-127](file://src/sound-manager.ts#L117-L127)
- [utils.ts:13-24](file://src/utils.ts#L13-L24)

The picker operates on a cycle basis:
1. **Shuffle Phase**: Creates a randomized cycle from the source pool
2. **Sequential Playback**: Plays items in shuffled order until cycle completion
3. **Refresh Phase**: Regenerates new shuffle when cycle exhausted

**Section sources**
- [sound-manager.ts:53-82](file://src/sound-manager.ts#L53-L82)
- [utils.ts:13-24](file://src/utils.ts#L13-L24)

### Event-Driven Audio Playback System
The SoundManager provides a comprehensive event-driven API that responds to game actions:

| Method | Purpose | Category | Behavior |
|--------|---------|----------|----------|
| `playTileFlip()` | Tile reveal sound | Flip Effects | Waits for pending new-game FX, then plays random flip sound |
| `playTileMatch()` | Successful match sound | Match Effects | Waits for pending new-game FX, then plays random match sound |
| `playTileMismatch()` | Failed match sound | Mismatch Effects | Waits for pending new-game FX, then plays random mismatch sound |
| `playWin(onStarted?)` | Victory celebration | Win Effects | Returns duration, triggers optional callback with duration |
| `playNewGame()` | New game start | New Game Effects | Handles pending operations, non-critical failure |

**Section sources**
- [sound-manager.ts:182-217](file://src/sound-manager.ts#L182-L217)

### Audio Context Management and Autoplay Policy Compliance
The SoundManager implements robust browser autoplay policy compliance through the `ensureAudioContextRunning()` method:

```mermaid
sequenceDiagram
participant SM as SoundManager
participant AC as AudioContext
participant User as User Gesture
User->>SM : Any audio playback request
SM->>AC : getAudioContext()
SM->>AC : check state
alt Context not running
SM->>AC : resume()
alt Resume fails
SM->>SM : log warning
SM->>AC : retry on next gesture
end
else Context running
SM->>SM : Continue with playback
end
```

**Diagram sources**
- [sound-manager.ts:315-334](file://src/sound-manager.ts#L315-L334)

The autoplay compliance strategy:
1. **Detection**: Checks AudioContext state before playback
2. **Resume Attempt**: Attempts to resume paused contexts
3. **Graceful Degradation**: Continues playback on subsequent user gestures if resume fails

**Section sources**
- [sound-manager.ts:315-334](file://src/sound-manager.ts#L315-L334)

### Mute Functionality with localStorage Persistence
The SoundManager provides comprehensive mute state management with persistent storage:

```mermaid
flowchart TD
SetMute[setSoundMuted(muted)] --> UpdateEngine["Update SoundEngine"]
UpdateEngine --> Store["localStorage.setItem()"]
Store --> Persisted([State Persisted])
GetMute[getSoundMuted()] --> CheckEngine["Check SoundEngine State"]
CheckEngine --> ReturnState([Return Current State])
Init[initialize()] --> LoadStorage["localStorage.getItem()"]
LoadStorage --> SetEngine["Set SoundEngine State"]
SetEngine --> Ready([Ready])
subgraph "Storage Keys"
Key["memoryblox-sound-muted"]
end
Store --> Key
LoadStorage --> Key
```

**Diagram sources**
- [sound-manager.ts:177-180](file://src/sound-manager.ts#L177-L180)
- [sound-manager.ts:84-104](file://src/sound-manager.ts#L84-L104)
- [sound-manager.ts:166](file://src/sound-manager.ts#L166)

**Section sources**
- [sound-manager.ts:177-180](file://src/sound-manager.ts#L177-L180)
- [sound-manager.ts:84-104](file://src/sound-manager.ts#L84-L104)

### Pending Operation Handling for New Game Sounds
The SoundManager implements sophisticated pending operation management for new game sounds:

```mermaid
stateDiagram-v2
[*] --> Idle
Idle --> PlayingNewGame : playNewGame()
PlayingNewGame --> Pending : Set pendingNewGameFx
Pending --> PlayingNewGame : Wait for completion
PlayingNewGame --> Idle : Complete
state PlayingNewGame {
[*] --> ResumingContext
ResumingContext --> LoadingAudio
LoadingAudio --> PlayingAudio
PlayingAudio --> [*]
}
note right of PlayingNewGame : Non-critical operation<br/>Continues gameplay flow on failure
```

**Diagram sources**
- [sound-manager.ts:201-217](file://src/sound-manager.ts#L201-L217)
- [sound-manager.ts:219-225](file://src/sound-manager.ts#L219-L225)

**Section sources**
- [sound-manager.ts:201-217](file://src/sound-manager.ts#L201-L217)
- [sound-manager.ts:219-225](file://src/sound-manager.ts#L219-L225)

### Error Handling Strategies and Fallback Mechanisms
The SoundManager implements comprehensive error handling across multiple layers:

#### Audio Discovery Failures
**Updated** The AudioFileDiscovery module provides robust error handling:
- **Multiple Strategy Support**: Falls back from JSON index to asset endpoint to HTML listing
- **Graceful Degradation**: Returns empty arrays when discovery fails
- **Logging**: Provides informative console messages for debugging
- **Testing Exports**: Isolated testing utilities for network methods

#### Playback Failures
- **Non-Critical Operations**: New game sounds don't interrupt gameplay flow
- **Silent Recovery**: Failed audio loads are logged but don't crash the application
- **State Cleanup**: Pending operations are properly cleared even on failure

#### Browser Compatibility
- **Feature Detection**: Checks for AudioContext resume capability
- **Graceful Degradation**: Continues operation on unsupported browsers
- **Type Safety**: Comprehensive type checking for Web Audio API features

**Section sources**
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)
- [sound-manager.ts:209-216](file://src/sound-manager.ts#L209-L216)
- [audio-loader.ts:50-63](file://src/audio-loader.ts#L50-L63)

## Dependency Analysis
The SoundManager maintains clean separation of concerns through well-defined dependencies with the new AudioFileDiscovery module:

```mermaid
graph TB
SM[SoundManager] --> SE[SoundEngine]
SM --> AL[AudioLoader]
SM --> RR[RandomRoundRobinPicker]
SM --> AFD[AudioFileDiscovery]
AFD --> FS[File System]
AFD --> NET[Network APIs]
AL --> AC[AudioContext]
SE --> AC
SM --> LS[localStorage]
subgraph "External Dependencies"
AC[Web Audio API]
LS[localStorage API]
FS[File System API]
NET[Network APIs]
end
subgraph "Internal Dependencies"
U[Utility Functions]
RR[Round Robin Logic]
end
```

**Diagram sources**
- [sound-manager.ts:1-8](file://src/sound-manager.ts#L1-L8)
- [sound-engine.ts:8-29](file://src/sound-engine.ts#L8-L29)
- [audio-loader.ts:7-18](file://src/audio-loader.ts#L7-L18)
- [audio-file-discovery.ts:1-150](file://src/audio-file-discovery.ts#L1-L150)

**Section sources**
- [sound-manager.ts:1-8](file://src/sound-manager.ts#L1-L8)
- [sound-engine.ts:8-29](file://src/sound-engine.ts#L8-L29)
- [audio-loader.ts:7-18](file://src/audio-loader.ts#L7-L18)
- [audio-file-discovery.ts:1-150](file://src/audio-file-discovery.ts#L1-L150)

## Performance Considerations
The SoundManager implements several performance optimizations with the new module structure:

### Caching Strategy
- **Audio Buffer Caching**: Prevents redundant network requests and decoding overhead
- **Lazy Loading**: Audio files are loaded only when needed
- **Memory Management**: Provides cache clearing capabilities for memory-constrained environments

### Parallel Loading
- **Preloading**: Multiple audio files are loaded concurrently during initialization
- **Promise.allSettled**: Ensures partial failures don't block overall loading progress

### Resource Pooling
- **Round Robin Distribution**: Even distribution of audio files across categories
- **Cycle Management**: Efficient reuse of audio resources without regeneration

### Discovery Optimization
**New** The AudioFileDiscovery module optimizes discovery performance:
- **Early Termination**: Stops at first successful discovery method
- **Result Deduplication**: Eliminates duplicate file entries
- **Pattern Filtering**: Efficient regex-based file filtering

**Section sources**
- [audio-loader.ts:75-88](file://src/audio-loader.ts#L75-L88)
- [sound-manager.ts:168](file://src/sound-manager.ts#L168)
- [audio-file-discovery.ts:118-126](file://src/audio-file-discovery.ts#L118-L126)

## Troubleshooting Guide

### Common Issues and Solutions

#### Audio Not Playing
**Symptoms**: No sound output during gameplay
**Causes**: 
- Browser autoplay restrictions
- Muted state
- Audio context not resumed

**Solutions**:
1. Trigger user gesture (click/tap) to resume audio context
2. Check mute state via `getSoundMuted()`
3. Verify audio files are properly loaded in developer tools

#### Missing Audio Files
**Symptoms**: Some sound categories not working
**Causes**:
- Incorrect file naming patterns
- Missing audio files in directory
- AudioFileDiscovery module failures

**Solutions**:
1. Verify file names match patterns (flip*, match*, mismatch*, newgame*, win*)
2. Check `./sound/index.json` contains all expected files
3. Confirm directory listing accessibility
4. Test discovery methods individually using audioFileDiscoveryTesting

#### Performance Issues
**Symptoms**: Slow audio loading or playback lag
**Causes**:
- Large audio files
- Network latency
- Excessive concurrent audio requests
- Inefficient discovery methods

**Solutions**:
1. Optimize audio file sizes and formats
2. Use appropriate audio compression
3. Monitor cache hit rates
4. Verify discovery method success through console logs

#### Discovery Method Failures
**New** AudioFileDiscovery-specific troubleshooting:
1. **JSON Index Issues**: Verify `./sound/index.json` format and accessibility
2. **Asset Index Endpoint**: Check server-side asset indexing configuration
3. **HTML Directory Listing**: Ensure directory browsing is enabled
4. **Network Errors**: Test individual discovery methods using testing exports

**Section sources**
- [sound-manager.ts:315-334](file://src/sound-manager.ts#L315-L334)
- [audio-loader.ts:95-116](file://src/audio-loader.ts#L95-L116)
- [audio-file-discovery.ts:103-133](file://src/audio-file-discovery.ts#L103-L133)

## Conclusion
The SoundManager component provides a robust, scalable solution for managing audio in the application. Its architecture balances flexibility with reliability through comprehensive error handling, browser compatibility, and performance optimizations. The refactoring to separate audio discovery logic into the AudioFileDiscovery module improves separation of concerns, testability, and maintainability. The round-robin picker pattern ensures engaging audio experiences while maintaining variety, and the event-driven design seamlessly integrates with the game's workflow. The implementation demonstrates best practices in modern web audio development, including proper resource management, autoplay policy compliance, and graceful degradation strategies. The new module structure provides better isolation for testing and maintenance while preserving all existing functionality.