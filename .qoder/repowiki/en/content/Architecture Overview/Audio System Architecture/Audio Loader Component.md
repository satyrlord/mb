# Audio Loader Component

<cite>
**Referenced Files in This Document**
- [audio-loader.ts](file://src/audio-loader.ts)
- [sound-manager.ts](file://src/sound-manager.ts)
- [sound-engine.ts](file://src/sound-engine.ts)
- [index.json](file://sound/index.json)
- [audio-formats.json](file://config/audio-formats.json)
- [generate-audio-indexes.mjs](file://tools/generate-audio-indexes.mjs)
- [audio-loader.test.ts](file://tests/audio-loader.test.ts)
- [README.md](file://README.md)
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
This document provides comprehensive technical documentation for the AudioLoader class, which is responsible for audio asset discovery and loading in the MemoryBlox browser game. The AudioLoader implements a robust multi-method file discovery strategy that supports JSON index files, asset-index endpoints, and HTML directory listings. It provides sophisticated filename pattern matching for categorizing different types of audio effects (tile flips, matches, mismatches, wins, new games) and manages absolute URL construction with asset path normalization. The component integrates seamlessly with the SoundManager's initialization process, implementing both preloading strategies for optimal game performance and individual loading mechanisms for on-demand audio playback. The documentation covers error handling for failed loads, timeout management, fallback mechanisms, and the complete audio file discovery pipeline integration.

## Project Structure
The audio system is organized around three primary components that work together to deliver seamless audio experiences:

```mermaid
graph TB
subgraph "Audio System Architecture"
AL[AudioLoader<br/>src/audio-loader.ts]
SM[SoundManager<br/>src/sound-manager.ts]
SE[SoundEngine<br/>src/sound-engine.ts]
AI[Audio Index<br/>sound/index.json]
AF[Audio Formats<br/>config/audio-formats.json]
GA[Generator Tool<br/>tools/generate-audio-indexes.mjs]
end
subgraph "Discovery Methods"
JSON[JSON Index Method]
AE[Asset-Index Endpoint]
HTML[HTML Directory Listing]
end
subgraph "Audio Categories"
TF[Tile Flip Effects]
MF[Match Effects]
MM[Mismatch Effects]
NG[New Game Effects]
WE[Win Effects]
GF[General FX]
end
SM --> AL
SM --> SE
AL --> SE
SM --> AI
SM --> AF
GA --> AI
GA --> AF
SM --> JSON
SM --> AE
SM --> HTML
SM --> TF
SM --> MF
SM --> MM
SM --> NG
SM --> WE
SM --> GF
```

**Diagram sources**
- [audio-loader.ts:1-118](file://src/audio-loader.ts#L1-L118)
- [sound-manager.ts:238-462](file://src/sound-manager.ts#L238-L462)
- [sound-engine.ts:8-110](file://src/sound-engine.ts#L8-L110)

**Section sources**
- [README.md:162-206](file://README.md#L162-L206)

## Core Components
The audio system consists of three interconnected components that handle different aspects of audio asset management:

### AudioLoader
The AudioLoader class serves as the central audio asset management utility, providing:
- **Caching Mechanism**: Efficiently caches decoded AudioBuffer instances to avoid redundant fetches
- **Parallel Preloading**: Supports bulk loading of multiple audio files with individual failure isolation
- **Error Wrapping**: Provides detailed error context while preserving original error information
- **Memory Management**: Offers cache clearing capabilities for resource optimization

### SoundManager
The SoundManager orchestrates the complete audio workflow, including:
- **Multi-Method Discovery**: Implements three distinct strategies for audio file discovery
- **Pattern-Based Categorization**: Uses regex patterns to classify audio effects by function
- **URL Construction**: Handles absolute URL building with proper path normalization
- **Round-Robin Selection**: Manages randomized selection from categorized audio pools

### SoundEngine
The SoundEngine provides the foundational Web Audio API integration:
- **AudioContext Management**: Creates and manages the Web Audio API context
- **Playback Control**: Handles one-shot sound effect playback with gain control
- **Mute State Management**: Supports muting/unmuting of sound effects
- **Context Resumption**: Manages AudioContext state transitions for autoplay compliance

**Section sources**
- [audio-loader.ts:7-118](file://src/audio-loader.ts#L7-L118)
- [sound-manager.ts:238-462](file://src/sound-manager.ts#L238-L462)
- [sound-engine.ts:8-110](file://src/sound-engine.ts#L8-L110)

## Architecture Overview
The audio system follows a layered architecture pattern that separates concerns between discovery, management, and playback:

```mermaid
sequenceDiagram
participant App as Application
participant SM as SoundManager
participant AL as AudioLoader
participant SE as SoundEngine
participant FS as File System
App->>SM : initialize()
SM->>SM : discoverAudioFilesInDirectory()
SM->>FS : Fetch JSON index
FS-->>SM : Audio file list
SM->>SM : Filter and categorize files
SM->>AL : preload(allAudioUrls)
AL->>FS : Parallel fetch requests
FS-->>AL : Audio buffers
AL->>AL : Decode and cache
SM->>SE : setSoundFXMuted(state)
SM->>App : initialized
App->>SM : playTileFlip()
SM->>AL : load(flipUrl)
AL->>FS : fetch if not cached
FS-->>AL : audio buffer
AL->>SE : playSoundFX(buffer)
SE-->>App : playback complete
```

**Diagram sources**
- [sound-manager.ts:264-297](file://src/sound-manager.ts#L264-L297)
- [audio-loader.ts:30-64](file://src/audio-loader.ts#L30-L64)
- [sound-engine.ts:47-75](file://src/sound-engine.ts#L47-L75)

## Detailed Component Analysis

### AudioLoader Implementation
The AudioLoader class implements a sophisticated caching and loading mechanism:

```mermaid
classDiagram
class AudioLoader {
-AudioContext context
-Map~string, AudioBuffer~ cache
+AudioLoader(context)
+load(url) Promise~AudioBuffer~
+preload(urls) Promise~void~
+clearCache() void
+isCached(url) boolean
+getCacheSize() number
}
class SoundManager {
-SoundEngine soundEngine
-AudioLoader audioLoader
-RandomRoundRobinPicker~string~ fxPicker
-RandomRoundRobinPicker~string~ tileFlipPicker
-RandomRoundRobinPicker~string~ matchPicker
-RandomRoundRobinPicker~string~ mismatchPicker
-RandomRoundRobinPicker~string~ newGamePicker
-RandomRoundRobinPicker~string~ winPicker
-boolean initialized
-Promise~void~ pendingNewGameFx
+initialize() Promise~void~
+playTileFlip() Promise~void~
+playTileMatch() Promise~void~
+playTileMismatch() Promise~void~
+playNewGame() Promise~void~
+playWin(onStarted) Promise~number|null~
}
class SoundEngine {
-AudioContext audioContext
-GainNode fxGainNode
-number fxBaseVolume
-AudioBufferSourceNode fxSource
-boolean soundFXMuted
+getAudioContext() AudioContext
+playSoundFX(audioBuffer) Promise~void~
+setSoundFXMuted(muted) void
+getSoundFXMuted() boolean
+isSoundPlaying() boolean
}
AudioLoader --> SoundEngine : "used by"
SoundManager --> AudioLoader : "composes"
SoundManager --> SoundEngine : "composes"
```

**Diagram sources**
- [audio-loader.ts:7-118](file://src/audio-loader.ts#L7-L118)
- [sound-manager.ts:238-462](file://src/sound-manager.ts#L238-L462)
- [sound-engine.ts:8-110](file://src/sound-engine.ts#L8-L110)

#### Multi-Method File Discovery Strategy
The SoundManager implements a robust three-tier discovery system:

1. **JSON Index Method**: Checks for `index.json` containing audio file lists
2. **Asset-Index Endpoint**: Queries `/__asset-index` endpoint for dynamic discovery  
3. **HTML Directory Listing**: Parses directory HTML for audio file links

Each method includes comprehensive error handling and fallback mechanisms to ensure reliable audio asset discovery across different hosting environments.

#### Filename Pattern Matching System
The system uses sophisticated regex patterns for audio effect categorization:

| Pattern Category | Regex Pattern | File Examples |
|------------------|---------------|---------------|
| Tile Flip Effects | `/^flip.*\.(mp3|wav|ogg|m4a)$/iu` | flip01.wav, flip02.wav, flip03.wav |
| Match Effects | `/^match.*\.(mp3|wav|ogg|m4a)$/iu` | match.wav |
| Mismatch Effects | `/^mismatch.*\.(mp3|wav|ogg|m4a)$/iu` | mismatch.wav |
| New Game Effects | `/^newgame.*\.(mp3|wav|ogg|m4a)$/iu` | newgame1.wav, newgame2.wav |
| Win Effects | `/^win.*\.(mp3|wav|ogg|m4a)$/iu` | win.wav |
| General Effects | `/^\.(mp3|wav|ogg|m4a)$/iu` | All other audio files |

#### Absolute URL Construction and Asset Path Normalization
The system implements intelligent URL construction with path normalization:

```mermaid
flowchart TD
Start([Build Absolute URL]) --> NormalizeDir["Normalize Directory Path"]
NormalizeDir --> CheckSlash{"Ends with '/'?"}
CheckSlash --> |Yes| RemoveSlash["Remove trailing slash"]
CheckSlash --> |No| UseOriginal["Use original directory"]
RemoveSlash --> BuildURL["Concatenate directory + '/' + filename"]
UseOriginal --> BuildURL
BuildURL --> ReturnURL["Return normalized URL"]
```

**Diagram sources**
- [sound-manager.ts:102-107](file://src/sound-manager.ts#L102-L107)

#### Preloading Strategy for Optimal Performance
The AudioLoader implements a sophisticated preloading mechanism:

```mermaid
sequenceDiagram
participant SM as SoundManager
participant AL as AudioLoader
participant FS as FileSystem
SM->>AL : preload(allAudioUrls)
AL->>AL : Create Promise.allSettled array
loop Parallel Loading
AL->>FS : fetch(url)
FS-->>AL : arrayBuffer
AL->>AL : decodeAudioData(arrayBuffer)
AL->>AL : cache.set(url, audioBuffer)
end
AL-->>SM : Promise.allSettled results
SM->>SM : Log failed loads (non-blocking)
SM-->>SM : Initialization complete
```

**Diagram sources**
- [audio-loader.ts:75-88](file://src/audio-loader.ts#L75-L88)

#### Individual Loading Mechanism for On-Demand Playback
The individual loading mechanism provides efficient on-demand audio playback:

```mermaid
flowchart TD
PlayRequest[Play Request] --> CheckCache{Is URL Cached?}
CheckCache --> |Yes| ReturnCached[Return Cached Buffer]
CheckCache --> |No| FetchAudio[Fetch Audio File]
FetchAudio --> CheckResponse{HTTP Response OK?}
CheckResponse --> |No| ThrowError[Throw Network Error]
CheckResponse --> |Yes| DecodeAudio[Decode Audio Data]
DecodeAudio --> CacheBuffer[Cache Audio Buffer]
CacheBuffer --> ReturnBuffer[Return Audio Buffer]
ReturnCached --> ReturnBuffer
ThrowError --> ErrorHandling[Error Handling]
ErrorHandling --> ReturnError[Return Error]
```

**Diagram sources**
- [audio-loader.ts:30-64](file://src/audio-loader.ts#L30-L64)

**Section sources**
- [audio-loader.ts:7-118](file://src/audio-loader.ts#L7-L118)
- [sound-manager.ts:131-226](file://src/sound-manager.ts#L131-L226)
- [sound-engine.ts:47-75](file://src/sound-engine.ts#L47-L75)

### SoundManager Integration and Initialization
The SoundManager coordinates the complete audio initialization process:

```mermaid
sequenceDiagram
participant App as Application
participant SM as SoundManager
participant SD as SoundManager Testing
participant AL as AudioLoader
participant SE as SoundEngine
App->>SM : initialize()
SM->>SD : discoverAudioFilesInDirectory("./sound")
SD->>SD : tryLoadFileListFromJson()
SD->>SD : tryLoadFileListFromAssetIndexEndpoint()
SD->>SD : tryLoadFileListFromDirectoryHtml()
SD-->>SM : Discovered audio files
SM->>SM : buildAbsoluteAssetUrl() for each file
SM->>SM : selectTileFlipFiles(), selectMatchFiles(), etc.
SM->>AL : preload(allAudioUrls)
SM->>SE : setSoundFXMuted(readStoredMute())
SM-->>App : initialized=true
```

**Diagram sources**
- [sound-manager.ts:264-297](file://src/sound-manager.ts#L264-L297)
- [sound-manager.ts:196-226](file://src/sound-manager.ts#L196-L226)

**Section sources**
- [sound-manager.ts:238-462](file://src/sound-manager.ts#L238-L462)

## Dependency Analysis
The audio system exhibits clean separation of concerns with well-defined dependencies:

```mermaid
graph TB
subgraph "External Dependencies"
WA[Web Audio API]
FS[File System]
LS[LocalStorage]
end
subgraph "Internal Dependencies"
AL[AudioLoader]
SM[SoundManager]
SE[SoundEngine]
UT[Utilities]
end
SM --> AL
SM --> SE
AL --> WA
AL --> FS
SM --> WA
SM --> LS
SE --> WA
SM --> UT
```

**Diagram sources**
- [audio-loader.ts:8-17](file://src/audio-loader.ts#L8-L17)
- [sound-manager.ts:1-3](file://src/sound-manager.ts#L1-L3)
- [sound-engine.ts:22-29](file://src/sound-engine.ts#L22-L29)

### Error Handling and Fallback Mechanisms
The system implements comprehensive error handling strategies:

1. **Discovery Method Failures**: Each discovery method includes try-catch blocks with graceful fallback to subsequent methods
2. **Individual Load Failures**: AudioLoader wraps errors with contextual information while preserving original error details
3. **Preload Failure Isolation**: Promise.allSettled ensures individual failures don't block overall initialization
4. **Non-Critical Audio Failures**: New-game audio playback failures don't interrupt gameplay flow

### Performance Characteristics
The audio system is optimized for performance through several mechanisms:

- **Caching**: Eliminates redundant network requests and decoding operations
- **Parallel Loading**: Utilizes Promise.allSettled for concurrent audio loading
- **Lazy Loading**: On-demand loading minimizes initial memory footprint
- **Resource Management**: Provides cache clearing capabilities for memory optimization

**Section sources**
- [audio-loader.ts:75-88](file://src/audio-loader.ts#L75-L88)
- [sound-manager.ts:337-343](file://src/sound-manager.ts#L337-L343)

## Performance Considerations
The audio system implements several performance optimization strategies:

### Memory Management
- **Cache Size Monitoring**: Track cache size through `getCacheSize()` for debugging and optimization
- **Manual Cache Clearing**: `clearCache()` enables explicit memory cleanup when needed
- **Efficient Caching**: AudioBuffer instances are cached to avoid repeated decoding operations

### Network Optimization
- **Concurrent Loading**: Parallel audio loading reduces initialization time
- **Error Isolation**: Individual load failures don't affect overall system performance
- **Content-Type Validation**: HTML directory listing parsing validates content types before processing

### Playback Optimization
- **AudioContext State Management**: Automatic context resumption handles autoplay restrictions
- **Gain Control**: Centralized volume control prevents audio conflicts
- **Source Cleanup**: Proper audio source cleanup prevents memory leaks

## Troubleshooting Guide

### Common Issues and Solutions

#### Audio Files Not Loading
**Symptoms**: AudioLoader throws "Failed to load audio from [url]" errors
**Causes**: 
- Network connectivity issues
- Incorrect file paths
- Unsupported audio formats
- CORS restrictions

**Solutions**:
1. Verify file paths in `sound/index.json`
2. Check audio format support in `config/audio-formats.json`
3. Ensure proper MIME type configuration for audio files
4. Validate CORS headers for cross-origin requests

#### Discovery Method Failures
**Symptoms**: SoundManager cannot find audio files
**Causes**:
- Missing `index.json` file
- Asset-index endpoint not configured
- Directory listing disabled
- Incorrect directory permissions

**Solutions**:
1. Run the audio index generator tool to create/update `sound/index.json`
2. Configure asset-index endpoint if using custom server setup
3. Enable directory listing for development servers
4. Verify file permissions and existence

#### Playback Issues
**Symptoms**: Audio plays but with reduced quality or no sound
**Causes**:
- AudioContext not running
- Muted state enabled
- Insufficient audio format support
- Browser autoplay restrictions

**Solutions**:
1. Call `ensureAudioContextRunning()` before playback
2. Check and disable mute state if enabled
3. Verify audio format compatibility across browsers
4. Implement user gesture requirement for autoplay

**Section sources**
- [audio-loader.test.ts:74-106](file://tests/audio-loader.test.ts#L74-L106)
- [sound-manager.ts:441-460](file://src/sound-manager.ts#L441-L460)

## Conclusion
The AudioLoader component provides a robust foundation for audio asset management in the MemoryBlox game, implementing sophisticated discovery mechanisms, efficient caching strategies, and comprehensive error handling. Its integration with the SoundManager creates a seamless audio experience that adapts to various hosting environments while maintaining optimal performance characteristics. The multi-method discovery approach ensures reliability across different deployment scenarios, while the pattern-based categorization system enables precise control over audio effect delivery. The component's design prioritizes both developer experience and end-user performance, making it a cornerstone of the game's audio system architecture.