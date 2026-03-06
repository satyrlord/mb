// @vitest-environment jsdom

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { EMOJI_PACKS } from "../src/icons.js";
import {
  DEFAULT_MENU_TEXTURE,
  MENU_TEXTURES,
  SUPPORTED_MENU_TEXTURE_EXTENSIONS,
  applyDefaultMenuTextureNow,
  applyMenuTexture,
  isSupportedMenuTexturePath,
} from "../src/menu-texture.js";

class MockImage {
  static created: MockImage[] = [];

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";

  constructor() {
    MockImage.created.push(this);
  }

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
  }

  resolveLoad(): void {
    this.onload?.();
  }

  resolveError(): void {
    this.onerror?.();
  }

  static reset(): void {
    MockImage.created = [];
  }
}

const OriginalImage = globalThis.Image;

beforeEach(() => {
  MockImage.reset();
  globalThis.Image = MockImage as unknown as typeof Image;
});

afterEach(() => {
  globalThis.Image = OriginalImage;
});

describe("MENU_TEXTURES", () => {
  test("covers every emoji pack", () => {
    expect(Object.keys(MENU_TEXTURES).sort()).toEqual(
      EMOJI_PACKS.map((pack) => pack.id).sort(),
    );
  });

  test("points every emoji pack to a texture asset", () => {
    for (const [packId, texture] of Object.entries(MENU_TEXTURES)) {
      expect(texture.imagePath.startsWith(`textures/menu-${packId}.`)).toBe(true);
      expect(isSupportedMenuTexturePath(texture.imagePath)).toBe(true);
      expect(existsSync(resolve(process.cwd(), texture.imagePath))).toBe(true);
      expect(texture.size).toBe("cover");
      expect(texture.position.length).toBeGreaterThan(0);
    }
  });

  test("accepts svg and raster menu texture paths", () => {
    for (const extension of SUPPORTED_MENU_TEXTURE_EXTENSIONS) {
      expect(isSupportedMenuTexturePath(`textures/example${extension}`)).toBe(true);
    }

    expect(isSupportedMenuTexturePath("textures/example.webp")).toBe(false);
  });
});

describe("applyMenuTexture", () => {
  test("starts with the fallback texture and swaps to the selected texture after load", () => {
    const menuElement = document.createElement("section");

    applyMenuTexture(menuElement, "plants-nature");

    expect(menuElement.dataset.menuTexture).toBe("plants-nature");
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`,
    );

    expect(MockImage.created).toHaveLength(1);
    expect(MockImage.created[0]?.src).toBe("./textures/menu-plants-nature.png");

    MockImage.created[0]?.resolveLoad();

    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      'url("./textures/menu-plants-nature.png")',
    );
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-size")).toBe("cover");
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-position")).toBe("center");
  });

  test("keeps the fallback texture when the selected texture fails to load", () => {
    const menuElement = document.createElement("section");

    applyMenuTexture(menuElement, "technology");

    expect(MockImage.created).toHaveLength(1);

    MockImage.created[0]?.resolveError();

    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`,
    );
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-size")).toBe(
      DEFAULT_MENU_TEXTURE.size,
    );
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-position")).toBe(
      DEFAULT_MENU_TEXTURE.position,
    );
  });

  test("applyDefaultMenuTextureNow immediately sets the default texture and cancels any pending load", () => {
    const menuElement = document.createElement("section");

    applyMenuTexture(menuElement, "technology");
    // Pending image load is in flight — now force the Easter egg default
    applyDefaultMenuTextureNow(menuElement);

    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`
    );

    // The in-flight load should now be a no-op (stale path guard)
    MockImage.created[0]?.resolveLoad();

    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`
    );
  });

  test("stale onerror is ignored when a newer request has superseded the load", () => {
    const menuElement = document.createElement("section");

    applyMenuTexture(menuElement, "technology");
    applyDefaultMenuTextureNow(menuElement);

    // Trigger error on the now-stale image loader — should be a no-op
    MockImage.created[0]?.resolveError();

    // The default texture applied by applyDefaultMenuTextureNow must still hold
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`
    );
  });

  test("returns early without creating an image loader when Image is unavailable", () => {
    const menuElement = document.createElement("section");

    globalThis.Image = undefined as unknown as typeof Image;

    applyMenuTexture(menuElement, "space-astronomy");

    expect(MockImage.created).toHaveLength(0);
    expect(menuElement.style.getPropertyValue("--menu-pack-texture-image")).toBe(
      `url("./${DEFAULT_MENU_TEXTURE.imagePath}")`
    );
  });
});