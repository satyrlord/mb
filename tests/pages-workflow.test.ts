import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("GitHub Pages workflow", () => {
  test("publishes the textures directory to the static site artifact", () => {
    const workflow = readFileSync(resolve(".github", "workflows", "pages.yml"), "utf8");

    expect(workflow).toContain("mkdir -p site/assets site/config site/textures site/icon site/sound site/music");
    expect(workflow).toContain("cp -r textures/. site/textures/");
  });
});