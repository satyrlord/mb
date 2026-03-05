import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioLoader } from "../src/audio-loader.js";
import {
  SoundManager,
  selectGeneralFxFiles,
  selectMatchFiles,
  selectMismatchFiles,
  selectNewGameFiles,
  selectWinFiles,
  parseDirectoryListingForAudioFiles,
  soundManagerTesting,
  selectTileFlipFiles,
} from "../src/sound-manager.js";

class MockAudioBufferSourceNode {
  public buffer: AudioBuffer | null = null;

  public loop = false;

  public onended: (() => void) | null = null;

  public connect(): void {
    // no-op
  }

  public start(): void {
    if (this.onended !== null) {
      setTimeout(() => {
        this.onended?.();
      }, 0);
    }
  }

  public stop(): void {
    this.onended?.();
  }
}

class MockGainNode {
  public gain = {
    value: 1,
    defaultValue: 1,
    setValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    linearRampToValueAtTime: vi.fn(),
  };

  public connect(): void {
    // no-op
  }
}

class MockAudioContext {
  public currentTime = 0;

  public destination = {};

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  public async decodeAudioData(): Promise<AudioBuffer> {
    return {
      duration: 1,
      length: 44100,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(0),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }
}

const createJsonResponse = (data: unknown): Response => {
  return {
    ok: true,
    json: async () => data,
    headers: { get: () => "application/json" },
  } as unknown as Response;
};

const createNotFoundResponse = (): Response => {
  return {
    ok: false,
    status: 404,
    statusText: "Not Found",
  } as Response;
};

const createAudioResponse = (): Response => {
  return {
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(512),
  } as Response;
};

const createTextResponse = (contentType: string, text: string): Response => {
  return {
    ok: true,
    headers: { get: () => contentType },
    text: async () => text,
  } as unknown as Response;
};

describe("SoundManager", () => {
  beforeEach(() => {
    global.AudioContext = vi.fn(() => new MockAudioContext()) as unknown as typeof AudioContext;
    vi.spyOn(Math, "random").mockReturnValue(0);

    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string): string | null => storage.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          storage.set(key, value);
        },
        removeItem: (key: string): void => {
          storage.delete(key);
        },
        clear: (): void => {
          storage.clear();
        },
      } as Storage,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("parses audio files from a directory listing", () => {
    const html = `
      <html><body>
        <a href="flip01.wav">flip01.wav</a>
        <a href="notes.txt">notes.txt</a>
        <a href="./theme.mp3">theme.mp3</a>
      </body></html>
    `;

    const files = parseDirectoryListingForAudioFiles(html);

    expect(files).toEqual(["flip01.wav", "theme.mp3"]);
  });

  it("normalizes asset URLs when directory has a trailing slash", () => {
    expect(soundManagerTesting.buildAbsoluteAssetUrl("./sound/", "flip01.wav")).toBe("./sound/flip01.wav");
  });

  it("readStoredMute and writeStoredMute no-op safely when localStorage is unavailable", () => {
    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    });

    expect(soundManagerTesting.readStoredMute("x", true)).toBe(true);
    expect(() => soundManagerTesting.writeStoredMute("x", false)).not.toThrow();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalStorage,
    });
  });

  it("readStoredMute falls back when key is missing", () => {
    localStorage.removeItem("missing");
    expect(soundManagerTesting.readStoredMute("missing", false)).toBe(false);
    expect(soundManagerTesting.readStoredMute("missing", true)).toBe(true);
  });

  it("loads json file lists from array and object payloads", async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn(async () => createJsonResponse(["a.wav", "b.mp3"])) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromJson("./sound")).resolves.toEqual(["a.wav", "b.mp3"]);

    global.fetch = vi.fn(async () => createJsonResponse({ files: ["c.ogg", 99, "d.m4a"] })) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromJson("./sound")).resolves.toEqual(["c.ogg", "d.m4a"]);

    global.fetch = originalFetch;
  });

  it("returns null for unsupported json payload or non-ok response", async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn(async () => createJsonResponse({ bad: true })) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromJson("./sound")).resolves.toBeNull();

    global.fetch = vi.fn(async () => createNotFoundResponse()) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromJson("./sound")).resolves.toBeNull();

    global.fetch = originalFetch;
  });

  it("loads asset index endpoint lists and handles non-ok response", async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn(async () => createJsonResponse({ files: ["x.wav", "y.mp3"] })) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromAssetIndexEndpoint("./sound")).resolves.toEqual(["x.wav", "y.mp3"]);

    global.fetch = vi.fn(async () => createNotFoundResponse()) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromAssetIndexEndpoint("./sound")).resolves.toBeNull();

    global.fetch = originalFetch;
  });

  it("loads directory html lists only for html responses", async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn(async () => createTextResponse("application/json", "[]")) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromDirectoryHtml("./sound")).resolves.toBeNull();

    global.fetch = vi.fn(async () => createTextResponse(
      "text/html",
      `<a href='flip01.wav'>flip</a><a href='notes.txt'>notes</a>`,
    )) as typeof fetch;
    await expect(soundManagerTesting.tryLoadFileListFromDirectoryHtml("./sound")).resolves.toEqual(["flip01.wav"]);

    global.fetch = originalFetch;
  });

  it("discovers audio files by falling through strategies and filtering results", async () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./sound/index.json")) {
        throw new Error("transient");
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({ files: ["flip01.wav", "", "README.md", "newgame1.wav", "flip01.wav"] });
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const files = await soundManagerTesting.discoverAudioFilesInDirectory("./sound");
    expect(files).toEqual(["flip01.wav", "newgame1.wav"]);

    global.fetch = originalFetch;
  });

  it("public playback methods safely no-op before initialize", async () => {
    const soundManager = new SoundManager();

    await expect(soundManager.playBackgroundMusic()).resolves.toBeUndefined();
    await expect(soundManager.playTileFlip()).resolves.toBeUndefined();
    await expect(soundManager.playTileMatch()).resolves.toBeUndefined();
    await expect(soundManager.playTileMismatch()).resolves.toBeUndefined();
    await expect(soundManager.playNewGame()).resolves.toBeUndefined();
    await expect(soundManager.playWin()).resolves.toBeNull();
  });

  it("initialize is idempotent", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    });

    global.fetch = fetchSpy as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();
    const firstCallCount = fetchSpy.mock.calls.length;
    await soundManager.initialize();

    expect(fetchSpy.mock.calls.length).toBe(firstCallCount);
  });

  it("playback methods handle empty discovered pools", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    await expect(soundManager.playTileFlip()).resolves.toBeUndefined();
    await expect(soundManager.playTileMatch()).resolves.toBeUndefined();
    await expect(soundManager.playTileMismatch()).resolves.toBeUndefined();
    await expect(soundManager.playNewGame()).resolves.toBeUndefined();
    await expect(soundManager.playWin()).resolves.toBeNull();
  });

  it("ensureAudioContextRunning handles running/no-resume/failed-resume scenarios", async () => {
    class ResumeAudioContext extends MockAudioContext {
      public state: AudioContextState = "suspended";

      public async resume(): Promise<void> {
        this.state = "running";
      }
    }

    global.AudioContext = vi.fn(() => new ResumeAudioContext()) as unknown as typeof AudioContext;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith("./music/index.json")) {
        return createJsonResponse(["01.mp3"]);
      }
      if (url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }
      if (url.includes("./music/")) {
        return createAudioResponse();
      }
      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();
    soundManager.setMusicMuted(false);
    await expect(soundManager.playBackgroundMusic()).resolves.toBeUndefined();

    const runningContext = (soundManager as unknown as { soundEngine: { getAudioContext: () => AudioContext & { state?: AudioContextState } } })
      .soundEngine
      .getAudioContext();
    if (runningContext.state !== undefined) {
      runningContext.state = "running";
    }
    await expect(soundManager.playBackgroundMusic()).resolves.toBeUndefined();
  });

  it("selects only flip* files for tile flip pool", () => {
    const selected = selectTileFlipFiles([
      "flip01.wav",
      "flip02.wav",
      "match.wav",
      "newgame1.wav",
      "flip07.wav",
      "win.wav",
    ]);

    expect(selected).toEqual(["flip01.wav", "flip02.wav", "flip07.wav"]);
  });

  it("selects only newgame* files for new-game pool", () => {
    const selected = selectNewGameFiles([
      "flip01.wav",
      "newgame1.wav",
      "newgame2.wav",
      "match.wav",
      "newgame4.wav",
      "win.wav",
    ]);

    expect(selected).toEqual(["newgame1.wav", "newgame2.wav", "newgame4.wav"]);
  });

  it("selects only match* files for match pool", () => {
    const selected = selectMatchFiles([
      "flip01.wav",
      "match.wav",
      "match_alt.wav",
      "mismatch.wav",
      "newgame1.wav",
    ]);

    expect(selected).toEqual(["match.wav", "match_alt.wav"]);
  });

  it("selects only mismatch* files for mismatch pool", () => {
    const selected = selectMismatchFiles([
      "flip01.wav",
      "match.wav",
      "mismatch.wav",
      "mismatch_alt.wav",
      "newgame1.wav",
    ]);

    expect(selected).toEqual(["mismatch.wav", "mismatch_alt.wav"]);
  });

  it("selects only win* files for win pool", () => {
    const selected = selectWinFiles([
      "flip01.wav",
      "win.wav",
      "win_bonus.wav",
      "newgame1.wav",
      "match.wav",
    ]);

    expect(selected).toEqual(["win.wav", "win_bonus.wav"]);
  });

  it("excludes newgame* and win* files from generic FX pool", () => {
    const selected = selectGeneralFxFiles([
      "flip01.wav",
      "match.wav",
      "mismatch.wav",
      "newgame1.wav",
      "win.wav",
      "win_alt.wav",
      "match.wav",
      "mismatch.wav",
      "theme.mp3",
      "notes.txt",
    ]);

    expect(selected).toEqual(["flip01.wav", "theme.mp3"]);
  });

  it("plays match sounds only from match* pool", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: ["flip01.wav", "match.wav", "mismatch.wav", "newgame1.wav", "win.wav"],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();
    const loadSpy = vi.spyOn(AudioLoader.prototype, "load");
    loadSpy.mockClear();

    await soundManager.playTileMatch();

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith("./sound/match.wav");
  });

  it("plays mismatch sounds only from mismatch* pool", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: ["flip01.wav", "match.wav", "mismatch.wav", "newgame1.wav", "win.wav"],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();
    const loadSpy = vi.spyOn(AudioLoader.prototype, "load");
    loadSpy.mockClear();

    await soundManager.playTileMismatch();

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith("./sound/mismatch.wav");
  });

  it("plays tile flips from flip* random round-robin pool", async () => {
    const fetchedUrls: string[] = [];

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      fetchedUrls.push(url);

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3", "13.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: [
            "flip01.wav",
            "flip02.wav",
            "flip03.wav",
            "flip04.wav",
            "flip05.wav",
            "flip06.wav",
            "flip07.wav",
            "match.wav",
            "mismatch.wav",
          ],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();
    await soundManager.playTileFlip();

    const fxLoads = fetchedUrls.filter((url) => /\.\/sound\/.+\.(wav|mp3|ogg|m4a)$/iu.test(url));
    const flipLoads = fxLoads.filter((url) => url.includes("./sound/flip"));
    const firstCycleUnique = new Set(flipLoads.slice(0, 7));

    expect(flipLoads.length).toBeGreaterThanOrEqual(7);
    expect(firstCycleUnique.size).toBe(7);
  });

  it("plays new-game sounds from newgame* random round-robin pool", async () => {
    const fetchedUrls: string[] = [];

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      fetchedUrls.push(url);

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: [
            "newgame1.wav",
            "newgame2.wav",
            "newgame3.wav",
            "newgame4.wav",
            "win.wav",
            "flip01.wav",
            "match.wav",
          ],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    await soundManager.playNewGame();
    await soundManager.playNewGame();
    await soundManager.playNewGame();
    await soundManager.playNewGame();

    const fxLoads = fetchedUrls.filter((url) => /\.\/sound\/.+\.(wav|mp3|ogg|m4a)$/iu.test(url));
    const newGameLoads = fxLoads.filter((url) => url.includes("./sound/newgame"));
    const uniqueFirstCycle = new Set(newGameLoads.slice(0, 4));

    expect(newGameLoads.length).toBeGreaterThanOrEqual(4);
    expect(uniqueFirstCycle.size).toBe(4);
  });

  it("plays win sounds from win* pool", async () => {
    const fetchedUrls: string[] = [];

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      fetchedUrls.push(url);

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: ["win.wav", "win_alt.wav", "flip01.wav", "match.wav"],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    const durationMs = await soundManager.playWin();

    const fxLoads = fetchedUrls.filter((url) => /\.\/sound\/.+\.(wav|mp3|ogg|m4a)$/iu.test(url));
    const winLoads = fxLoads.filter((url) => url.includes("./sound/win"));

    expect(winLoads.length).toBeGreaterThanOrEqual(1);
    expect(durationMs).toBeGreaterThan(0);
  });

  it("playWin invokes onStarted callback with correct duration", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createNotFoundResponse();
      }

      if (url.includes("/__asset-index?dir=.%2Fmusic")) {
        return createJsonResponse({ files: ["01.mp3"] });
      }

      if (url.includes("/__asset-index?dir=.%2Fsound")) {
        return createJsonResponse({
          files: ["win.wav", "flip01.wav"],
        });
      }

      if (url.includes("./music/") || url.includes("./sound/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    const onStarted = vi.fn();
    const durationMs = await soundManager.playWin(onStarted);

    expect(onStarted).toHaveBeenCalledOnce();
    expect(onStarted).toHaveBeenCalledWith(durationMs);
    expect(durationMs).toBeGreaterThan(0);
  });

  it("stores and exposes mute state", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    await soundManager.initialize();

    soundManager.setMusicMuted(true);
    soundManager.setSoundMuted(true);

    expect(soundManager.getMusicMuted()).toBe(true);
    expect(soundManager.getSoundMuted()).toBe(true);
    expect(localStorage.getItem("memoryblox-music-muted")).toBe("true");
    expect(localStorage.getItem("memoryblox-sound-muted")).toBe("true");
  });

  it("forces music muted on refresh regardless of stored preference", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    localStorage.setItem("memoryblox-music-muted", "false");

    const soundManager = new SoundManager();
    await soundManager.initialize();

    expect(soundManager.getMusicMuted()).toBe(true);
    expect(soundManager.getSoundMuted()).toBe(false);
    expect(localStorage.getItem("memoryblox-music-muted")).toBe("true");
  });

  it("hasMusicTracks returns false before init and true after init with music files", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json")) {
        return createJsonResponse(["theme.mp3"]);
      }

      if (url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      if (url.includes("./music/")) {
        return createAudioResponse();
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    expect(soundManager.hasMusicTracks()).toBe(false);

    await soundManager.initialize();
    expect(soundManager.hasMusicTracks()).toBe(true);
  });

  it("isMusicPlaying returns false when no music has been started", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    expect(soundManager.isMusicPlaying()).toBe(false);

    await soundManager.initialize();
    expect(soundManager.isMusicPlaying()).toBe(false);
  });

  it("playNewGame plays sound on second call after first completes", async () => {
    const originalAudioContext = global.AudioContext;

    try {
      let bufferSourceCount = 0;
      const OriginalMockContext = MockAudioContext;

      class TrackingMockContext extends OriginalMockContext {
        public override createBufferSource(): MockAudioBufferSourceNode {
          bufferSourceCount += 1;
          return super.createBufferSource();
        }
      }

      global.AudioContext = vi.fn(() => new TrackingMockContext()) as unknown as typeof AudioContext;

      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
          return createNotFoundResponse();
        }

        if (url.includes("/__asset-index?dir=.%2Fmusic")) {
          return createJsonResponse({ files: ["01.mp3"] });
        }

        if (url.includes("/__asset-index?dir=.%2Fsound")) {
          return createJsonResponse({
            files: ["newgame1.wav", "newgame2.wav", "flip01.wav"],
          });
        }

        if (url.includes("./music/") || url.includes("./sound/")) {
          return createAudioResponse();
        }

        return createNotFoundResponse();
      }) as typeof fetch;

      const soundManager = new SoundManager();
      await soundManager.initialize();

      bufferSourceCount = 0;

      await soundManager.playNewGame();
      await soundManager.playNewGame();

      expect(bufferSourceCount).toBe(2);
    } finally {
      global.AudioContext = originalAudioContext;
    }
  });

  it("playNewGame clears pendingNewGameFx even when playback fails", async () => {
    const originalAudioContext = global.AudioContext;

    try {
      let callCount = 0;

      class FailingContext extends MockAudioContext {
        public override createBufferSource(): MockAudioBufferSourceNode {
          callCount += 1;
          throw new Error("simulated playback failure");
        }
      }

      global.AudioContext = vi.fn(() => new FailingContext()) as unknown as typeof AudioContext;

      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
          return createNotFoundResponse();
        }

        if (url.includes("/__asset-index?dir=.%2Fmusic")) {
          return createJsonResponse({ files: ["01.mp3"] });
        }

        if (url.includes("/__asset-index?dir=.%2Fsound")) {
          return createJsonResponse({
            files: ["newgame1.wav", "flip01.wav"],
          });
        }

        if (url.includes("./music/") || url.includes("./sound/")) {
          return createAudioResponse();
        }

        return createNotFoundResponse();
      }) as typeof fetch;

      const soundManager = new SoundManager();
      await soundManager.initialize();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // First call should not throw and must still clear pending state
      await expect(soundManager.playNewGame()).resolves.toBeUndefined();

      // Second call must not short-circuit — it should attempt playback again
      await expect(soundManager.playNewGame()).resolves.toBeUndefined();

      expect(callCount).toBe(2);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    } finally {
      global.AudioContext = originalAudioContext;
    }
  });

  it("stopBackgroundMusic does not throw before or after initialize", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("./music/index.json") || url.endsWith("./sound/index.json")) {
        return createJsonResponse([]);
      }

      return createNotFoundResponse();
    }) as typeof fetch;

    const soundManager = new SoundManager();
    expect(() => soundManager.stopBackgroundMusic()).not.toThrow();

    await soundManager.initialize();
    expect(() => soundManager.stopBackgroundMusic()).not.toThrow();
  });
});
