/**
 * Cross-platform browser-based sound engine with mutually exclusive audio layers.
 *
 * Implements a single-track audio architecture where music and sound effects never
 * overlap. When a sound effect plays, music automatically pauses and resumes after.
 */

export interface SoundEngineOptions {
  /**
   * Base volume for music layer (0.0 to 1.0).
   * @default 0.6
   */
  musicVolume?: number;

  /**
   * Base volume for sound FX layer (0.0 to 1.0).
   * @default 0.8
   */
  fxVolume?: number;

  /**
   * Duration of fade-in/fade-out transitions in seconds.
   * @default 0.5
   */
  fadeDurationSeconds?: number;
}

export interface SoundEffectPlaybackOptions {
  /**
   * Whether playing this FX should temporarily pause music using fade-out/fade-in.
   *
   * @default true
   */
  interruptMusic?: boolean;

  /**
   * Optional multiplier applied to music volume while this FX plays.
   *
   * Example: `0.3` means music plays at 30% of its configured volume
   * (i.e., 70% quieter) for the FX duration.
   */
  musicDuckGainMultiplier?: number;
}

/**
 * Core audio playback engine using Web Audio API.
 *
 * Manages two mutually exclusive audio layers (music and FX) with automatic
 * crossfade transitions when sound effects interrupt background music.
 */
export class SoundEngine {
  private readonly audioContext: AudioContext;

  private readonly musicGainNode: GainNode;

  private readonly fxGainNode: GainNode;

  private readonly fadeDurationSeconds: number;

  private readonly musicBaseVolume: number;

  private readonly fxBaseVolume: number;

  private musicSource: AudioBufferSourceNode | null = null;

  private fxSource: AudioBufferSourceNode | null = null;

  private musicBuffer: AudioBuffer | null = null;

  private musicLoop = false;

  private musicMuted = false;

  private soundFXMuted = false;

  private musicPauseTime = 0;

  private musicStartTime = 0;

  private musicPaused = false;

  private fxPlaybackGeneration = 0;

  private musicDuckingDepth = 0;

  /**
   * @param options - Configuration options for the sound engine.
   */
  public constructor(options: SoundEngineOptions = {}) {
    const {
      musicVolume = 0.6,
      fxVolume = 0.8,
      fadeDurationSeconds = 0.5,
    } = options;

    this.audioContext = new AudioContext();
    this.fadeDurationSeconds = fadeDurationSeconds;
    this.musicBaseVolume = musicVolume;
    this.fxBaseVolume = fxVolume;

    // Create gain nodes for volume control
    this.musicGainNode = this.audioContext.createGain();
    this.fxGainNode = this.audioContext.createGain();

    // Set initial volumes
    this.musicGainNode.gain.value = this.musicBaseVolume;
    this.fxGainNode.gain.value = this.fxBaseVolume;

    // Connect gain nodes to output
    this.musicGainNode.connect(this.audioContext.destination);
    this.fxGainNode.connect(this.audioContext.destination);
  }

  /**
   * Get the AudioContext instance.
   *
   * Useful for creating AudioLoader instances or other audio utilities.
   *
   * @returns The Web Audio API context.
   */
  public getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Play background music from an AudioBuffer.
   *
   * Stops any currently playing music before starting the new track.
   *
   * @param audioBuffer - Decoded audio buffer to play.
   * @param loop - Whether the music should loop continuously.
   */
  public playMusic(audioBuffer: AudioBuffer, loop: boolean): void {
    this.stopMusic(false);

    this.musicBuffer = audioBuffer;
    this.musicLoop = loop;
    this.musicPauseTime = 0;
    this.musicStartTime = this.audioContext.currentTime;
    this.musicPaused = false;

    if (!this.musicMuted) {
      this.resumeMusicPlayback(false);
    }
  }

  /**
   * Stop currently playing music.
   *
   * @param fadeOut - If true, fades out before stopping; if false, stops immediately.
   */
  public stopMusic(fadeOut: boolean): void {
    if (this.musicSource === null) {
      return;
    }

    if (fadeOut && !this.musicMuted) {
      const endTime = this.audioContext.currentTime + this.fadeDurationSeconds;
      this.fadeOut(this.musicGainNode, this.fadeDurationSeconds);

      // Schedule the source to stop at exactly the audio-clock time the fade
      // completes, then run state cleanup in the onended callback so it is
      // synchronized with the audio graph rather than a drifting setTimeout.
      const source = this.musicSource;
      const previousOnEnded = source.onended;
      source.onended = () => {
        if (previousOnEnded !== null) {
          previousOnEnded.call(source, new Event("ended"));
        }
        this.stopMusicImmediately(true);
      };

      try {
        source.stop(endTime);
      } catch {
        // source may already be stopped; fall back to immediate cleanup
        this.stopMusicImmediately(true);
      }
    } else {
      this.stopMusicImmediately(true);
    }
  }

