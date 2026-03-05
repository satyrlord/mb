// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  SettingsController,
  settingsControllerTesting,
  type SettingsControllerDeps,
  type AnimationSpeedLimits,
} from "../src/settings-controller.js";
import { DEFAULT_EMOJI_PACK_ID } from "../src/icons.js";

const {
  readStoredEmojiPackId,
  readStoredTileMultiplier,
  readStoredAnimationSpeed,
  writeStoredEmojiPackId,
  writeStoredTileMultiplier,
  writeStoredAnimationSpeed,
  EMOJI_PACK_STORAGE_KEY,
  TILE_MULTIPLIER_STORAGE_KEY,
  ANIMATION_SPEED_STORAGE_KEY,
} = settingsControllerTesting;

const DEFAULT_LIMITS: AnimationSpeedLimits = {
  minSpeed: 0.5,
  maxSpeed: 3,
  defaultSpeed: 1,
};

const createMockDeps = (
  overrides: Partial<SettingsControllerDeps> = {},
): SettingsControllerDeps => ({
  settingsPackListElement: document.createElement("div"),
  settingsTileMultiplierInput: document.createElement("input"),
  settingsAnimationSpeedInput: document.createElement("input"),
  settingsApplyButton: document.createElement("button"),
  getAnimationSpeedLimits: () => DEFAULT_LIMITS,
  applyAnimationSpeed: vi.fn(),
  setStatus: vi.fn(),
  showMenuFrame: vi.fn(),
  ...overrides,
});

