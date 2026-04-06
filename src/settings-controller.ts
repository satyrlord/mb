import {
  DEFAULT_EMOJI_PACK_ID,
  getEmojiPacks,
  type EmojiPackId,
} from "./icons";
import { clampTileMultiplier } from "./tile-layout";
import { clamp } from "./utils";

const EMOJI_PACK_STORAGE_KEY = "memoryblox-emoji-pack";
const TILE_MULTIPLIER_STORAGE_KEY = "memoryblox-tile-multiplier";
const ANIMATION_SPEED_STORAGE_KEY = "memoryblox-animation-speed";

export interface AnimationSpeedLimits {
  minSpeed: number;
  maxSpeed: number;
  defaultSpeed: number;
}

export interface SettingsControllerDeps {
  settingsPackListElement: HTMLElement;
  settingsTileMultiplierInput: HTMLInputElement;
  settingsAnimationSpeedInput: HTMLInputElement;
  settingsApplyButton: HTMLButtonElement;
  getAnimationSpeedLimits: () => AnimationSpeedLimits;
  applyAnimationSpeed: (speed: number) => void;
  setStatus: (message: string) => void;
  showMenuFrame: () => void;
}

/**
 * Manages settings state with a two-phase commit pattern.
 *
 * `setPending*()` updates the pending (uncommitted) value shown in the UI.
 * `applyPending*()` commits pending → selected and persists to localStorage.
 * `resetPendingToSelected()` discards uncommitted changes when the settings
 * frame reopens.
 */
export class SettingsController {
  private readonly deps: SettingsControllerDeps;
  private readonly emojiPacks = getEmojiPacks();

  private selectedEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
  private pendingEmojiPackId: EmojiPackId = DEFAULT_EMOJI_PACK_ID;
  private selectedTileMultiplier = 1;
  private pendingTileMultiplier = 1;
  private selectedAnimationSpeed: number;
  private pendingAnimationSpeed: number;

  public constructor(deps: SettingsControllerDeps) {
    this.deps = deps;
    const limits = deps.getAnimationSpeedLimits();
    this.selectedAnimationSpeed = limits.defaultSpeed;
    this.pendingAnimationSpeed = limits.defaultSpeed;
  }

  // ── Public getters ─────────────────────────────────────────────────

  public getSelectedEmojiPackId(): EmojiPackId {
    return this.selectedEmojiPackId;
  }

  public getSelectedTileMultiplier(): number {
    return this.selectedTileMultiplier;
  }

  public getSelectedAnimationSpeed(): number {
    return this.selectedAnimationSpeed;
  }

  public getEmojiPackLabel(packId: EmojiPackId): string {
    const match = this.emojiPacks.find((pack) => pack.id === packId);
    return match?.name ?? "Unknown";
  }

  // ── Pending setters ────────────────────────────────────────────────

  public setPendingEmojiPack(packId: EmojiPackId): void {
    this.pendingEmojiPackId = packId;
    this.renderEmojiPackSelection();
  }

  public setPendingTileMultiplier(multiplier: number): void {
    this.pendingTileMultiplier = clampTileMultiplier(multiplier);
    this.deps.settingsTileMultiplierInput.value =
      this.pendingTileMultiplier.toString();
  }

  public setPendingAnimationSpeed(speed: number): void {
    this.pendingAnimationSpeed = this.clampAnimationSpeed(speed);
    this.deps.settingsAnimationSpeedInput.value =
      this.pendingAnimationSpeed.toString();
  }

  // ── Apply (commit) ─────────────────────────────────────────────────

  public applyPendingEmojiPack(): boolean {
    if (this.pendingEmojiPackId === this.selectedEmojiPackId) {
      return false;
    }

    this.selectedEmojiPackId = this.pendingEmojiPackId;
    writeStoredEmojiPackId(this.selectedEmojiPackId);
    this.renderEmojiPackSelection();
    return true;
  }

