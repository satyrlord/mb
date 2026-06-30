import { AudioLoader } from "./audio-loader";
import {
  buildAbsoluteAssetUrl,
  discoverAudioFilesInDirectory,
} from "./audio-file-discovery";
import { SoundEngine } from "./sound-engine";
import { shuffle } from "./utils";

const SOUND_MUTE_STORAGE_KEY = "memoryblox-sound-muted";

const AUDIO_FILE_PATTERN = /\.(mp3|wav|ogg|m4a)$/iu;
const TILE_FLIP_FILE_PATTERN = /^flip.*\.(mp3|wav|ogg|m4a)$/iu;
const MATCH_FILE_PATTERN = /^match.*\.(mp3|wav|ogg|m4a)$/iu;
const MISMATCH_FILE_PATTERN = /^mismatch.*\.(mp3|wav|ogg|m4a)$/iu;
const NEW_GAME_FILE_PATTERN = /^newgame.*\.(mp3|wav|ogg|m4a)$/iu;
const WIN_FILE_PATTERN = /^win.*\.(mp3|wav|ogg|m4a)$/iu;

export const selectTileFlipFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => TILE_FLIP_FILE_PATTERN.test(fileName));
};

export const selectNewGameFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => NEW_GAME_FILE_PATTERN.test(fileName));
};

export const selectMatchFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => MATCH_FILE_PATTERN.test(fileName));
};

export const selectMismatchFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => MISMATCH_FILE_PATTERN.test(fileName));
};

export const selectWinFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => WIN_FILE_PATTERN.test(fileName));
};

export const selectGeneralFxFiles = (files: readonly string[]): string[] => {
  return files.filter((fileName) => {
    return AUDIO_FILE_PATTERN.test(fileName)
      && !NEW_GAME_FILE_PATTERN.test(fileName)
      && !WIN_FILE_PATTERN.test(fileName)
      && !MATCH_FILE_PATTERN.test(fileName)
      && !MISMATCH_FILE_PATTERN.test(fileName);
  });
};

// Re-export from audio-file-discovery for backward compatibility with
// existing test imports that reference parseDirectoryListingForAudioFiles
// via this module.
export { parseDirectoryListingForAudioFiles } from "./audio-file-discovery";

class RandomRoundRobinPicker<T> {
  private readonly source: T[] = [];

  private currentCycle: T[] = [];

  private index = 0;

  public setItems(items: readonly T[]): void {
    this.source.length = 0;
    this.source.push(...items);
    this.currentCycle = [];
    this.index = 0;
  }

  public next(): T | null {
    if (this.source.length === 0) {
      return null;
    }

    if (this.index >= this.currentCycle.length) {
      this.currentCycle = shuffle(this.source);

      this.index = 0;
    }

    const value = this.currentCycle[this.index];
    this.index += 1;
    return value;
  }
}

const readStoredMute = (storageKey: string, defaultMuted: boolean): boolean => {
  if (typeof localStorage === "undefined") {
    return defaultMuted;
  }

  const storedValue = localStorage.getItem(storageKey);

  if (storedValue === null) {
    return defaultMuted;
  }

  return storedValue === "true";
};

const writeStoredMute = (storageKey: string, muted: boolean): void => {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(storageKey, String(muted));
};

export const soundManagerTesting = {
  buildAbsoluteAssetUrl,
  readStoredMute,
  writeStoredMute,
};

export class SoundManager {
  private readonly soundEngine: SoundEngine;

  private readonly audioLoader: AudioLoader;

  private readonly fxPicker = new RandomRoundRobinPicker<string>();

  private readonly tileFlipPicker = new RandomRoundRobinPicker<string>();

  private readonly matchPicker = new RandomRoundRobinPicker<string>();

  private readonly mismatchPicker = new RandomRoundRobinPicker<string>();

  private readonly newGamePicker = new RandomRoundRobinPicker<string>();

  private readonly winPicker = new RandomRoundRobinPicker<string>();

  private initialized = false;

  private pendingNewGameFx: Promise<void> | null = null;

