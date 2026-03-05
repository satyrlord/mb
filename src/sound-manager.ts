import { AudioLoader } from "./audio-loader.js";
import { SoundEngine } from "./sound-engine.js";
import { shuffle } from "./utils.js";

const MUSIC_MUTE_STORAGE_KEY = "memoryblox-music-muted";
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

/**
 * Extracts audio filenames from an HTML directory listing.
 *
 * Trust boundary note: `html` may originate from a dev-server directory
 * listing. Only filenames matching `AUDIO_FILE_PATTERN` are kept; results
 * are used solely as fetch URLs for audio assets — never injected as markup.
 */
export const parseDirectoryListingForAudioFiles = (html: string): string[] => {
  const hrefPattern = /href=["']([^"']+)["']/giu;
  const discovered = new Set<string>();
  let match = hrefPattern.exec(html);

  while (match !== null) {
    const href = decodeURIComponent(match[1]);
    const pathSegments = href.split("/").filter((value) => value.length > 0);
    const fileName = pathSegments[pathSegments.length - 1];

    if (fileName !== undefined && AUDIO_FILE_PATTERN.test(fileName)) {
      discovered.add(fileName);
    }

    match = hrefPattern.exec(html);
  }

  return Array.from(discovered);
};

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

const buildAbsoluteAssetUrl = (directory: string, fileName: string): string => {
  const normalizedDirectory = directory.endsWith("/")
    ? directory.slice(0, -1)
    : directory;
  return `${normalizedDirectory}/${fileName}`;
};

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

const tryLoadFileListFromJson = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`${directory}/index.json`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();

  if (Array.isArray(data)) {
    return data.filter((value): value is string => typeof value === "string");
  }

  if (
    typeof data === "object"
    && data !== null
    && "files" in data
    && Array.isArray((data as { files: unknown }).files)
  ) {
    return (data as { files: unknown[] }).files.filter((value): value is string => typeof value === "string");
  }

  return null;
};