  public applyPendingTileMultiplier(): boolean {
    if (this.pendingTileMultiplier === this.selectedTileMultiplier) {
      return false;
    }

    this.selectedTileMultiplier = this.pendingTileMultiplier;
    writeStoredTileMultiplier(this.selectedTileMultiplier);
    return true;
  }

  public applyPendingAnimationSpeed(): boolean {
    if (this.pendingAnimationSpeed === this.selectedAnimationSpeed) {
      return false;
    }

    this.deps.applyAnimationSpeed(this.pendingAnimationSpeed);
    this.selectedAnimationSpeed = this.pendingAnimationSpeed;
    writeStoredAnimationSpeed(this.pendingAnimationSpeed);
    return true;
  }

  /** Reset pending state to match selected (discard uncommitted changes). */
  public resetPendingToSelected(): void {
    this.pendingEmojiPackId = this.selectedEmojiPackId;
    this.renderEmojiPackSelection();
    this.setPendingTileMultiplier(this.selectedTileMultiplier);
    this.setPendingAnimationSpeed(this.selectedAnimationSpeed);
  }

  // ── Initialization ─────────────────────────────────────────────────

  public initialize(): void {
    this.initializeEmojiPackSettings();
    this.initializeTileMultiplierSettings();
    this.initializeAnimationSpeedSettings();
    this.bindEventListeners();
  }

  // ── Validation ─────────────────────────────────────────────────────

  public isEmojiPackId(value: string): value is EmojiPackId {
    return this.emojiPacks.some((pack) => pack.id === value);
  }

  // ── Private helpers ────────────────────────────────────────────────

  private clampAnimationSpeed(speed: number): number {
    const { minSpeed, maxSpeed } = this.deps.getAnimationSpeedLimits();
    return clamp(speed, minSpeed, maxSpeed);
  }

  private renderEmojiPackSelection(): void {
    const buttons =
      this.deps.settingsPackListElement.querySelectorAll<HTMLButtonElement>(
        "button[data-pack-id]",
      );

    for (const button of buttons) {
      const packId = button.dataset.packId;
      const isSelected = packId === this.pendingEmojiPackId;
      button.setAttribute("aria-checked", String(isSelected));
      button.classList.toggle("btn-secondary", !isSelected);
      button.classList.toggle("active", isSelected);
    }
  }

  private initializeEmojiPackSettings(): void {
    const storedPackId = readStoredEmojiPackId(this.emojiPacks);
    this.selectedEmojiPackId = storedPackId ?? DEFAULT_EMOJI_PACK_ID;
    this.pendingEmojiPackId = this.selectedEmojiPackId;

    const buttons: HTMLButtonElement[] = [];

    for (const pack of this.emojiPacks) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "btn settings-pack-btn btn-secondary u-shadow-physical";
      button.dataset.packId = pack.id;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", `Use ${pack.name} icon pack`);

      const icon = document.createElement("span");
      icon.className = "settings-pack-icon u-shadow-physical";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = pack.previewIcon;

      const label = document.createElement("span");
      label.className = "settings-pack-label u-shadow-physical";
      label.textContent = pack.name;

      button.append(icon, label);
      buttons.push(button);
    }

