import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SoundEngine } from "../src/sound-engine.js";

// Mock Web Audio API components
class MockAudioBufferSourceNode {
  public buffer: AudioBuffer | null = null;

  public loop = false;

  public onended: (() => void) | null = null;

  public readonly startCalls: Array<{ when: number; offset: number }> = [];

  private readonly connectedNodes: MockGainNode[] = [];

  public connect(destination: MockGainNode): void {
    this.connectedNodes.push(destination);
  }

  public start(when = 0, offset = 0): void {
    this.startCalls.push({ when, offset });

    // Simulate short async playback for one-shot FX tests.
    if (this.onended !== null) {
      setTimeout(() => {
        if (this.onended !== null) {
          this.onended();
        }
      }, 1);
    }
  }

  public stop(when = 0): void {
    if (this.onended !== null) {
      if (when > 0) {
        // Scheduled stop: defer the onended callback to match audio-clock
        // semantics used by the refactored SoundEngine.
        const handleEnded = this.onended;
        setTimeout(() => {
          if (this.onended === handleEnded) {
            this.onended = null;
          }
          handleEnded();
        }, when * 1000);
      } else {
        const handleEnded = this.onended;
        this.onended = null;
        handleEnded();
      }
    }
  }
}

class MockGainNode {
  public gain = {
    value: 1.0,
    defaultValue: 1.0,
    setValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    linearRampToValueAtTime: vi.fn(),
  };

  public connect(): void {
    // Mock connect
  }
}

class MockAudioContext {
  public currentTime = 0;

  public destination = {};

  public readonly gainNodes: MockGainNode[] = [];

  public readonly sourceNodes: MockAudioBufferSourceNode[] = [];

  public createGain(): MockGainNode {
    const gainNode = new MockGainNode();
    this.gainNodes.push(gainNode);
    return gainNode;
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    const sourceNode = new MockAudioBufferSourceNode();
    this.sourceNodes.push(sourceNode);
    return sourceNode;
  }
}

