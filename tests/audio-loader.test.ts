import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioLoader } from "../src/audio-loader.js";

// Mock AudioContext and AudioBuffer
class MockAudioContext {
  public async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Create a minimal mock AudioBuffer
    return {
      length: arrayBuffer.byteLength,
      duration: arrayBuffer.byteLength / 44100, // Mock sample rate
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(0),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }
}

describe("AudioLoader", () => {
  let audioLoader: AudioLoader;
  let mockContext: MockAudioContext;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    mockContext = new MockAudioContext();
    audioLoader = new AudioLoader(mockContext as unknown as AudioContext);

    // Save original fetch
    originalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("load", () => {
    it("should load and decode audio from URL", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      const buffer = await audioLoader.load("test.wav");

      expect(buffer).toBeDefined();
      expect(buffer.length).toBe(1024);
      expect(global.fetch).toHaveBeenCalledWith("test.wav");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should cache loaded audio buffers", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      // Load same URL twice
      const buffer1 = await audioLoader.load("test.wav");
      const buffer2 = await audioLoader.load("test.wav");

      // Should return same cached buffer
      expect(buffer1).toBe(buffer2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(audioLoader.isCached("test.wav")).toBe(true);
    });

    it("should throw error on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(audioLoader.load("missing.wav")).rejects.toThrow(
        "Failed to load audio from missing.wav",
      );
    });

    it("should throw error on decode failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      });

      const mockDecodeError = new Error("Invalid audio data");
      vi.spyOn(mockContext, "decodeAudioData").mockRejectedValue(mockDecodeError);

      await expect(audioLoader.load("invalid.wav")).rejects.toThrow(
        "Failed to load audio from invalid.wav",
      );
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(audioLoader.load("network-fail.wav")).rejects.toThrow(
        "Failed to load audio from network-fail.wav",
      );
    });
  });

  describe("preload", () => {
    it("should preload multiple audio files", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      const urls = ["test1.wav", "test2.wav", "test3.wav"];

      await audioLoader.preload(urls);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(audioLoader.isCached("test1.wav")).toBe(true);
      expect(audioLoader.isCached("test2.wav")).toBe(true);
      expect(audioLoader.isCached("test3.wav")).toBe(true);
    });

    it("should continue loading on individual failures", async () => {
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        callCount += 1;

        if (callCount === 2) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: "Not Found",
          });
        }

        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
        });
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const urls = ["test1.wav", "test2.wav", "test3.wav"];

      await audioLoader.preload(urls);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(audioLoader.isCached("test1.wav")).toBe(true);
      expect(audioLoader.isCached("test2.wav")).toBe(false);
      expect(audioLoader.isCached("test3.wav")).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it("should handle empty URL array", async () => {
      await audioLoader.preload([]);

      expect(audioLoader.getCacheSize()).toBe(0);
    });
  });

  describe("cache management", () => {
    it("should report correct cache size", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      expect(audioLoader.getCacheSize()).toBe(0);

      await audioLoader.load("test1.wav");
      expect(audioLoader.getCacheSize()).toBe(1);

      await audioLoader.load("test2.wav");
      expect(audioLoader.getCacheSize()).toBe(2);

      // Loading cached file doesn't increase size
      await audioLoader.load("test1.wav");
      expect(audioLoader.getCacheSize()).toBe(2);
    });

    it("should clear cache", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      await audioLoader.load("test1.wav");
      await audioLoader.load("test2.wav");

      expect(audioLoader.getCacheSize()).toBe(2);

      audioLoader.clearCache();

      expect(audioLoader.getCacheSize()).toBe(0);
      expect(audioLoader.isCached("test1.wav")).toBe(false);
      expect(audioLoader.isCached("test2.wav")).toBe(false);
    });

    it("should check if URL is cached", async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer,
      });

      expect(audioLoader.isCached("test.wav")).toBe(false);

      await audioLoader.load("test.wav");

      expect(audioLoader.isCached("test.wav")).toBe(true);
    });
  });
});
