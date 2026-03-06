import type { SoundManager } from "./sound-manager.js";

const setElementHidden = (element: Element, hidden: boolean): void => {
  if (hidden) {
    element.setAttribute("hidden", "");
    return;
  }
  element.removeAttribute("hidden");
};

interface AudioUiElements {
  audioUnlockNotice: HTMLElement;
  menuFrame: HTMLElement;
  muteMusicButton: HTMLButtonElement;
  muteMusicIconOn: HTMLElement;
  muteMusicIconOff: HTMLElement;
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

  updateAudioUnlockNotice(): void {
    const shouldShow = !this.elements.menuFrame.hidden
      && this.soundManager.hasMusicTracks()
      && !this.soundManager.getMusicMuted()
      && !this.soundManager.isMusicPlaying()
      && !this.soundManager.isAudioContextRunning();

    this.elements.audioUnlockNotice.hidden = !shouldShow;
  }

  initializeMuteButtonStates(): void {
    const musicIsOn = !this.soundManager.getMusicMuted() && this.soundManager.isMusicPlaying();
    const soundMuted = this.soundManager.getSoundMuted();

    this.setMusicToggleButtonState(musicIsOn);

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

  private setMusicToggleButtonState(musicIsOn: boolean): void {
    const { muteMusicButton, muteMusicIconOn, muteMusicIconOff } = this.elements;
    muteMusicButton.setAttribute("aria-pressed", String(musicIsOn));
    muteMusicButton.setAttribute("aria-label", musicIsOn ? "Stop music" : "Start music");
    muteMusicButton.setAttribute("title", musicIsOn ? "Stop music" : "Start music");
    muteMusicButton.dataset.muted = String(!musicIsOn);
    setElementHidden(muteMusicIconOn, !musicIsOn);
    setElementHidden(muteMusicIconOff, musicIsOn);
  }

  initializeMenuMusicAutoplayRecovery(): void {
    const removeRecoveryListeners = (): void => {
      document.removeEventListener("pointerdown", handleGestureAttempt);
      document.removeEventListener("keydown", handleGestureAttempt);
      document.removeEventListener("touchstart", handleGestureAttempt);
    };

    const tryStartMenuMusic = async (): Promise<void> => {
      await this.soundManager.playBackgroundMusic();
      this.initializeMuteButtonStates();
      this.updateAudioUnlockNotice();

      if (this.soundManager.isMusicPlaying() || this.soundManager.getMusicMuted()) {
        removeRecoveryListeners();
      }
    };

    const handleGestureAttempt = (): void => {
      void tryStartMenuMusic();
    };

    document.addEventListener("pointerdown", handleGestureAttempt);
    document.addEventListener("keydown", handleGestureAttempt);
    document.addEventListener("touchstart", handleGestureAttempt, { passive: true });
    this.updateAudioUnlockNotice();
    void tryStartMenuMusic();
  }

  bindMuteButtonListeners(): void {
    this.elements.muteMusicButton.addEventListener("click", () => {
      const isOn = this.elements.muteMusicButton.getAttribute("aria-pressed") === "true";
      const nextIsOn = !isOn;

      this.setMusicToggleButtonState(nextIsOn);

      if (nextIsOn) {
        this.soundManager.setMusicMuted(false);
        void this.soundManager.playBackgroundMusic();
      } else {
        this.soundManager.setMusicMuted(true);
        this.soundManager.stopBackgroundMusic();
      }

      this.updateAudioUnlockNotice();
    });

    this.elements.muteSoundButton.addEventListener("click", () => {
      const isPressed = this.elements.muteSoundButton.getAttribute("aria-pressed") === "true";
      const newState = !isPressed;
      this.setSoundToggleButtonState(newState);
      this.soundManager.setSoundMuted(newState);
    });
  }
}
