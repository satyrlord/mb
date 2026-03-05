# Sound Engine Implementation Plan

## Status Update (2026-02-24)

- This plan is now largely implemented in production code (`sound-engine`,
   `sound-manager`, `audio-loader`) and covered by active tests.
- Today's work focused on edge-path hardening and branch-coverage completion,
   including ducking/mute guards, fallback paths, and non-overlap playback
   invariants.
- Keep this document as architecture context; treat current source and tests
   as the authoritative implementation behavior.

## Overview

Implement a cross-platform browser-based sound engine for MEMORYBLOX with mutually
exclusive sound/music layers and smooth fade transitions.

## Core Requirements

- **Single audio track architecture**: No audio overlap allowed
- **Two layers**:
  - Background music layer (continuous looping)
  - Sound FX layer (one-shot effects)
- **Crossfade behavior**: When FX plays, music fades out (2s), then FX plays, then
  music fades back in (2s) from where it left off
- **Browser-native API**: Use Web Audio API (no OS-specific code)
- **Mute controls**: Independent mute toggles for music and sound FX
  (already in UI)

## Architecture

### Module Structure

```text
src/
  sound-engine.ts    # Main sound engine class
  sound-manager.ts   # High-level game sound controller
  audio-loader.ts    # Asset loading and caching
```

### Key Classes

#### `SoundEngine`

Core audio playback engine with crossfade logic.

**Responsibilities:**

- Manage Web Audio API context
- Handle two-layer architecture (music + FX)
- Implement fade-in/fade-out logic
- Coordinate layer transitions
- Respect mute state from localStorage

**Public API:**

```typescript
class SoundEngine {
  constructor(options: SoundEngineOptions);
  
  // Music layer
  playMusic(audioBuffer: AudioBuffer, loop: boolean): void;
  stopMusic(fadeOut: boolean): void;
  pauseMusic(fadeOut: boolean): void;
  resumeMusic(fadeIn: boolean): void;
  
  // FX layer
  playSoundFX(audioBuffer: AudioBuffer): Promise<void>;
  
  // Controls
  setMusicMuted(muted: boolean): void;
  setSoundFXMuted(muted: boolean): void;
  getMusicMuted(): boolean;
  getSoundFXMuted(): boolean;
  
  // State
  isMusicPlaying(): boolean;
  isSoundPlaying(): boolean;
}
```

**Internal State:**

- `audioContext: AudioContext` - Web Audio API context
- `musicSource: AudioBufferSourceNode | null` - Current music source
- `fxSource: AudioBufferSourceNode | null` - Current FX source
- `musicGainNode: GainNode` - Music volume control
- `fxGainNode: GainNode` - FX volume control
- `musicMuted: boolean` - Music mute state
- `soundFXMuted: boolean` - Sound FX mute state
- `musicPauseTime: number` - Track position when music paused
- `musicBuffer: AudioBuffer | null` - Currently loaded music
- `musicLoop: boolean` - Whether music should loop

#### `AudioLoader`

Asset loading and caching utility.

**Responsibilities:**

- Load audio files from URLs
- Decode to AudioBuffer using Web Audio API
- Cache loaded buffers to avoid redundant fetches
- Handle loading errors gracefully

**Public API:**

```typescript
class AudioLoader {
  constructor(context: AudioContext);
  
  load(url: string): Promise<AudioBuffer>;
  preload(urls: string[]): Promise<void>;
  clearCache(): void;
}
```

#### `SoundManager`

High-level controller that maps game events to audio playback.

**Responsibilities:**

- Initialize SoundEngine and AudioLoader
- Map game events to specific sound files
- Preload all game audio assets
- Provide game-specific convenience methods
- Sync mute state with UI buttons

**Public API:**

```typescript
class SoundManager {
  constructor();
  
  async initialize(): Promise<void>;
  
  // Music
  playBackgroundMusic(): void;
  stopBackgroundMusic(): void;
  
  // Game events
  playTileFlip(): void;
  playTileMatch(): void;
  playTileMismatch(): void;
  playWin(): void;
  playNewGame(): void;
  
  // Mute controls (syncs with localStorage)
  setMusicMuted(muted: boolean): void;
  setSoundMuted(muted: boolean): void;
}
```

