import type { EmojiPackId } from "./icons";

export const SUPPORTED_MENU_TEXTURE_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export interface MenuTextureDefinition {
  imagePath: string;
  size: string;
  position: string;
}

export const DEFAULT_MENU_TEXTURE: Readonly<MenuTextureDefinition> = {
  imagePath: "textures/menu-default.png",
  size: "cover",
  position: "center",
};

export const isSupportedMenuTexturePath = (imagePath: string): boolean => {
  const normalizedPath = imagePath.toLowerCase();

  return SUPPORTED_MENU_TEXTURE_EXTENSIONS.some((extension) => {
    return normalizedPath.endsWith(extension);
  });
};

export const MENU_TEXTURES: Readonly<Record<EmojiPackId, MenuTextureDefinition>> = {
  "space-astronomy": {
    imagePath: "textures/menu-space-astronomy.png",
    size: "cover",
    position: "center",
  },
  "plants-nature": {
    imagePath: "textures/menu-plants-nature.png",
    size: "cover",
    position: "center",
  },
  "food-drinks": {
    imagePath: "textures/menu-food-drinks.png",
    size: "cover",
    position: "center",
  },
  technology: {
    imagePath: "textures/menu-technology.png",
    size: "cover",
    position: "center",
  },
  "world-flags": {
    imagePath: "textures/menu-world-flags.png",
    size: "cover",
    position: "center",
  },
  "medieval-fantasy": {
    imagePath: "textures/menu-medieval-fantasy.png",
    size: "cover",
    position: "center",
  },
  "music-performance": {
    imagePath: "textures/menu-music-performance.png",
    size: "cover",
    position: "center",
  },
  "religious-symbols": {
    imagePath: "textures/menu-religious-symbols.png",
    size: "cover",
    position: "center",
  },
};

const setMenuTextureProperties = (
  menuElement: HTMLElement,
  texture: MenuTextureDefinition,
): void => {
  menuElement.style.setProperty(
    "--menu-pack-texture-image",
    `url("./${texture.imagePath}")`,
  );
  menuElement.style.setProperty("--menu-pack-texture-size", texture.size);
  menuElement.style.setProperty(
    "--menu-pack-texture-position",
    texture.position,
  );
};

export const applyDefaultMenuTextureNow = (menuElement: HTMLElement): void => {
  // Invalidate any in-flight image load so it cannot override this forced switch.
  menuElement.dataset.menuTextureRequestedImagePath = "";
  setMenuTextureProperties(menuElement, DEFAULT_MENU_TEXTURE);
};

export const applyMenuTexture = (
  menuElement: HTMLElement,
  packId: EmojiPackId,
): void => {
  const texture = MENU_TEXTURES[packId];
  const requestedImagePath = texture.imagePath;

  menuElement.dataset.menuTexture = packId;
  menuElement.dataset.menuTextureRequestedImagePath = requestedImagePath;

  // Show a stable fallback immediately while the requested texture loads.
  setMenuTextureProperties(menuElement, DEFAULT_MENU_TEXTURE);

  if (typeof Image === "undefined") {
    return;
  }

  const imageLoader = new Image();

  imageLoader.onload = () => {
    if (menuElement.dataset.menuTextureRequestedImagePath !== requestedImagePath) {
      return;
    }

    setMenuTextureProperties(menuElement, texture);
  };

  imageLoader.onerror = () => {
    if (menuElement.dataset.menuTextureRequestedImagePath !== requestedImagePath) {
      return;
    }

    setMenuTextureProperties(menuElement, DEFAULT_MENU_TEXTURE);
  };

  imageLoader.src = `./${requestedImagePath}`;
};