const tryLoadFileListFromAssetIndexEndpoint = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`/__asset-index?dir=${encodeURIComponent(directory.replace(/^\//u, ""))}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();

  if (
    typeof data === "object"
    && data !== null
    && "files" in data
    && Array.isArray((data as { files: unknown }).files)
  ) {
    return (data as { files: unknown[] }).files.filter((value): value is string => typeof value === "string");
  }

  return null;
};

const tryLoadFileListFromDirectoryHtml = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`${directory}/`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("text/html")) {
    return null;
  }

  const html = await response.text();
  return parseDirectoryListingForAudioFiles(html);
};

const discoverAudioFilesInDirectory = async (directory: string): Promise<string[]> => {
  const methods = [
    { label: "JSON index", load: () => tryLoadFileListFromJson(directory) },
    { label: "asset-index endpoint", load: () => tryLoadFileListFromAssetIndexEndpoint(directory) },
    { label: "HTML directory listing", load: () => tryLoadFileListFromDirectoryHtml(directory) },
  ];

  for (const method of methods) {
    try {
      const result = await method.load();

      if (result === null) {
        continue;
      }

      const filtered = result
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .filter((value) => AUDIO_FILE_PATTERN.test(value));

      if (filtered.length > 0) {
        console.log(`[MEMORYBLOX] ${directory}: discovered ${filtered.length} audio file(s) via ${method.label}.`);
        return Array.from(new Set(filtered));
      }
    } catch {
      continue;
    }
  }

  return [];
};

export const soundManagerTesting = {
  buildAbsoluteAssetUrl,
  readStoredMute,
  writeStoredMute,
  tryLoadFileListFromJson,
  tryLoadFileListFromAssetIndexEndpoint,
  tryLoadFileListFromDirectoryHtml,
  discoverAudioFilesInDirectory,
};

export class SoundManager {
  private readonly soundEngine: SoundEngine;

  private readonly audioLoader: AudioLoader;

  private readonly musicPicker = new RandomRoundRobinPicker<string>();

  private readonly fxPicker = new RandomRoundRobinPicker<string>();

  private readonly tileFlipPicker = new RandomRoundRobinPicker<string>();

  private readonly matchPicker = new RandomRoundRobinPicker<string>();

  private readonly mismatchPicker = new RandomRoundRobinPicker<string>();

  private readonly newGamePicker = new RandomRoundRobinPicker<string>();

  private readonly winPicker = new RandomRoundRobinPicker<string>();

  private initialized = false;

  private pendingNewGameFx: Promise<void> | null = null;

  private musicTrackCount = 0;

  public constructor() {
    this.soundEngine = new SoundEngine();
    this.audioLoader = new AudioLoader(this.soundEngine.getAudioContext());
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const [musicFiles, soundFiles] = await Promise.all([
      discoverAudioFilesInDirectory("./music"),
      discoverAudioFilesInDirectory("./sound"),
    ]);

    const musicUrls = musicFiles.map((file) => buildAbsoluteAssetUrl("./music", file));
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

    this.musicPicker.setItems(musicUrls);
    this.fxPicker.setItems(generalFxUrls);
    this.tileFlipPicker.setItems(tileFlipUrls);
    this.matchPicker.setItems(matchUrls);
    this.mismatchPicker.setItems(mismatchUrls);
    this.newGamePicker.setItems(newGameUrls);
    this.winPicker.setItems(winUrls);

    this.soundEngine.setMusicMuted(true);
    writeStoredMute(MUSIC_MUTE_STORAGE_KEY, true);
    this.soundEngine.setSoundFXMuted(readStoredMute(SOUND_MUTE_STORAGE_KEY, false));

    await this.audioLoader.preload([...musicUrls, ...soundUrls]);

    this.musicTrackCount = musicUrls.length;

    this.initialized = true;
  }

  public hasMusicTracks(): boolean {
    return this.musicTrackCount > 0;
  }

  public isAudioContextRunning(): boolean {
    const context = this.soundEngine.getAudioContext() as AudioContext & {
      state?: AudioContextState;
    };

    if (context.state === undefined) {
      return true;
    }

    return context.state === "running";
  }

  public getMusicMuted(): boolean {
    return this.soundEngine.getMusicMuted();
  }

  public getSoundMuted(): boolean {
    return this.soundEngine.getSoundFXMuted();
  }

  public isMusicPlaying(): boolean {
    return this.soundEngine.isMusicPlaying();
  }

  public setMusicMuted(muted: boolean): void {
    this.soundEngine.setMusicMuted(muted);
    writeStoredMute(MUSIC_MUTE_STORAGE_KEY, muted);
  }

  public setSoundMuted(muted: boolean): void {
    this.soundEngine.setSoundFXMuted(muted);
    writeStoredMute(SOUND_MUTE_STORAGE_KEY, muted);
  }

  public async playBackgroundMusic(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    if (this.soundEngine.getMusicMuted()) {
      return;
    }

    await this.ensureAudioContextRunning();

    if (this.soundEngine.isMusicPlaying()) {
      return;
    }

    const trackUrl = this.musicPicker.next();

    if (trackUrl === null) {
      return;
    }

    const buffer = await this.audioLoader.load(trackUrl);
    this.soundEngine.playMusic(buffer, true);
  }

  public stopBackgroundMusic(): void {
    this.soundEngine.stopMusic(false);
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
    await this.soundEngine.playSoundFX(buffer, { interruptMusic: false });
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
    await this.soundEngine.playSoundFX(buffer, { interruptMusic: false });
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
    await this.soundEngine.playSoundFX(buffer, { interruptMusic: false });
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
    await this.soundEngine.playSoundFX(buffer, {
      interruptMusic: false,
      musicDuckGainMultiplier: 0.3,
    });
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
    void this.soundEngine.playSoundFX(buffer, {
      interruptMusic: false,
      musicDuckGainMultiplier: 0.3,
    });
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
