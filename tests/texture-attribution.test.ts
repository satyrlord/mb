import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("texture attribution", () => {
  test("records texture credits in the README", () => {
    const readme = readFileSync(resolve("README.md"), "utf8");

    expect(readme).toContain("Menu texture overlays in `textures/menu-*.svg` are original MEMORYBLOX");
    expect(readme).toContain("artwork by Razvan Petrescu: <https://github.com/satyrlord/mb>");
    expect(readme).toContain("Plasma/swirl visual inspiration credit: Anthony Osceola");
    expect(readme).toContain("<https://codepen.io/Anthony-Osceola/pen/YzMmorG>");
  });
});