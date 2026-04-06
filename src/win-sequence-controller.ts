import type { SoundManager } from "./sound-manager";
import type { WinFxController } from "./win-fx";
import type { UiRuntimeConfig } from "./runtime-config";

interface WinSequenceElements {
  gameFrame: HTMLElement;
  debugTilesFrame: HTMLElement;
}

interface WinSequenceControllerDeps {
  elements: WinSequenceElements;
  soundManager: SoundManager;
  winFxController: WinFxController;
  getGameplayTiming: () => UiRuntimeConfig["gameplayTiming"];
  scaleByAnimationSpeed: (durationMs: number) => number;
  hasActiveGame: () => boolean;
  getActiveGameMode: () => string | null;
  showMenuFrame: () => void;
}

export class WinSequenceController {
  private readonly elements: WinSequenceElements;

  private readonly soundManager: SoundManager;

  private readonly winFxController: WinFxController;

  private readonly getGameplayTiming: () => UiRuntimeConfig["gameplayTiming"];

  private readonly scaleByAnimationSpeed: (durationMs: number) => number;

  private readonly hasActiveGame: () => boolean;

  private readonly getActiveGameMode: () => string | null;

  private readonly showMenuFrame: () => void;

  private winSequenceTimeoutId: number | null = null;

  private winSequenceAbortController: AbortController | null = null;

  constructor(deps: WinSequenceControllerDeps) {
    this.elements = deps.elements;
    this.soundManager = deps.soundManager;
    this.winFxController = deps.winFxController;
    this.getGameplayTiming = deps.getGameplayTiming;
    this.scaleByAnimationSpeed = deps.scaleByAnimationSpeed;
    this.hasActiveGame = deps.hasActiveGame;
    this.getActiveGameMode = deps.getActiveGameMode;
    this.showMenuFrame = deps.showMenuFrame;
  }

  clear(): void {
    this.winSequenceAbortController?.abort();
    this.winSequenceAbortController = null;

    if (this.winSequenceTimeoutId !== null) {
      window.clearTimeout(this.winSequenceTimeoutId);
      this.winSequenceTimeoutId = null;
    }

    this.elements.gameFrame.classList.remove("game-canvas-win-fade-out");
    this.elements.debugTilesFrame.classList.remove("game-canvas-win-fade-out");
  }

  play(textOverride?: string): void {
    this.clear();

    this.winSequenceAbortController = new AbortController();
    const { signal } = this.winSequenceAbortController;
    const gameplayTiming = this.getGameplayTiming();
    const tileAnimationDuration = this.scaleByAnimationSpeed(gameplayTiming.matchedDisappearPauseMs)
      + this.getScaledMatchedDisappearDuration();
    const fadeDuration = this.scaleByAnimationSpeed(gameplayTiming.winCanvasFadeDurationMs);

    this.winSequenceTimeoutId = window.setTimeout(() => {
      if (signal.aborted || !this.hasActiveGame()) {
        return;
      }

      const activeFrame = this.getActiveGameCanvasFrame();

      if (activeFrame !== null) {
        activeFrame.classList.add("game-canvas-win-fade-out");
      }

      this.winSequenceTimeoutId = window.setTimeout(() => {
        this.winSequenceTimeoutId = null;

        if (signal.aborted || !this.hasActiveGame()) {
          return;
        }

        void (async () => {
          let startedWithSound = false;
          const winSoundDurationMs = await this.soundManager.playWin((durationMs) => {
            if (signal.aborted || !this.hasActiveGame()) {
              return;
            }

            startedWithSound = true;
            this.winFxController.play(() => {
              this.showMenuFrame();
            }, textOverride, durationMs);
          });

          if (startedWithSound || signal.aborted || !this.hasActiveGame()) {
            return;
          }

          // Fallback path when no win SFX is available: still show celebration text.
          this.winFxController.play(() => {
            this.showMenuFrame();
          }, textOverride, winSoundDurationMs ?? undefined);
        })();
      }, fadeDuration);
    }, tileAnimationDuration);
  }

  private getScaledMatchedDisappearDuration(): number {
    const gameplayTiming = this.getGameplayTiming();
    const baseDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? gameplayTiming.reducedMotionMatchedDisappearDurationMs
      : gameplayTiming.matchedDisappearDurationMs;

    return this.scaleByAnimationSpeed(baseDuration);
  }

  private getActiveGameCanvasFrame(): HTMLElement | null {
    const mode = this.getActiveGameMode();

    if (mode === null) {
      return null;
    }

    return mode === "debug-tiles"
      ? this.elements.debugTilesFrame
      : this.elements.gameFrame;
  }
}
