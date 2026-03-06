// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioUiController } from "../src/audio-ui-controller.ts";

const createMockSoundManager = () => ({
  hasMusicTracks: vi.fn(() => true),
  getMusicMuted: vi.fn(() => false),
  isMusicPlaying: vi.fn(() => false),
  isAudioContextRunning: vi.fn(() => false),
  getSoundMuted: vi.fn(() => false),
  setMusicMuted: vi.fn(),
  setSoundMuted: vi.fn(),
  playBackgroundMusic: vi.fn(async () => {}),
  stopBackgroundMusic: vi.fn(),
});

type MockSoundManager = ReturnType<typeof createMockSoundManager>;

const createElements = () => ({
  audioUnlockNotice: document.createElement("div"),
  menuFrame: document.createElement("div"),
  muteMusicButton: document.createElement("button"),
  muteMusicIconOn: document.createElement("span"),
  muteMusicIconOff: document.createElement("span"),
  muteMusicStateText: document.createElement("span"),
  muteSoundButton: document.createElement("button"),
});

const createController = (
  overrides?: Partial<{ soundManager: MockSoundManager }>,
) => {
  const elements = createElements();
  const soundManager = overrides?.soundManager ?? createMockSoundManager();

  // Attach elements to the document so event dispatch works.
  for (const el of Object.values(elements)) {
    document.body.append(el);
  }

  const controller = new AudioUiController({
    elements,
    soundManager: soundManager as unknown as import("../src/sound-manager.ts").SoundManager,
  });

  return { controller, elements, soundManager };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

// ── updateAudioUnlockNotice ──────────────────────────────────────────

describe("updateAudioUnlockNotice", () => {
  it("shows the notice when menu is visible and music is not playing/muted and audio context is not running", () => {
    const { controller, elements } = createController();
    elements.menuFrame.hidden = false;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(false);
  });

  it("hides the notice when the menu frame is hidden", () => {
    const { controller, elements } = createController();
    elements.menuFrame.hidden = true;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(true);
  });

  it("hides the notice when music is muted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(true);
    const { controller, elements } = createController({ soundManager });
    elements.menuFrame.hidden = false;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(true);
  });

  it("hides the notice when music is already playing", () => {
    const soundManager = createMockSoundManager();
    soundManager.isMusicPlaying.mockReturnValue(true);
    const { controller, elements } = createController({ soundManager });
    elements.menuFrame.hidden = false;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(true);
  });

  it("hides the notice when audio context is running", () => {
    const soundManager = createMockSoundManager();
    soundManager.isAudioContextRunning.mockReturnValue(true);
    const { controller, elements } = createController({ soundManager });
    elements.menuFrame.hidden = false;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(true);
  });

  it("hides the notice when no music tracks are available", () => {
    const soundManager = createMockSoundManager();
    soundManager.hasMusicTracks.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });
    elements.menuFrame.hidden = false;

    controller.updateAudioUnlockNotice();

    expect(elements.audioUnlockNotice.hidden).toBe(true);
  });
});

// ── Music toggle button state (via initializeMuteButtonStates) ──────

describe("music toggle button state", () => {
  it("sets full aria attributes and icons for music ON via initializeMuteButtonStates", () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(false);
    soundManager.isMusicPlaying.mockReturnValue(true);
    soundManager.getSoundMuted.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteMusicButton.getAttribute("aria-label")).toBe("Pause music");
    expect(elements.muteMusicButton.getAttribute("title")).toBe("Pause music");
    expect(elements.muteMusicButton.dataset.muted).toBe("false");
    expect(elements.muteMusicIconOn.hidden).toBe(false);
    expect(elements.muteMusicIconOff.hidden).toBe(true);
    expect(elements.muteMusicStateText.textContent).toBe("ON");
  });

  it("sets full aria attributes and icons for music OFF via initializeMuteButtonStates", () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(true);
    soundManager.isMusicPlaying.mockReturnValue(false);
    soundManager.getSoundMuted.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("false");
    expect(elements.muteMusicButton.getAttribute("aria-label")).toBe("Play music");
    expect(elements.muteMusicButton.getAttribute("title")).toBe("Play music");
    expect(elements.muteMusicButton.dataset.muted).toBe("true");
    expect(elements.muteMusicIconOn.hidden).toBe(true);
    expect(elements.muteMusicIconOff.hidden).toBe(false);
    expect(elements.muteMusicStateText.textContent).toBe("OFF");
  });
});

