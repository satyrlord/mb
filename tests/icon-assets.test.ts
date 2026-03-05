import { describe, expect, test } from "vitest";

import {
  getIconAssetByToken,
  ICON_ASSET_DEFINITIONS,
  isIconAssetToken,
} from "../src/icon-assets.ts";

describe("icon-assets", () => {
  test("returns manual asset definition for known token", () => {
    const token = "asset:openmoji:1F680";
    const asset = getIconAssetByToken(token);

    expect(asset).toEqual(ICON_ASSET_DEFINITIONS[token]);
  });

  test("builds fallback openmoji asset definition for unknown openmoji token", () => {
    const asset = getIconAssetByToken("asset:openmoji:1F4A9");

    expect(asset).toEqual({
      src: "icon/openmoji/svg/1F4A9.svg",
      label: "OpenMoji 1F4A9 icon",
    });
  });

  test("returns null for non-asset tokens", () => {
    expect(getIconAssetByToken("🛰️")).toBeNull();
    expect(getIconAssetByToken("asset:other:ABC")).toBeNull();
  });

  test("identifies icon asset tokens", () => {
    expect(isIconAssetToken("asset:openmoji:1F680")).toBe(true);
    expect(isIconAssetToken("asset:openmoji:1F4A9")).toBe(true);
    expect(isIconAssetToken("🛰️")).toBe(false);
  });
});
