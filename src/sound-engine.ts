/**
 * Browser-based sound effects engine using Web Audio API.
 */

/**
 * Core sound effects playback engine using Web Audio API.
 */
export class SoundEngine {
  private readonly audioContext: AudioContext;

  private readonly fxGainNode: GainNode;

  private readonly fxBaseVolume: number;

  private fxSource: AudioBufferSourceNode | null = null;

  private soundFXMuted = false;

  /**
   * @param fxVolume - Base volume for sound FX layer (0.0 to 1.0). Default 0.8.
   */
  public constructor(fxVolume = 0.8) {
    this.audioContext = new AudioContext();
    this.fxBaseVolume = fxVolume;

    this.fxGainNode = this.audioContext.createGain();
    this.fxGainNode.gain.value = this.fxBaseVolume;
    this.fxGainNode.connect(this.audioContext.destination);
  }

  /**
   * Get the AudioContext instance.
   *
   * @returns The Web Audio API context.
   */
  public getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Play a one-shot sound effect.
   *
   * @param audioBuffer - Decoded audio buffer to play.
   * @param _options - Reserved for future playback behavior options.
   * @returns Promise that resolves when the sound effect finishes playing.
   */
  public async playSoundFX(
    audioBuffer: AudioBuffer,
  ): Promise<void> {
    if (this.soundFXMuted) {
      return;
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
   * Get sound FX mute state.
   *
   * @returns True if sound FX is muted, false otherwise.
   */
  public getSoundFXMuted(): boolean {
    return this.soundFXMuted;
  }

  /**
   * Check if a sound effect is currently playing.
   *
   * @returns True if FX is playing, false otherwise.
   */
  public isSoundPlaying(): boolean {
    return this.fxSource !== null;
  }
}