// ── initializeMuteButtonStates ───────────────────────────────────────

describe("initializeMuteButtonStates", () => {
  it("sets music button to ON when music is not muted and playing", () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(false);
    soundManager.isMusicPlaying.mockReturnValue(true);
    soundManager.getSoundMuted.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("sets music button to OFF when music is muted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(true);
    soundManager.isMusicPlaying.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("sets sound button to pressed when sound is muted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getSoundMuted.mockReturnValue(true);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Unmute sound effects");
  });
});

// ── bindMuteButtonListeners ──────────────────────────────────────────

describe("bindMuteButtonListeners", () => {
  it("toggles music ON when clicking the music button that is OFF", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteMusicButton.setAttribute("aria-pressed", "false");

    elements.muteMusicButton.click();

    expect(soundManager.setMusicMuted).toHaveBeenCalledWith(false);
    expect(soundManager.playBackgroundMusic).toHaveBeenCalled();
    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles music OFF when clicking the music button that is ON", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteMusicButton.setAttribute("aria-pressed", "true");

    elements.muteMusicButton.click();

    expect(soundManager.setMusicMuted).toHaveBeenCalledWith(true);
    expect(soundManager.stopBackgroundMusic).toHaveBeenCalled();
    expect(elements.muteMusicButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("toggles sound mute when clicking the sound button", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteSoundButton.setAttribute("aria-pressed", "false");

    elements.muteSoundButton.click();

    expect(soundManager.setSoundMuted).toHaveBeenCalledWith(true);
    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Unmute sound effects");
  });

  it("unmutes sound when clicking the sound button that is pressed", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteSoundButton.setAttribute("aria-pressed", "true");

    elements.muteSoundButton.click();

    expect(soundManager.setSoundMuted).toHaveBeenCalledWith(false);
    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("false");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Mute sound effects");
  });
});

// ── initializeMenuMusicAutoplayRecovery ──────────────────────────────

describe("initializeMenuMusicAutoplayRecovery", () => {
  it("calls playBackgroundMusic during initialization", () => {
    const { controller, soundManager } = createController();

    controller.initializeMenuMusicAutoplayRecovery();

    expect(soundManager.playBackgroundMusic).toHaveBeenCalled();
  });

  it("removes gesture listeners once music starts playing", async () => {
    const soundManager = createMockSoundManager();
    soundManager.isMusicPlaying.mockReturnValue(false);
    soundManager.playBackgroundMusic.mockImplementation(async () => {
      soundManager.isMusicPlaying.mockReturnValue(true);
    });

    const { controller } = createController({ soundManager });

    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    controller.initializeMenuMusicAutoplayRecovery();

    // Wait for the initial tryStartMenuMusic to resolve
    await vi.waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    });

    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
  });

  it("removes gesture listeners when music is muted", async () => {
    const soundManager = createMockSoundManager();
    soundManager.getMusicMuted.mockReturnValue(true);

    const { controller } = createController({ soundManager });
    const removeSpy = vi.spyOn(document, "removeEventListener");

    controller.initializeMenuMusicAutoplayRecovery();

    await vi.waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    });
  });

  it("retries music on gesture event when initial autoplay failed", async () => {
    const soundManager = createMockSoundManager();
    // Initial autoplay fails, music not playing and not muted
    soundManager.isMusicPlaying.mockReturnValue(false);
    soundManager.getMusicMuted.mockReturnValue(false);

    const { controller } = createController({ soundManager });
    controller.initializeMenuMusicAutoplayRecovery();

    // Wait for initial attempt to resolve
    await vi.waitFor(() => {
      expect(soundManager.playBackgroundMusic).toHaveBeenCalledTimes(1);
    });

    // Simulate user gesture — music starts on second attempt
    soundManager.playBackgroundMusic.mockImplementation(async () => {
      soundManager.isMusicPlaying.mockReturnValue(true);
    });

    document.dispatchEvent(new Event("pointerdown"));

    await vi.waitFor(() => {
      expect(soundManager.playBackgroundMusic).toHaveBeenCalledTimes(2);
    });
  });
});
