// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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
    // No-op for tests.
  }
}

class MockAudioBufferSourceNode {
  public buffer: AudioBuffer | null = null;

  public loop = false;

  public onended: (() => void) | null = null;

  public connect(): void {
    // No-op for tests.
  }

  public start(): void {
    // No-op for tests.
  }

  public stop(): void {
    this.onended?.();
  }
}

class MockAudioContext {
  public currentTime = 0;

  public destination = {};

  public state: AudioContextState = "running";

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  public async decodeAudioData(): Promise<AudioBuffer> {
    return {
      duration: 1,
      length: 44_100,
      sampleRate: 44_100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(0),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }

  public async resume(): Promise<void> {
    this.state = "running";
  }
}

const loadAppHtml = (): void => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/iu);

  if (bodyMatch === null) {
    throw new Error("Failed to extract app HTML body.");
  }

  document.body.innerHTML = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/giu, "");
};

const createNotFoundResponse = (): Response => {
  return {
    ok: false,
    status: 404,
    headers: new Headers(),
    json: async () => ({}),
    text: async () => "",
  } as Response;
};

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await vi.runAllTimersAsync();
  await Promise.resolve();
};

describe("index win flow integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    loadAppHtml();
    localStorage.clear();

    const fetchMock = vi.fn(async () => createNotFoundResponse());
    vi.stubGlobal("fetch", fetchMock);
    window.fetch = fetchMock;

    vi.stubGlobal("AudioContext", vi.fn(() => new MockAudioContext()));

    Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 1080, configurable: true });
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn().mockReturnValue(false),
      }),
      configurable: true,
    });
    Object.defineProperty(window, "scrollTo", {
      value: vi.fn(),
      configurable: true,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
      configurable: true,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      value: vi.fn(),
      configurable: true,
    });

    const appWindow = document.querySelector<HTMLElement>("#appWindow");

    if (appWindow === null) {
      throw new Error("Expected #appWindow in test DOM.");
    }

    vi.spyOn(appWindow, "getBoundingClientRect").mockReturnValue({
      width: 1024,
      height: 640,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1024,
      bottom: 640,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("saves and renders the winning score through the real index flow", async () => {
    await import("../src/index.js");
    await flushAsyncWork();

    const easyButton = document.querySelector<HTMLButtonElement>('button[data-difficulty="easy"]');
    const debugMenuButton = document.querySelector<HTMLButtonElement>("#debugMenuButton");
    const debugWinButton = document.querySelector<HTMLButtonElement>("#debugWinButton");
    const namePromptOverlay = document.querySelector<HTMLElement>("#namePromptOverlay");
    const namePromptInput = document.querySelector<HTMLInputElement>("#namePromptInput");
    const namePromptOkButton = document.querySelector<HTMLButtonElement>("#namePromptOkButton");
    const menuButton = document.querySelector<HTMLButtonElement>("#menuButton");
    const highScoresButton = document.querySelector<HTMLButtonElement>("#menuHighScoresButton");

    expect(easyButton).not.toBeNull();
    expect(debugMenuButton).not.toBeNull();
    expect(debugWinButton).not.toBeNull();
    expect(namePromptOverlay).not.toBeNull();
    expect(namePromptInput).not.toBeNull();
    expect(namePromptOkButton).not.toBeNull();
    expect(menuButton).not.toBeNull();
    expect(highScoresButton).not.toBeNull();

    easyButton!.click();
    debugMenuButton!.click();
    debugWinButton!.click();

    const remainingButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("#board button[data-index]:not(:disabled)"),
    );

    expect(remainingButtons).toHaveLength(2);

    remainingButtons[0]?.click();
    remainingButtons[1]?.click();

    expect(namePromptOverlay!.hidden).toBe(false);

    namePromptInput!.value = "Index Player";
    namePromptOkButton!.click();
    await flushAsyncWork();

    const storedEntries = JSON.parse(localStorage.getItem("memoryblox.leaderboard") ?? "[]") as Array<{
      playerName?: string;
    }>;

    expect(storedEntries.some((entry) => entry.playerName === "Index Player")).toBe(true);

    menuButton!.click();
    highScoresButton!.click();
    await flushAsyncWork();

    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#leaderboardList tr"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.children[1]?.textContent).toBe("Index Player (debug)");
  });
});