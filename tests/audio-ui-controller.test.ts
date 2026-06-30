// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioUiController } from "../src/audio-ui-controller.ts";

const createMockSoundManager = () => ({
  getSoundMuted: vi.fn(() => false),
  setSoundMuted: vi.fn(),
});

type MockSoundManager = ReturnType<typeof createMockSoundManager>;

const createElements = () => ({
  muteSoundButton: document.createElement("button"),
  muteSoundIconOn: document.createElement("span"),
  muteSoundIconOff: document.createElement("span"),
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

// ── initializeMuteButtonStates ───────────────────────────────────────

describe("initializeMuteButtonStates", () => {
  it("sets sound button to pressed when sound is muted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getSoundMuted.mockReturnValue(true);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Unmute sound effects");
    expect(elements.muteSoundIconOn.hidden).toBe(true);
    expect(elements.muteSoundIconOff.hidden).toBe(false);
  });

  it("sets hidden attribute on sound icons when sound is unmuted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getSoundMuted.mockReturnValue(false);
    const { controller, elements } = createController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteSoundIconOn.hasAttribute("hidden")).toBe(false);
    expect(elements.muteSoundIconOff.hasAttribute("hidden")).toBe(true);
  });
});

// ── bindMuteButtonListeners ──────────────────────────────────────────

describe("bindMuteButtonListeners", () => {
  it("toggles sound mute when clicking the sound button", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteSoundButton.setAttribute("aria-pressed", "false");

    elements.muteSoundButton.click();

    expect(soundManager.setSoundMuted).toHaveBeenCalledWith(true);
    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("true");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Unmute sound effects");
    expect(elements.muteSoundIconOn.hidden).toBe(true);
    expect(elements.muteSoundIconOff.hidden).toBe(false);
  });

  it("unmutes sound when clicking the sound button that is pressed", () => {
    const { controller, elements, soundManager } = createController();
    controller.bindMuteButtonListeners();
    elements.muteSoundButton.setAttribute("aria-pressed", "true");

    elements.muteSoundButton.click();

    expect(soundManager.setSoundMuted).toHaveBeenCalledWith(false);
    expect(elements.muteSoundButton.getAttribute("aria-pressed")).toBe("false");
    expect(elements.muteSoundButton.getAttribute("aria-label")).toBe("Mute sound effects");
    expect(elements.muteSoundIconOn.hidden).toBe(false);
    expect(elements.muteSoundIconOff.hidden).toBe(true);
  });
});

// ── SVG icon hidden attribute toggling ───────────────────────────────
// Regression: inline SVG elements are SVGElement, not HTMLElement.
// The .hidden IDL property does not reliably set the HTML hidden attribute
// on SVGs, so the controller must use setAttribute/removeAttribute.

const createSvgElements = () => ({
  muteSoundButton: document.createElement("button"),
  muteSoundIconOn: document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as HTMLElement,
  muteSoundIconOff: document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as HTMLElement,
});

const createSvgController = (
  overrides?: Partial<{ soundManager: MockSoundManager }>,
) => {
  const elements = createSvgElements();
  const soundManager = overrides?.soundManager ?? createMockSoundManager();

  for (const el of Object.values(elements)) {
    document.body.append(el);
  }

  const controller = new AudioUiController({
    elements,
    soundManager: soundManager as unknown as import("../src/sound-manager.ts").SoundManager,
  });

  return { controller, elements, soundManager };
};

describe("SVG icon hidden attribute toggling", () => {
  it("sets hidden attribute on SVG sound icon when sound is muted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getSoundMuted.mockReturnValue(true);
    const { controller, elements } = createSvgController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteSoundIconOn.hasAttribute("hidden")).toBe(true);
    expect(elements.muteSoundIconOff.hasAttribute("hidden")).toBe(false);
  });

  it("removes hidden attribute on SVG sound icon when sound is unmuted", () => {
    const soundManager = createMockSoundManager();
    soundManager.getSoundMuted.mockReturnValue(false);
    const { controller, elements } = createSvgController({ soundManager });

    controller.initializeMuteButtonStates();

    expect(elements.muteSoundIconOn.hasAttribute("hidden")).toBe(false);
    expect(elements.muteSoundIconOff.hasAttribute("hidden")).toBe(true);
  });

  it("toggles hidden attribute on SVG icons when clicking sound button", () => {
    const { controller, elements } = createSvgController();
    controller.bindMuteButtonListeners();
    elements.muteSoundButton.setAttribute("aria-pressed", "false");

    elements.muteSoundButton.click();

    expect(elements.muteSoundIconOn.hasAttribute("hidden")).toBe(true);
    expect(elements.muteSoundIconOff.hasAttribute("hidden")).toBe(false);

    elements.muteSoundButton.click();

    expect(elements.muteSoundIconOn.hasAttribute("hidden")).toBe(false);
    expect(elements.muteSoundIconOff.hasAttribute("hidden")).toBe(true);
  });
});