  /**
   * Pause currently playing music.
   *
   * @param fadeOut - If true, fades out before pausing; if false, pauses immediately.
   */
  public pauseMusic(fadeOut: boolean): void {
    if (this.musicSource === null || this.musicPaused) {
      return;
    }

    // Calculate current playback position
    const elapsed = this.audioContext.currentTime - this.musicStartTime;
    this.musicPauseTime += elapsed;

    // Handle looping: wrap pause time within buffer duration
    if (this.musicBuffer !== null && this.musicLoop) {
      this.musicPauseTime = this.musicPauseTime % this.musicBuffer.duration;
    }

    if (fadeOut && !this.musicMuted) {
      const endTime = this.audioContext.currentTime + this.fadeDurationSeconds;
      this.fadeOut(this.musicGainNode, this.fadeDurationSeconds);

      const source = this.musicSource;
      const previousOnEnded = source.onended;
      source.onended = () => {
        if (previousOnEnded !== null) {
          previousOnEnded.call(source, new Event("ended"));
        }
        this.stopMusicImmediately(false);
        this.musicPaused = true;
      };

      try {
        source.stop(endTime);
      } catch {
        this.stopMusicImmediately(false);
        this.musicPaused = true;
      }
    } else {
      this.stopMusicImmediately(false);
      this.musicPaused = true;
    }
  }

  /**
   * Resume paused music from where it left off.
   *
   * @param fadeIn - If true, fades in on resume; if false, resumes at full volume.
   */
  public resumeMusic(fadeIn: boolean): void {
    if (this.musicBuffer === null || !this.musicPaused) {
      return;
    }

    this.musicPaused = false;

    if (!this.musicMuted) {
      this.resumeMusicPlayback(fadeIn);
    }
  }

  /**
   * Play a one-shot sound effect.
   *
   * @param audioBuffer - Decoded audio buffer to play.
   * @param options - Playback behavior options.
   * @returns Promise that resolves when the sound effect finishes playing.
   */
  public async playSoundFX(
    audioBuffer: AudioBuffer,
    options: SoundEffectPlaybackOptions = {},
  ): Promise<void> {
    if (this.soundFXMuted) {
      return;
    }

    const { interruptMusic = true, musicDuckGainMultiplier } = options;

    const playbackGeneration = this.fxPlaybackGeneration + 1;
    this.fxPlaybackGeneration = playbackGeneration;

    const shouldResumeMusicAfterFx = interruptMusic
      && this.musicSource !== null
      && !this.musicPaused
      && !this.musicMuted;

    if (shouldResumeMusicAfterFx) {
      await this.pauseMusicForFx();
    }

    const hasMusicDuck =
      typeof musicDuckGainMultiplier === "number"
      && Number.isFinite(musicDuckGainMultiplier)
      && musicDuckGainMultiplier >= 0
      && musicDuckGainMultiplier <= 1
      && this.musicSource !== null
      && !this.musicMuted;

    if (hasMusicDuck) {
      this.musicDuckingDepth += 1;
      const duckedGain = this.musicBaseVolume * musicDuckGainMultiplier;
      this.musicGainNode.gain.setValueAtTime(duckedGain, this.audioContext.currentTime);
    }

    // Stop any currently playing FX
    if (this.fxSource !== null) {
      this.fxSource.stop();
      this.fxSource = null;
    }

    // Create and play FX source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.fxGainNode);
    this.fxSource = source;

    // Return promise that resolves when FX completes
    await new Promise<void>((resolve) => {
      source.onended = () => {
        this.fxSource = null;
        resolve();
      };

      source.start();
    });

    if (hasMusicDuck) {
      this.musicDuckingDepth = Math.max(0, this.musicDuckingDepth - 1);

      if (this.musicDuckingDepth === 0 && this.musicSource !== null && !this.musicMuted) {
        this.musicGainNode.gain.setValueAtTime(this.musicBaseVolume, this.audioContext.currentTime);
      }
    }

    if (this.fxPlaybackGeneration !== playbackGeneration) {
      return;
    }

    if (shouldResumeMusicAfterFx && !this.musicMuted) {
      this.resumeMusic(true);
    }
  }

  /**
   * Set music mute state.
   *
   * @param muted - True to mute music, false to unmute.
   */
  public setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;