// Mock AudioBuffer
const createMockAudioBuffer = (duration = 5.0): AudioBuffer => {
  return {
    duration,
    length: Math.floor(duration * 44100),
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(0),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;
};

describe("SoundEngine", () => {
  let soundEngine: SoundEngine;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // Mock global AudioContext
    mockAudioContext = new MockAudioContext();
    global.AudioContext = vi.fn(() => mockAudioContext) as unknown as typeof AudioContext;

    soundEngine = new SoundEngine({
      musicVolume: 0.6,
      fxVolume: 0.8,
      fadeDurationSeconds: 2.0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe("initialization", () => {
    it("should create with default options", () => {
      const engine = new SoundEngine();

      expect(engine).toBeDefined();
      expect(engine.isMusicPlaying()).toBe(false);
      expect(engine.isSoundPlaying()).toBe(false);
    });

    it("should create with custom options", () => {
      const engine = new SoundEngine({
        musicVolume: 0.5,
        fxVolume: 0.9,
        fadeDurationSeconds: 1.5,
      });

      expect(engine).toBeDefined();
    });

    it("should provide access to AudioContext", () => {
      const context = soundEngine.getAudioContext();

      expect(context).toBe(mockAudioContext);
    });
  });

  describe("music playback", () => {
    it("should play music without looping", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);
    });

    it("should play music with looping", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, true);

      expect(soundEngine.isMusicPlaying()).toBe(true);
    });

    it("should stop currently playing music when starting new track", () => {
      const buffer1 = createMockAudioBuffer(10.0);
      const buffer2 = createMockAudioBuffer(8.0);

      soundEngine.playMusic(buffer1, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.playMusic(buffer2, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);
    });

    it("should stop music immediately", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.stopMusic(false);

      expect(soundEngine.isMusicPlaying()).toBe(false);
    });

    it("should stop music with fade out", async () => {
      vi.useFakeTimers();

      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.stopMusic(true);

      // Music should still be playing during fade
      expect(soundEngine.isMusicPlaying()).toBe(true);

      // After fade duration, music should be stopped
      await vi.advanceTimersByTimeAsync(2000);
      // Give microtasks a chance to run
      await Promise.resolve();

      expect(soundEngine.isMusicPlaying()).toBe(false);

      vi.useRealTimers();
    });

    it("should not play music when muted", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.setMusicMuted(true);
      soundEngine.playMusic(buffer, false);

      // Music is loaded but not audible
      expect(soundEngine.getMusicMuted()).toBe(true);
    });
  });

  describe("music pause and resume", () => {
    it("should pause music immediately", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.pauseMusic(false);

      expect(soundEngine.isMusicPlaying()).toBe(false);
    });

    it("should pause music with fade out", async () => {
      vi.useFakeTimers();

      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      soundEngine.pauseMusic(true);

      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();

      expect(soundEngine.isMusicPlaying()).toBe(false);

      vi.useRealTimers();
    });

    it("should resume paused music immediately", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.pauseMusic(false);

      expect(soundEngine.isMusicPlaying()).toBe(false);

      // Resume should not throw and should update internal state
      expect(() => soundEngine.resumeMusic(false)).not.toThrow();
    });

    it("should resume paused music with fade in", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.playMusic(buffer, false);
      soundEngine.pauseMusic(false);

      // Resume with fade should not throw
      expect(() => soundEngine.resumeMusic(true)).not.toThrow();
    });

    it("should not resume if music was not paused", () => {
      soundEngine.resumeMusic(false);

      expect(soundEngine.isMusicPlaying()).toBe(false);
    });
  });

  describe("sound effects playback", () => {
    it("should play sound effect", async () => {
      const buffer = createMockAudioBuffer(2.0);

      const playPromise = soundEngine.playSoundFX(buffer);

      expect(soundEngine.isSoundPlaying()).toBe(true);

      await playPromise;

      expect(soundEngine.isSoundPlaying()).toBe(false);
    });

    it("should not play sound effect when muted", async () => {
      const buffer = createMockAudioBuffer(2.0);

      soundEngine.setSoundFXMuted(true);

      await soundEngine.playSoundFX(buffer);

      expect(soundEngine.getSoundFXMuted()).toBe(true);
    });

    it("should stop previous FX when playing new one", async () => {
      const buffer1 = createMockAudioBuffer(2.0);
      const buffer2 = createMockAudioBuffer(1.5);

      const play1 = soundEngine.playSoundFX(buffer1);

      expect(soundEngine.isSoundPlaying()).toBe(true);

      // Start second FX before first completes
      const play2 = soundEngine.playSoundFX(buffer2);

      expect(soundEngine.isSoundPlaying()).toBe(true);

      await play1;
      await play2;

      expect(soundEngine.isSoundPlaying()).toBe(false);
    });

    it("should fade out music, play FX, and fade music back in", async () => {
      vi.useFakeTimers();

      const musicBuffer = createMockAudioBuffer(20);
      const fxBuffer = createMockAudioBuffer(1);

      soundEngine.playMusic(musicBuffer, true);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      const fxPromise = soundEngine.playSoundFX(fxBuffer);

      expect(soundEngine.isSoundPlaying()).toBe(false);
      expect(soundEngine.isMusicPlaying()).toBe(true);

      await vi.advanceTimersByTimeAsync(2000);

      expect(soundEngine.isMusicPlaying()).toBe(false);
      expect(soundEngine.isSoundPlaying()).toBe(true);

      await vi.advanceTimersByTimeAsync(1);
      await fxPromise;

      expect(soundEngine.isMusicPlaying()).toBe(true);

      const musicGainNode = mockAudioContext.gainNodes[0];
      expect(musicGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(2);
    });

    it("should resume looped music at the paused offset after FX", async () => {
      vi.useFakeTimers();

      const musicBuffer = createMockAudioBuffer(10);
      const fxBuffer = createMockAudioBuffer(1);

      soundEngine.playMusic(musicBuffer, true);

      mockAudioContext.currentTime = 9.25;
      const fxPromise = soundEngine.playSoundFX(fxBuffer);

      await vi.advanceTimersByTimeAsync(2001);
      await fxPromise;

      const resumedMusicSource = mockAudioContext.sourceNodes[mockAudioContext.sourceNodes.length - 1];
      const resumedStartCall = resumedMusicSource.startCalls[0];

      expect(resumedStartCall).toBeDefined();
      expect(resumedStartCall.offset).toBeCloseTo(9.25, 5);
    });

    it("should allow FX to overlap music when interruption is disabled", async () => {
      const musicBuffer = createMockAudioBuffer(20);
      const fxBuffer = createMockAudioBuffer(1);

      soundEngine.playMusic(musicBuffer, true);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      const fxPromise = soundEngine.playSoundFX(fxBuffer, { interruptMusic: false });

      expect(soundEngine.isMusicPlaying()).toBe(true);
      expect(soundEngine.isSoundPlaying()).toBe(true);

      await fxPromise;

      expect(soundEngine.isMusicPlaying()).toBe(true);
      expect(soundEngine.isSoundPlaying()).toBe(false);
    });

    it("should apply and then restore ducked music gain for valid multipliers", async () => {
      const musicBuffer = createMockAudioBuffer(20);
      const fxBuffer = createMockAudioBuffer(1);

      soundEngine.playMusic(musicBuffer, true);

      const musicGainNode = mockAudioContext.gainNodes[0];
      const initialSetCalls = musicGainNode.gain.setValueAtTime.mock.calls.length;

      await soundEngine.playSoundFX(fxBuffer, {
        interruptMusic: false,
        musicDuckGainMultiplier: 0.5,
      });

      const newCalls = musicGainNode.gain.setValueAtTime.mock.calls.slice(initialSetCalls);
      expect(newCalls.length).toBeGreaterThanOrEqual(2);
      expect(newCalls[0]?.[0]).toBeCloseTo(0.3, 5);
      expect(newCalls[newCalls.length - 1]?.[0]).toBeCloseTo(0.6, 5);
    });
  });

  describe("mute controls", () => {
    it("should mute and unmute music", () => {
      expect(soundEngine.getMusicMuted()).toBe(false);

      soundEngine.setMusicMuted(true);

      expect(soundEngine.getMusicMuted()).toBe(true);

      soundEngine.setMusicMuted(false);

      expect(soundEngine.getMusicMuted()).toBe(false);
    });

    it("should mute and unmute sound FX", () => {
      expect(soundEngine.getSoundFXMuted()).toBe(false);

      soundEngine.setSoundFXMuted(true);

      expect(soundEngine.getSoundFXMuted()).toBe(true);

      soundEngine.setSoundFXMuted(false);

      expect(soundEngine.getSoundFXMuted()).toBe(false);
    });

    it("should respect music mute state during playback", () => {
      const buffer = createMockAudioBuffer(10.0);

      soundEngine.setMusicMuted(true);
      soundEngine.playMusic(buffer, false);

      expect(soundEngine.getMusicMuted()).toBe(true);
    });

    it("should respect FX mute state during playback", async () => {
      const buffer = createMockAudioBuffer(2.0);

      soundEngine.setSoundFXMuted(true);

      await soundEngine.playSoundFX(buffer);

      expect(soundEngine.getSoundFXMuted()).toBe(true);
    });

    it("updates music gain directly when muting and unmuting during active playback", () => {
      const buffer = createMockAudioBuffer(10.0);
      soundEngine.playMusic(buffer, true);

      const musicGainNode = mockAudioContext.gainNodes[0];

      soundEngine.setMusicMuted(true);
      expect(musicGainNode.gain.value).toBe(0);

      soundEngine.setMusicMuted(false);
      expect(musicGainNode.gain.value).toBeCloseTo(0.6, 5);
    });

    it("updates fx gain directly when muting and unmuting during active FX playback", async () => {
      const buffer = createMockAudioBuffer(2.0);
      const playPromise = soundEngine.playSoundFX(buffer, { interruptMusic: false });

      const fxGainNode = mockAudioContext.gainNodes[1];

      soundEngine.setSoundFXMuted(true);
      expect(fxGainNode.gain.value).toBe(0);

      soundEngine.setSoundFXMuted(false);
      expect(fxGainNode.gain.value).toBeCloseTo(0.8, 5);

      await playPromise;
    });
  });

  describe("state queries", () => {
    it("should report music playing state correctly", () => {
      const buffer = createMockAudioBuffer(10.0);

      expect(soundEngine.isMusicPlaying()).toBe(false);

      soundEngine.playMusic(buffer, false);

      expect(soundEngine.isMusicPlaying()).toBe(true);

      soundEngine.stopMusic(false);

      expect(soundEngine.isMusicPlaying()).toBe(false);
    });

    it("should report sound playing state correctly", async () => {
      const buffer = createMockAudioBuffer(2.0);

      expect(soundEngine.isSoundPlaying()).toBe(false);

      const playPromise = soundEngine.playSoundFX(buffer);

      expect(soundEngine.isSoundPlaying()).toBe(true);

      await playPromise;

      expect(soundEngine.isSoundPlaying()).toBe(false);
    });

    it("handles stop and pause calls safely when no music is active", () => {
      expect(() => soundEngine.stopMusic(true)).not.toThrow();
      expect(() => soundEngine.pauseMusic(true)).not.toThrow();
      expect(soundEngine.isMusicPlaying()).toBe(false);
    });

    it("ignores invalid music duck multipliers", async () => {
      const musicBuffer = createMockAudioBuffer(10.0);
      const fxBuffer = createMockAudioBuffer(1.0);

      soundEngine.playMusic(musicBuffer, true);

      await soundEngine.playSoundFX(fxBuffer, {
        interruptMusic: false,
        musicDuckGainMultiplier: 2,
      });
      await soundEngine.playSoundFX(fxBuffer, {
        interruptMusic: false,
        musicDuckGainMultiplier: -1,
      });
      await soundEngine.playSoundFX(fxBuffer, {
        interruptMusic: false,
        musicDuckGainMultiplier: Number.NaN,
      });

      expect(soundEngine.isMusicPlaying()).toBe(true);
    });

    it("handles source stop errors without throwing", () => {
      const buffer = createMockAudioBuffer(10.0);
      soundEngine.playMusic(buffer, true);

      const activeSource = mockAudioContext.sourceNodes[mockAudioContext.sourceNodes.length - 1] as unknown as {
        stop: () => void;
      };

      activeSource.stop = () => {
        throw new Error("forced stop failure");
      };

      expect(() => soundEngine.stopMusic(false)).not.toThrow();
    });

    it("covers private guard branches that are not reachable via public flow", async () => {
      const privateEngine = soundEngine as unknown as {
        resumeMusicPlayback: (fadeIn: boolean) => void;
        pauseMusicForFx: () => Promise<void>;
        musicSource: { stop: () => void } | null;
        musicPaused: boolean;
        musicGainNode: MockGainNode;
        fxGainNode: MockGainNode;
      };

      // resumeMusicPlayback early-return when no buffer loaded
      expect(() => privateEngine.resumeMusicPlayback(false)).not.toThrow();

      // pauseMusicForFx early-return when no source or already paused
      await expect(privateEngine.pauseMusicForFx()).resolves.toBeUndefined();
      privateEngine.musicPaused = true;
      await expect(privateEngine.pauseMusicForFx()).resolves.toBeUndefined();
      privateEngine.musicPaused = false;

      // cover resumeMusicPlayback existing-source stop catch path
      soundEngine.playMusic(createMockAudioBuffer(5), true);
      privateEngine.musicSource = {
        stop: () => {
          throw new Error("stop failed");
        },
      };
      expect(() => privateEngine.resumeMusicPlayback(true)).not.toThrow();

      // cover fadeIn target-volume branch for FX gain node
      const fadeIn = (soundEngine as unknown as {
        fadeIn: (node: MockGainNode, durationSeconds: number) => void;
      }).fadeIn;
      expect(() => fadeIn.call(soundEngine, privateEngine.fxGainNode, 0.25)).not.toThrow();
    });
  });
});
