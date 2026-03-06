import type { SoundManager } from "./sound-manager.js";

interface AudioUiElements {
  audioUnlockNotice: HTMLElement;
  menuFrame: HTMLElement;
  muteMusicButton: HTMLButtonElement;
  muteMusicIconOn: HTMLElement;
  muteMusicIconOff: HTMLElement;
  muteMusicStateText: HTMLElement;
  muteSoundButton: HTMLButtonElement;
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

    this.elements.muteSoundButton.setAttribute("aria-pressed", String(soundMuted));
    this.elements.muteSoundButton.setAttribute("aria-label", soundMuted ? "Unmute sound effects" : "Mute sound effects");
    this.elements.muteSoundButton.setAttribute("title", soundMuted ? "Unmute sound effects" : "Mute sound effects");
  }

  private setMusicToggleButtonState(musicIsOn: boolean): void {
    const { muteMusicButton, muteMusicIconOn, muteMusicIconOff, muteMusicStateText } = this.elements;
    muteMusicButton.setAttribute("aria-pressed", String(musicIsOn));
    muteMusicButton.setAttribute("aria-label", musicIsOn ? "Pause music" : "Play music");
    muteMusicButton.setAttribute("title", musicIsOn ? "Pause music" : "Play music");
    muteMusicButton.dataset.muted = String(!musicIsOn);
    muteMusicIconOn.hidden = !musicIsOn;
    muteMusicIconOff.hidden = musicIsOn;
    muteMusicStateText.textContent = musicIsOn ? "ON" : "OFF";
  }

  initializeMenuMusicAutoplayRecovery(): void {
    const removeRecoveryListeners = (): void => {
      document.removeEventListener("pointerdown", handleGestureAttempt);
      document.removeEventListener("keydown", handleGestureAttempt);
      document.removeEventListener("touchstart", handleGestureAttempt);
    };

    const tryStartMenuMusic = async (): Promise<void> => {
      await this.soundManager.playBackgroundMusic();
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
      this.elements.muteSoundButton.setAttribute("aria-pressed", String(newState));
      this.elements.muteSoundButton.setAttribute("aria-label", newState ? "Unmute sound effects" : "Mute sound effects");
      this.elements.muteSoundButton.setAttribute("title", newState ? "Unmute sound effects" : "Mute sound effects");
      this.soundManager.setSoundMuted(newState);
    });
  }
}