describe("SettingsController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("constructor defaults", () => {
    it("uses default emoji pack, tile multiplier 1, and default speed", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);

      expect(ctrl.getSelectedEmojiPackId()).toBe(DEFAULT_EMOJI_PACK_ID);
      expect(ctrl.getSelectedTileMultiplier()).toBe(1);
      expect(ctrl.getSelectedAnimationSpeed()).toBe(1);
    });
  });

  describe("getEmojiPackLabel", () => {
    it("returns the pack name for a known pack", () => {
      const ctrl = new SettingsController(createMockDeps());
      expect(ctrl.getEmojiPackLabel(DEFAULT_EMOJI_PACK_ID)).not.toBe("Unknown");
    });

    it("returns 'Unknown' for an unrecognized pack id", () => {
      const ctrl = new SettingsController(createMockDeps());
      expect(ctrl.getEmojiPackLabel("nonexistent" as never)).toBe("Unknown");
    });
  });

  describe("isEmojiPackId", () => {
    it("returns true for a valid pack id", () => {
      const ctrl = new SettingsController(createMockDeps());
      expect(ctrl.isEmojiPackId(DEFAULT_EMOJI_PACK_ID)).toBe(true);
    });

    it("returns false for an invalid pack id", () => {
      const ctrl = new SettingsController(createMockDeps());
      expect(ctrl.isEmojiPackId("invalid-pack-xyz")).toBe(false);
    });
  });

  describe("two-phase commit: emoji pack", () => {
    it("setPendingEmojiPack does not change selected", () => {
      const ctrl = new SettingsController(createMockDeps());
      ctrl.setPendingEmojiPack("plants-nature");
      expect(ctrl.getSelectedEmojiPackId()).toBe(DEFAULT_EMOJI_PACK_ID);
    });

    it("applyPendingEmojiPack commits pending to selected", () => {
      const ctrl = new SettingsController(createMockDeps());
      ctrl.setPendingEmojiPack("plants-nature");
      const changed = ctrl.applyPendingEmojiPack();
      expect(changed).toBe(true);
      expect(ctrl.getSelectedEmojiPackId()).toBe("plants-nature");
    });

    it("applyPendingEmojiPack returns false when no change", () => {
      const ctrl = new SettingsController(createMockDeps());
      const changed = ctrl.applyPendingEmojiPack();
      expect(changed).toBe(false);
    });

    it("applyPendingEmojiPack persists to localStorage", () => {
      const ctrl = new SettingsController(createMockDeps());
      ctrl.setPendingEmojiPack("plants-nature");
      ctrl.applyPendingEmojiPack();
      expect(localStorage.getItem(EMOJI_PACK_STORAGE_KEY)).toBe("plants-nature");
    });
  });

  describe("two-phase commit: tile multiplier", () => {
    it("setPendingTileMultiplier updates the input value", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.setPendingTileMultiplier(2);
      expect(deps.settingsTileMultiplierInput.value).toBe("2");
    });

    it("setPendingTileMultiplier clamps to valid range", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.setPendingTileMultiplier(99);
      expect(deps.settingsTileMultiplierInput.value).toBe("3");
    });

    it("applyPendingTileMultiplier commits and persists", () => {
      const ctrl = new SettingsController(createMockDeps());
      ctrl.setPendingTileMultiplier(3);
      const changed = ctrl.applyPendingTileMultiplier();
      expect(changed).toBe(true);
      expect(ctrl.getSelectedTileMultiplier()).toBe(3);
      expect(localStorage.getItem(TILE_MULTIPLIER_STORAGE_KEY)).toBe("3");
    });

    it("applyPendingTileMultiplier returns false when no change", () => {
      const ctrl = new SettingsController(createMockDeps());
      const changed = ctrl.applyPendingTileMultiplier();
      expect(changed).toBe(false);
    });
  });

  describe("two-phase commit: animation speed", () => {
    it("setPendingAnimationSpeed updates the input value", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.setPendingAnimationSpeed(2);
      expect(deps.settingsAnimationSpeedInput.value).toBe("2");
    });

    it("setPendingAnimationSpeed clamps to limits", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.setPendingAnimationSpeed(10);
      expect(deps.settingsAnimationSpeedInput.value).toBe("3");
    });

    it("applyPendingAnimationSpeed commits and persists", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.setPendingAnimationSpeed(2.5);
      const changed = ctrl.applyPendingAnimationSpeed();
      expect(changed).toBe(true);
      expect(ctrl.getSelectedAnimationSpeed()).toBe(2.5);
      expect(deps.applyAnimationSpeed).toHaveBeenCalledWith(2.5);
      expect(localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY)).toBe("2.5");
    });

    it("applyPendingAnimationSpeed returns false when no change", () => {
      const ctrl = new SettingsController(createMockDeps());
      const changed = ctrl.applyPendingAnimationSpeed();
      expect(changed).toBe(false);
    });
  });

  describe("resetPendingToSelected", () => {
    it("discards uncommitted changes", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);

      ctrl.setPendingEmojiPack("plants-nature");
      ctrl.setPendingTileMultiplier(3);
      ctrl.setPendingAnimationSpeed(2);

      ctrl.resetPendingToSelected();

      // Applying now should return no change since pending == selected
      expect(ctrl.applyPendingEmojiPack()).toBe(false);
      expect(ctrl.applyPendingTileMultiplier()).toBe(false);
      expect(ctrl.applyPendingAnimationSpeed()).toBe(false);
    });
  });

  describe("initialize", () => {
    it("reads stored emoji pack from localStorage", () => {
      localStorage.setItem(EMOJI_PACK_STORAGE_KEY, "plants-nature");
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();
      expect(ctrl.getSelectedEmojiPackId()).toBe("plants-nature");
    });

    it("falls back to default when stored emoji pack is invalid", () => {
      localStorage.setItem(EMOJI_PACK_STORAGE_KEY, "nonexistent");
      const ctrl = new SettingsController(createMockDeps());
      ctrl.initialize();
      expect(ctrl.getSelectedEmojiPackId()).toBe(DEFAULT_EMOJI_PACK_ID);
    });

    it("reads stored tile multiplier from localStorage", () => {
      localStorage.setItem(TILE_MULTIPLIER_STORAGE_KEY, "2");
      const ctrl = new SettingsController(createMockDeps());
      ctrl.initialize();
      expect(ctrl.getSelectedTileMultiplier()).toBe(2);
    });

    it("reads stored animation speed and applies it", () => {
      localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, "1.5");
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();
      expect(ctrl.getSelectedAnimationSpeed()).toBe(1.5);
      expect(deps.applyAnimationSpeed).toHaveBeenCalledWith(1.5);
    });

    it("builds pack buttons in the pack list element", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();
      const buttons = deps.settingsPackListElement.querySelectorAll("button[data-pack-id]");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("marks stored pack as selected in the rendered buttons", () => {
      localStorage.setItem(EMOJI_PACK_STORAGE_KEY, "plants-nature");
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();
      const activeBtn = deps.settingsPackListElement.querySelector(
        'button[data-pack-id="plants-nature"]',
      );
      expect(activeBtn?.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("event listeners (via initialize)", () => {
    it("pack button click sets pending pack", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      const btn = deps.settingsPackListElement.querySelector(
        'button[data-pack-id="plants-nature"]',
      ) as HTMLButtonElement;
      btn.click();

      expect(deps.setStatus).toHaveBeenCalledWith(
        "Pack selected. Click Apply changes to confirm.",
      );
    });

    it("tile multiplier input sets pending multiplier", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      deps.settingsTileMultiplierInput.value = "2";
      deps.settingsTileMultiplierInput.dispatchEvent(new Event("input"));

      expect(deps.setStatus).toHaveBeenCalledWith(
        "Tile multiplier selected. Click Apply changes to confirm.",
      );
    });

    it("tile multiplier input ignores non-finite values", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      deps.settingsTileMultiplierInput.value = "abc";
      deps.settingsTileMultiplierInput.dispatchEvent(new Event("input"));

      expect(deps.setStatus).not.toHaveBeenCalled();
    });

    it("animation speed input sets pending speed", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      deps.settingsAnimationSpeedInput.value = "1.5";
      deps.settingsAnimationSpeedInput.dispatchEvent(new Event("input"));

      expect(deps.setStatus).toHaveBeenCalledWith(
        "Animation speed selected. Click Apply changes to confirm.",
      );
    });

    it("animation speed input ignores non-finite values", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      deps.settingsAnimationSpeedInput.value = "not-a-number";
      deps.settingsAnimationSpeedInput.dispatchEvent(new Event("input"));

      expect(deps.setStatus).not.toHaveBeenCalled();
    });

    it("apply button commits all changes and shows menu", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      ctrl.setPendingEmojiPack("plants-nature");
      ctrl.setPendingTileMultiplier(2);
      ctrl.setPendingAnimationSpeed(2);

      deps.settingsApplyButton.click();

      expect(deps.showMenuFrame).toHaveBeenCalled();
      expect(deps.setStatus).toHaveBeenCalledWith("Settings changes applied.");
    });

    it("apply button reports no changes when nothing changed", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      deps.settingsApplyButton.click();

      expect(deps.showMenuFrame).toHaveBeenCalled();
      expect(deps.setStatus).toHaveBeenCalledWith("No changes to apply.");
    });

    it("pack click ignores elements without data-pack-id", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      // Click the container element directly (no button)
      deps.settingsPackListElement.click();

      expect(deps.setStatus).not.toHaveBeenCalled();
    });

    it("pack click ignores non-HTMLElement targets", () => {
      const deps = createMockDeps();
      const ctrl = new SettingsController(deps);
      ctrl.initialize();

      // Simulate a click where target is not an HTMLElement
      const event = new Event("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: document.createTextNode("text") });
      deps.settingsPackListElement.dispatchEvent(event);

      expect(deps.setStatus).not.toHaveBeenCalled();
    });
  });
});

