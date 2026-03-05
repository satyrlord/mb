import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { EMOJI_PACKS } from "../src/icons.ts";

describe("icon artifact sync", () => {
  test("icon-pack-catalog.json matches EMOJI_PACKS exactly", () => {
    const catalogText = readFileSync(resolve("icon", "icon-pack-catalog.json"), "utf8");
    const catalog = JSON.parse(catalogText);

    expect(catalog).toEqual(EMOJI_PACKS);
  });

  test("emoji-inventory.md declares generated source and includes all pack headings", () => {
    const inventory = readFileSync(resolve("docs", "emoji-inventory.md"), "utf8");

    expect(inventory).toContain("Generated from `src/icons.ts`");

    for (const pack of EMOJI_PACKS) {
      expect(inventory).toContain(`## ${pack.name}`);
      expect(inventory).toContain(`(\`${pack.id}\`)`);
    }
  });
});