## Implementation Tasks

### Phase 1: Foundation (Core Engine)

1. **Create `src/audio-loader.ts`**
   - Implement AudioLoader class
   - Add fetch + decode logic
   - Implement simple Map-based cache
   - Add error handling for failed loads

2. **Create `src/sound-engine.ts`**
   - Set up AudioContext initialization
   - Create music and FX gain nodes
   - Implement basic play/stop for music layer
   - Implement basic play for FX layer (no crossfade yet)

3. **Add unit tests for audio-loader**
   - Test caching behavior
   - Test error handling
   - Mock AudioContext/fetch for testing

4. **Add unit tests for sound-engine basics**
   - Test AudioContext creation
   - Test gain node setup
   - Test mute state management

### Phase 2: Crossfade Logic

1. **Implement fade-in/fade-out utilities**
   - Create helper function for linear gain ramping
   - Add fade duration configuration (default 2s)
   - Handle edge cases (already fading, interrupted fades)

2. **Implement music pause on FX playback**
   - When FX plays: fade out music → pause music → play FX
   - Track music playback position during pause
   - Return Promise that resolves when FX completes

3. **Implement music resume after FX**
   - After FX completes: resume music from saved position → fade in
   - Handle looping correctly on resume
   - Ensure no overlap between FX end and music resume

4. **Add crossfade tests**
   - Test fade timing accuracy
   - Test pause/resume position correctness
   - Test interrupted playback scenarios

### Phase 3: Game Integration

1. **Create `src/sound-manager.ts`**
   - Implement SoundManager class
   - Map game events to sound file paths
   - Add preload logic for all game sounds
   - Initialize in bootstrap

2. **Wire sound events in `src/index.ts`**
   - Import SoundManager
   - Call appropriate methods on game events:
     - Tile flip
     - Match
     - Mismatch
     - Win
     - New game
   - Hook up mute button handlers to SoundManager

3. **Update mute button handlers**
   - Replace TODO comments with SoundManager calls
   - Ensure state syncs between UI and engine

4. **Add background music loop**
   - Create or acquire music file
   - Add to `music/` directory
   - Configure in SoundManager
   - Play on app start (respecting mute state)

### Phase 4: Polish

1. **Add volume control configuration**
   - Create config for music/FX base volumes
   - Add to `config/sound.cfg` or similar
   - Wire into SoundEngine gain nodes

2. **Test on multiple browsers**
   - Chrome
   - Firefox
   - Edge
   - Safari (WebKit)
   - Verify Web Audio API compatibility

3. **Add error recovery**
   - Handle AudioContext suspend/resume on page visibility
   - Recover from audio decode failures
   - Log errors without breaking gameplay

4. **Documentation**
   - Add JSDoc comments to all public APIs
   - Update project README with sound info
   - Document asset requirements (formats, sample rates)

### Phase 5: Testing & QA

1. **Integration tests**
   - Test full game flow with sound
   - Verify no audio glitches on rapid interactions
   - Test mute persistence across sessions

2. **Performance testing**
   - Measure memory usage with audio loaded
   - Check for audio buffer leaks
   - Verify smooth playback on low-end devices

3. **Accessibility review**
   - Ensure mute buttons work with keyboard
   - Verify ARIA labels are helpful
   - Test with screen readers

4. **Final validation**
   - Run full test suite
   - Check code coverage
   - Ensure no ESLint/TypeScript errors

## Technical Details

### Web Audio API Usage