    this.deps.settingsPackListElement.replaceChildren(...buttons);
    this.renderEmojiPackSelection();
  }

  private initializeTileMultiplierSettings(): void {
    const storedMultiplier = readStoredTileMultiplier();
    this.selectedTileMultiplier = clampTileMultiplier(storedMultiplier ?? 1);
    this.pendingTileMultiplier = this.selectedTileMultiplier;
    this.deps.settingsTileMultiplierInput.value =
      this.selectedTileMultiplier.toString();
  }

  private initializeAnimationSpeedSettings(): void {
    const storedSpeed = readStoredAnimationSpeed(
      (speed) => this.clampAnimationSpeed(speed),
    );
    const limits = this.deps.getAnimationSpeedLimits();
    this.pendingAnimationSpeed = this.clampAnimationSpeed(
      storedSpeed ?? limits.defaultSpeed,
    );
    this.deps.applyAnimationSpeed(this.pendingAnimationSpeed);
    this.selectedAnimationSpeed = this.pendingAnimationSpeed;
    this.deps.settingsAnimationSpeedInput.value =
      this.pendingAnimationSpeed.toString();
  }

  private bindEventListeners(): void {
    this.deps.settingsPackListElement.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button =
        target.closest<HTMLButtonElement>("button[data-pack-id]");

      if (button === null) {
        return;
      }

      const packId = button.dataset.packId;

      if (packId === undefined || !this.isEmojiPackId(packId)) {
        return;
      }

      this.setPendingEmojiPack(packId);
      this.deps.setStatus(
        "Pack selected. Click Apply changes to confirm.",
      );
    });

    this.deps.settingsTileMultiplierInput.addEventListener("input", () => {
      const multiplier = Number.parseInt(
        this.deps.settingsTileMultiplierInput.value,
        10,
      );

      if (!Number.isFinite(multiplier)) {
        return;
      }

      this.setPendingTileMultiplier(multiplier);
      this.deps.setStatus(
        "Tile multiplier selected. Click Apply changes to confirm.",
      );
    });

    this.deps.settingsAnimationSpeedInput.addEventListener("input", () => {
      const speed = Number.parseFloat(
        this.deps.settingsAnimationSpeedInput.value,
      );

      if (!Number.isFinite(speed)) {
        return;
      }

      this.setPendingAnimationSpeed(speed);
      this.deps.setStatus(
        "Animation speed selected. Click Apply changes to confirm.",
      );
    });

    this.deps.settingsApplyButton.addEventListener("click", () => {
      const didApplyPack = this.applyPendingEmojiPack();
      const didApplyTileMultiplier = this.applyPendingTileMultiplier();
      const didApplySpeed = this.applyPendingAnimationSpeed();
      const didApplyChanges =
        didApplyPack || didApplyTileMultiplier || didApplySpeed;
      this.deps.showMenuFrame();
      this.deps.setStatus(
        didApplyChanges
          ? "Settings changes applied."
          : "No changes to apply.",
      );
    });
  }
}

// ── localStorage helpers (pure, no class state) ───────────────────────

const readStoredEmojiPackId = (
  packs: ReadonlyArray<{ id: string }>,
): EmojiPackId | null => {
  const value = window.localStorage.getItem(EMOJI_PACK_STORAGE_KEY);

  if (value === null || !packs.some((pack) => pack.id === value)) {
    return null;
  }

  return value as EmojiPackId;
};

const writeStoredEmojiPackId = (packId: EmojiPackId): void => {
  window.localStorage.setItem(EMOJI_PACK_STORAGE_KEY, packId);
};

const readStoredTileMultiplier = (): number | null => {
  const value = window.localStorage.getItem(TILE_MULTIPLIER_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampTileMultiplier(parsed);
};

const writeStoredTileMultiplier = (multiplier: number): void => {
  window.localStorage.setItem(
    TILE_MULTIPLIER_STORAGE_KEY,
    multiplier.toString(),
  );
};

const readStoredAnimationSpeed = (
  clampFn: (speed: number) => number,
): number | null => {
  const value = window.localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampFn(parsed);
};

const writeStoredAnimationSpeed = (speed: number): void => {
  window.localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, speed.toString());
};

// Re-export for testing
export const settingsControllerTesting = {
  readStoredEmojiPackId,
  readStoredTileMultiplier,
  readStoredAnimationSpeed,
  writeStoredEmojiPackId,
  writeStoredTileMultiplier,
  writeStoredAnimationSpeed,
  EMOJI_PACK_STORAGE_KEY,
  TILE_MULTIPLIER_STORAGE_KEY,
  ANIMATION_SPEED_STORAGE_KEY,
};