describe("localStorage helpers", () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe("readStoredEmojiPackId", () => {
    it("returns null when no value stored", () => {
      expect(readStoredEmojiPackId([{ id: "classic" }])).toBeNull();
    });

    it("returns null when stored value is not a valid pack id", () => {
      localStorage.setItem(EMOJI_PACK_STORAGE_KEY, "bogus");
      expect(readStoredEmojiPackId([{ id: "classic" }])).toBeNull();
    });

    it("returns the stored pack id when valid", () => {
      localStorage.setItem(EMOJI_PACK_STORAGE_KEY, "classic");
      expect(readStoredEmojiPackId([{ id: "classic" }])).toBe("classic");
    });
  });

  describe("readStoredTileMultiplier", () => {
    it("returns null when no value stored", () => {
      expect(readStoredTileMultiplier()).toBeNull();
    });

    it("returns null when stored value is not a finite number", () => {
      localStorage.setItem(TILE_MULTIPLIER_STORAGE_KEY, "NaN");
      expect(readStoredTileMultiplier()).toBeNull();
    });

    it("returns clamped multiplier when valid", () => {
      localStorage.setItem(TILE_MULTIPLIER_STORAGE_KEY, "2");
      expect(readStoredTileMultiplier()).toBe(2);
    });

    it("clamps out-of-range value", () => {
      localStorage.setItem(TILE_MULTIPLIER_STORAGE_KEY, "999");
      expect(readStoredTileMultiplier()).toBe(3);
    });
  });

  describe("readStoredAnimationSpeed", () => {
    const clampFn = (speed: number): number => Math.min(3, Math.max(0.5, speed));

    it("returns null when no value stored", () => {
      expect(readStoredAnimationSpeed(clampFn)).toBeNull();
    });

    it("returns null when stored value is not finite", () => {
      localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, "Infinity");
      expect(readStoredAnimationSpeed(clampFn)).toBeNull();
    });

    it("returns clamped speed when valid", () => {
      localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, "2");
      expect(readStoredAnimationSpeed(clampFn)).toBe(2);
    });

    it("clamps out-of-range value via provided function", () => {
      localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, "10");
      expect(readStoredAnimationSpeed(clampFn)).toBe(3);
    });
  });

  describe("writeStored* helpers", () => {
    it("writeStoredEmojiPackId stores to localStorage", () => {
      writeStoredEmojiPackId("nature" as never);
      expect(localStorage.getItem(EMOJI_PACK_STORAGE_KEY)).toBe("nature");
    });

    it("writeStoredTileMultiplier stores to localStorage", () => {
      writeStoredTileMultiplier(3);
      expect(localStorage.getItem(TILE_MULTIPLIER_STORAGE_KEY)).toBe("3");
    });

    it("writeStoredAnimationSpeed stores to localStorage", () => {
      writeStoredAnimationSpeed(2.5);
      expect(localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY)).toBe("2.5");
    });
  });
});