```typescript
// Core pattern for SoundEngine
class SoundEngine {
  private audioContext: AudioContext;
  private musicGainNode: GainNode;
  private fxGainNode: GainNode;

  constructor() {
    this.audioContext = new AudioContext();
    
    // Create gain nodes
    this.musicGainNode = this.audioContext.createGain();
    this.fxGainNode = this.audioContext.createGain();
    
    // Connect to destination
    this.musicGainNode.connect(this.audioContext.destination);
    this.fxGainNode.connect(this.audioContext.destination);
  }

  private fadeOut(gainNode: GainNode, durationSeconds: number): void {
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + durationSeconds);
  }

  private fadeIn(gainNode: GainNode, durationSeconds: number): void {
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + durationSeconds);
  }

  async playSoundFX(buffer: AudioBuffer): Promise<void> {
    // 1. Fade out and pause music
    if (this.musicSource && !this.musicMuted) {
      this.fadeOut(this.musicGainNode, 2);
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Track pause position for resume
    }

    // 2. Play FX
    if (!this.soundFXMuted) {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.fxGainNode);
      source.start();
      
      // Wait for FX to complete
      await new Promise(resolve => {
        source.onended = resolve;
      });
    }

    // 3. Resume and fade in music
    if (this.musicSource && !this.musicMuted) {
      // Resume from saved position
      this.fadeIn(this.musicGainNode, 2);
    }
  }
}
```

### Asset File Structure

```text
sound/
  flip01.wav        # Existing tile flip sounds
  flip02.wav
  ...
  flip07.wav
  win.wav           # Win sound
  newgame1.wav      # New game sounds
  ...
  newgame4.wav
  match.wav         # NEW: Match success
  mismatch.wav      # NEW: Match failure

music/
  background-loop.mp3  # NEW: Background music
```

### Configuration File

Create `config/sound.cfg`:

```ini
[volumes]
music_volume=0.6
fx_volume=0.8

[timing]
fade_duration_ms=2000
crossfade_pause_ms=100

[assets]
music_background=music/background-loop.mp3
fx_flip=sound/flip*.wav
fx_match=sound/match.wav
fx_mismatch=sound/mismatch.wav
fx_win=sound/win.wav
fx_newgame=sound/newgame*.wav
```

## Testing Strategy

### Unit Tests

- Mock Web Audio API (AudioContext, GainNode, AudioBufferSourceNode)
- Test fade calculations
- Test state transitions
- Test mute behavior

### Integration Tests

- Test with real AudioContext in headless browser
- Verify crossfade timing with synthetic buffers
- Test rapid event sequences

### Manual QA Checklist

- [ ] Music loops continuously when not muted
- [ ] Music fades out smoothly when FX starts
- [ ] Music resumes from correct position after FX
- [ ] Music fades in smoothly after FX completes
- [ ] No audio overlap occurs
- [ ] Mute buttons toggle correctly
- [ ] Mute state persists across page refreshes
- [ ] No audio plays when both layers muted
- [ ] Audio works on all target browsers
- [ ] No console errors related to audio

## Open Questions / Future Enhancements

1. **Do we need multiple music tracks?** (e.g., per difficulty)
   - Current plan: Single background loop for MVP
   - Can extend SoundManager to switch tracks per game mode

2. **Should fade duration be configurable in UI?**
   - Current plan: Fixed 2s fade in config file
   - Could add Settings UI slider if requested

3. **What about mobile audio restrictions?**
   - iOS/Android require user interaction to start AudioContext
   - Plan: Initialize AudioContext on first button click

4. **Do we need audio preloading UI?**
   - Current plan: Silent preload during bootstrap
   - Could add loading indicator if assets are large

5. **Should we support dynamic FX selection?**
   - Current plan: Random flip sound from pool
   - Could add setting to pick favorite flip sound

## Success Criteria

- ✅ No two sounds ever play simultaneously
- ✅ Music fades out/in smoothly with 2s transitions
- ✅ Music resumes from exact pause point
- ✅ Mute buttons work independently for music and FX
- ✅ Mute state persists in localStorage
- ✅ Cross-browser compatible (Chrome, Firefox, Edge, Safari)
- ✅ All tests pass
- ✅ No TypeScript or ESLint errors
- ✅ Code follows project conventions from copilot-instructions.md

## References

- [Web Audio API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)
- [AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