    if (muted && this.musicSource !== null) {
      this.musicGainNode.gain.value = 0;
    } else if (!muted && this.musicSource !== null) {
      this.musicGainNode.gain.value = this.musicBaseVolume;
    }
  }

  /**
   * Set sound FX mute state.
   *
   * @param muted - True to mute sound FX, false to unmute.
   */
  public setSoundFXMuted(muted: boolean): void {
    this.soundFXMuted = muted;

    if (muted && this.fxSource !== null) {
      this.fxGainNode.gain.value = 0;
    } else if (!muted && this.fxSource !== null) {
      this.fxGainNode.gain.value = this.fxBaseVolume;
    }
  }

  /**
   * Get music mute state.
   *
   * @returns True if music is muted, false otherwise.
   */
  public getMusicMuted(): boolean {
    return this.musicMuted;
  }

  /**
   * Get sound FX mute state.
   *
   * @returns True if sound FX is muted, false otherwise.
   */
  public getSoundFXMuted(): boolean {
    return this.soundFXMuted;
  }

  /**
   * Check if music is currently playing.
   *
   * @returns True if music is playing, false otherwise.
   */
  public isMusicPlaying(): boolean {
    return this.musicSource !== null && !this.musicPaused;
  }

  /**
   * Check if a sound effect is currently playing.
   *
   * @returns True if FX is playing, false otherwise.
   */
  public isSoundPlaying(): boolean {
    return this.fxSource !== null;
  }

  /**
   * Fade out a gain node over the specified duration.
   *
   * @param gainNode - The gain node to fade out.
   * @param durationSeconds - Duration of the fade in seconds.
   */
  private fadeOut(gainNode: GainNode, durationSeconds: number): void {
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + durationSeconds);
  }

  /**
   * Fade in a gain node over the specified duration.
   *
   * @param gainNode - The gain node to fade in.
   * @param durationSeconds - Duration of the fade in seconds.
   */
  private fadeIn(gainNode: GainNode, durationSeconds: number): void {
    const now = this.audioContext.currentTime;
    const targetVolume = gainNode === this.musicGainNode
      ? this.musicBaseVolume
      : this.fxBaseVolume;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(targetVolume, now + durationSeconds);
  }

  /**
   * Immediately stop music playback without fading.
   */
  private stopMusicImmediately(clearTrackState: boolean): void {
    if (this.musicSource !== null) {
      try {
        this.musicSource.stop();
      } catch {
        // Ignore errors if already stopped
      }

      this.musicSource = null;
    }

    if (clearTrackState) {
      this.musicBuffer = null;
      this.musicPauseTime = 0;
      this.musicPaused = false;
    }
  }

  /**
   * Resume music playback from the saved pause position.
   *
   * @param fadeIn - If true, fades in on resume; if false, resumes at full volume.
   */
  private resumeMusicPlayback(fadeIn: boolean): void {
    if (this.musicBuffer === null) {
      return;
    }

    this.musicPaused = false;

    // Stop any existing source
    if (this.musicSource !== null) {
      try {
        this.musicSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
    }

    // Create new source
    const source = this.audioContext.createBufferSource();
    source.buffer = this.musicBuffer;
    source.loop = this.musicLoop;
    source.connect(this.musicGainNode);
    this.musicSource = source;

    // Apply fade-in if requested
    if (fadeIn) {
      this.fadeIn(this.musicGainNode, this.fadeDurationSeconds);
    } else {
      this.musicGainNode.gain.value = this.musicBaseVolume;
    }

    // Start playback from saved position
    this.musicStartTime = this.audioContext.currentTime;
    source.start(0, this.musicPauseTime);

    // Reset pause time if not looping (one-shot playback)
    if (!this.musicLoop) {
      this.musicPauseTime = 0;
    }
  }

  /**
   * Pause music with phase-2 FX orchestration semantics.
   *
   * Fades out music for the configured duration, then pauses playback while
   * preserving buffer and playback offset so it can be resumed seamlessly.
   */
  private async pauseMusicForFx(): Promise<void> {
    if (this.musicSource === null || this.musicPaused) {
      return;
    }

    if (!this.musicMuted) {
      this.fadeOut(this.musicGainNode, this.fadeDurationSeconds);
      await this.delayAudioClock(this.fadeDurationSeconds);
    }

    this.pauseMusic(false);
  }

  /**
   * Wait for an approximate duration. Uses `setTimeout` as a best-effort delay;
   * audio-critical scheduling should use `source.stop(when)` or
   * `AudioParam` automation instead.
   */
  private async delayAudioClock(seconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }
}