  public constructor() {
    this.soundEngine = new SoundEngine();
    this.audioLoader = new AudioLoader(this.soundEngine.getAudioContext());
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const soundFiles = await discoverAudioFilesInDirectory("./sound");

    const soundUrls = soundFiles.map((file) => buildAbsoluteAssetUrl("./sound", file));
    const generalFxUrls = selectGeneralFxFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));
    const tileFlipUrls = selectTileFlipFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));
    const matchUrls = selectMatchFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));
    const mismatchUrls = selectMismatchFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));
    const newGameUrls = selectNewGameFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));
    const winUrls = selectWinFiles(soundFiles)
      .map((fileName) => buildAbsoluteAssetUrl("./sound", fileName));

    this.fxPicker.setItems(generalFxUrls);
    this.tileFlipPicker.setItems(tileFlipUrls);
    this.matchPicker.setItems(matchUrls);
    this.mismatchPicker.setItems(mismatchUrls);
    this.newGamePicker.setItems(newGameUrls);
    this.winPicker.setItems(winUrls);

    this.soundEngine.setSoundFXMuted(readStoredMute(SOUND_MUTE_STORAGE_KEY, false));

    await this.audioLoader.preload([...soundUrls]);

    this.initialized = true;
  }

  public getSoundMuted(): boolean {
    return this.soundEngine.getSoundFXMuted();
  }

  public setSoundMuted(muted: boolean): void {
    this.soundEngine.setSoundFXMuted(muted);
    writeStoredMute(SOUND_MUTE_STORAGE_KEY, muted);
  }

  public async playTileFlip(): Promise<void> {
    await this.waitForPendingNewGameFx();
    await this.playTileFlipFx();
  }

  public async playTileMatch(): Promise<void> {
    await this.waitForPendingNewGameFx();
    await this.playMatchFx();
  }

  public async playTileMismatch(): Promise<void> {
    await this.waitForPendingNewGameFx();
    await this.playMismatchFx();
  }

  public async playWin(onStarted?: (durationMs: number) => void): Promise<number | null> {
    return this.playWinFx(onStarted);
  }

  public async playNewGame(): Promise<void> {
    if (this.pendingNewGameFx !== null) {
      await this.pendingNewGameFx;
      return;
    }

    const playback = this.playNewGameFx();
    this.pendingNewGameFx = playback;
    try {
      await playback;
    } catch (error) {
      // New-game SFX is non-critical; keep gameplay flow alive if playback fails.
      console.warn("[MEMORYBLOX] Failed to play new-game sound:", error);
    } finally {
      this.pendingNewGameFx = null;
    }
  }

  private async waitForPendingNewGameFx(): Promise<void> {
    if (this.pendingNewGameFx === null) {
      return;
    }

    await this.pendingNewGameFx;
  }

  private async playTileFlipFx(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.ensureAudioContextRunning();

    const flipUrl = this.tileFlipPicker.next();

    if (flipUrl === null) {
      return;
    }

    const buffer = await this.audioLoader.load(flipUrl);
    await this.soundEngine.playSoundFX(buffer);
  }

  private async playMatchFx(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.ensureAudioContextRunning();

    const matchUrl = this.matchPicker.next();

    if (matchUrl === null) {
      return;
    }

    const buffer = await this.audioLoader.load(matchUrl);
    await this.soundEngine.playSoundFX(buffer);
  }

  private async playMismatchFx(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.ensureAudioContextRunning();

    const mismatchUrl = this.mismatchPicker.next();

    if (mismatchUrl === null) {
      return;
    }

    const buffer = await this.audioLoader.load(mismatchUrl);
    await this.soundEngine.playSoundFX(buffer);
  }

  private async playNewGameFx(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.ensureAudioContextRunning();

    const newGameUrl = this.newGamePicker.next() ?? this.fxPicker.next();

    if (newGameUrl === null) {
      return;
    }

    const buffer = await this.audioLoader.load(newGameUrl);
    await this.soundEngine.playSoundFX(buffer);
  }

  private async playWinFx(onStarted?: (durationMs: number) => void): Promise<number | null> {
    if (!this.initialized) {
      return null;
    }

    await this.ensureAudioContextRunning();

    const winUrl = this.winPicker.next() ?? this.fxPicker.next();

    if (winUrl === null) {
      return null;
    }

    const buffer = await this.audioLoader.load(winUrl);
    const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
    onStarted?.(durationMs);
    void this.soundEngine.playSoundFX(buffer);
    return durationMs;
  }

  private async ensureAudioContextRunning(): Promise<void> {
    const context = this.soundEngine.getAudioContext() as AudioContext & {
      state?: AudioContextState;
      resume?: () => Promise<void>;
    };

    if (typeof context.resume !== "function") {
      return;
    }

    if (context.state === "running") {
      return;
    }

    try {
      await context.resume();
    } catch {
      // Ignore resume failures; playback will be attempted again on next gesture.
    }
  }
}
