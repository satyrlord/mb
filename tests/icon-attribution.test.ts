import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const OPENMOJI_CODES = [
  "1F3AD",
  "1F3B8",
  "1F3F0",
  "1F409",
  "1F52C",
  "1F680",
  "1F6E1",
  "1F916",
  "1F9EA",
  "2694",
  "1F6DE",
  "1F9ED",
  "1FA9D",
  "1FA9C",
  "1F6DF",
  "1F9EF",
  "1FA83",
  "1FA99",
  "1FAAA",
  "1FAA0",
  "1F9F1",
  "1F6DD",
  "1F432",
  "1F43A",
  "1F987",
  "1F982",
  "1F5FA-FE0F",
  "1FAA4",
  "1FAA8",
  "1F9CA",
  "1F578-FE0F",
  "1F9B4",
  "1F985",
  "1F417",
  "1F98F",
  "1F99C",
  "1FAB6",
  "1F6D6",
  "1F531",
  "26B0-FE0F",
] as const;
describe("OpenMoji merged imports", () => {
  test("imports all expected SVG files in the unified folder", () => {
    for (const code of OPENMOJI_CODES) {
      const filePath = resolve("icon", "openmoji", "svg", `${code}.svg`);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  test("records full attribution rows for each imported file in the unified folder", () => {
    const attributionCsv = readFileSync(resolve("icon", "ATTRIBUTION.csv"), "utf8");

    for (const code of OPENMOJI_CODES) {
      const relativePath = `icon/openmoji/svg/${code}.svg`;
      expect(attributionCsv).toContain(`${relativePath},`);
      expect(attributionCsv).toContain(`https://cdn.jsdelivr.net/npm/openmoji@14.0.0/color/svg/${code}.svg`);
      expect(attributionCsv).toContain("CC BY-SA 4.0");
    }
  });
});
