import type { SoundManager } from "./sound-manager";

const setElementHidden = (element: Element, hidden: boolean): void => {
  if (hidden) {
    element.setAttribute("hidden", "");
    return;
  }
  element.removeAttribute("hidden");
};

interface AudioUiElements {
  muteSoundButton: HTMLButtonElement;
  muteSoundIconOn: HTMLElement;
  muteSoundIconOff: HTMLElement;
}

interface AudioUiControllerDeps {
  elements: AudioUiElements;
  soundManager: SoundManager;
}

export class AudioUiController {
  private readonly elements: AudioUiElements;

  private readonly soundManager: SoundManager;

  constructor(deps: AudioUiControllerDeps) {
    this.elements = deps.elements;
    this.soundManager = deps.soundManager;
  }

  initializeMuteButtonStates(): void {
    const soundMuted = this.soundManager.getSoundMuted();

    this.setSoundToggleButtonState(soundMuted);
  }

  private setSoundToggleButtonState(muted: boolean): void {
    const { muteSoundButton, muteSoundIconOn, muteSoundIconOff } = this.elements;
    muteSoundButton.setAttribute("aria-pressed", String(muted));
    muteSoundButton.setAttribute("aria-label", muted ? "Unmute sound effects" : "Mute sound effects");
    muteSoundButton.setAttribute("title", muted ? "Unmute sound effects" : "Mute sound effects");
    setElementHidden(muteSoundIconOn, muted);
    setElementHidden(muteSoundIconOff, !muted);
  }

  bindMuteButtonListeners(): void {
    this.elements.muteSoundButton.addEventListener("click", () => {
      const isPressed = this.elements.muteSoundButton.getAttribute("aria-pressed") === "true";
      const newState = !isPressed;
      this.setSoundToggleButtonState(newState);
      this.soundManager.setSoundMuted(newState);
    });
  }
}
