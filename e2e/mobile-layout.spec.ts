import { test, expect, type Page, type Locator } from "@playwright/test";

/* ─── Selectors ────────────────────────────────────────────────────────── */

const sel = {
  appShell: "#appShell",
  appWindow: "#appWindow",
  menuFrame: "#menuFrame",
  gameFrame: "#gameFrame",
  settingsFrame: "#settingsFrame",
  leaderboardFrame: "#leaderboardFrame",
  board: "#board",
  hdToggle: "#hdToggleButton",
  orientationToggle: "#orientationToggleButton",
  topbarLabel: "#topbarMenuLabel",
  menuButton: "#menuButton",
  bottombar: "footer.app-bottombar",
  timeValue: "#timeValue",
  attemptsValue: "#attemptsValue",
  statusMessage: "#statusMessage",
  difficultyMenu: "#difficultyMenu",
  tile: ".tile",
} as const;

const difficulties = ["easy", "normal", "hard"] as const;
type Difficulty = (typeof difficulties)[number];

const difficultyGrids: Record<Difficulty, { cols: number; rows: number }> = {
  easy: { cols: 6, rows: 5 },
  normal: { cols: 8, rows: 5 },
  hard: { cols: 10, rows: 5 },
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */

/** Wait for the app to finish its bootstrap sequence. */
async function waitForAppReady(page: Page): Promise<void> {
  /* The resize controller marks the shell ready once it has measured the
     viewport and computed UI scale. This is the last DOM mutation in the
     bootstrap chain, so it's the most reliable readiness signal. */
  await page.locator(`${sel.appShell}[data-resize-ready="true"]`).waitFor({
    state: "attached",
    timeout: 15_000,
  });
}

/** Assert an element is within the viewport bounds (not overflowing). */
async function expectWithinViewport(
  page: Page,
  locator: Locator,
  label: string,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  if (!box) return; // type-guard

  const viewport = page.viewportSize();
  expect(viewport, "viewport should be set").not.toBeNull();
  if (!viewport) return;

  expect(box.x, `${label} left edge should be >= 0`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${label} top edge should be >= 0`).toBeGreaterThanOrEqual(-1);
  expect(
    box.x + box.width,
    `${label} right edge should be within viewport width (${viewport.width})`,
  ).toBeLessThanOrEqual(viewport.width + 1);
  expect(
    box.y + box.height,
    `${label} bottom edge should be within viewport height (${viewport.height})`,
  ).toBeLessThanOrEqual(viewport.height + 1);
}

/** Click a difficulty button and wait for the board to appear. */
async function startGame(page: Page, difficulty: Difficulty): Promise<void> {
  await page.click(`button[data-difficulty="${difficulty}"]`);
  await page.locator(sel.gameFrame).waitFor({ state: "visible" });
  /* Wait for the board to be populated with tiles. */
  await page.locator(`${sel.board} ${sel.tile}`).first().waitFor({ state: "attached" });
}

/** Navigate to the menu screen (Home). */
async function goHome(page: Page): Promise<void> {
  const menuBtn = page.locator(sel.menuButton);
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
  }
  await page.locator(sel.menuFrame).waitFor({ state: "visible" });
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* ─── Tests ────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe("Mobile: Initial Load", () => {
  test.beforeEach(async ({ page }) => {
    /* Start with clean localStorage so stored orientation/HD
       don't interfere with "default" assertions. */
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.removeItem("memoryblox-orientation-mode");
      window.localStorage.removeItem("memoryblox-hd-mode");
    });
    await page.reload();
    await waitForAppReady(page);
  });

  test("app shell fits within the viewport on load", async ({ page }) => {
    await expectWithinViewport(page, page.locator(sel.appShell), "App shell");
  });

  test("app window fits within the viewport on load", async ({ page }) => {
    await expectWithinViewport(page, page.locator(sel.appWindow), "App window");
  });

  test("HD mode defaults to OFF on mobile", async ({ page }) => {
    const hdMode = await page.locator(sel.appShell).getAttribute("data-hd-mode");
    expect(hdMode).toBe("off");
  });

  test("HD toggle button shows 'Enable HD mode' on mobile", async ({ page }) => {
    const hdToggle = page.locator(sel.hdToggle);
    await expect(hdToggle).toHaveAttribute("aria-pressed", "false");
    await expect(hdToggle).toHaveAttribute("aria-label", "Enable HD mode");
  });

  test("menu frame is visible on initial load", async ({ page }) => {
    await expect(page.locator(sel.menuFrame)).toBeVisible();
  });

  test("menu frame fits within viewport", async ({ page }) => {
    await expectWithinViewport(page, page.locator(sel.menuFrame), "Menu frame");
  });

  test("difficulty buttons are visible", async ({ page }) => {
    for (const diff of difficulties) {
      await expect(
        page.locator(`button[data-difficulty="${diff}"]`),
      ).toBeVisible();
    }
  });

  test("bottombar is visible and within viewport", async ({ page }) => {
    const bar = page.locator(sel.bottombar);
    await expect(bar).toBeVisible();
    await expectWithinViewport(page, bar, "Bottombar");
  });

  test("no horizontal scrollbar on initial load", async ({ page }) => {
    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    }));
    expect(
      scrollInfo.scrollWidth,
      "document should not be wider than client",
    ).toBeLessThanOrEqual(scrollInfo.clientWidth + 1);
    expect(
      scrollInfo.bodyScrollWidth,
      "body should not be wider than client",
    ).toBeLessThanOrEqual(scrollInfo.bodyClientWidth + 1);
  });

  test("no vertical scrollbar on initial load", async ({ page }) => {
    const scrollInfo = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(
      scrollInfo.scrollHeight,
      "document should not be taller than client",
    ).toBeLessThanOrEqual(scrollInfo.clientHeight + 1);
  });
});

/* ─── Menu Screen ──────────────────────────────────────────────────────── */

test.describe("Mobile: Menu Screen Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("menu title MEMORYBLOX is visible", async ({ page }) => {
    await expect(page.locator("#menuTitle")).toBeVisible();
  });

  test("topbar label is visible", async ({ page }) => {
    await expect(page.locator(sel.topbarLabel)).toBeVisible();
  });

  test("all difficulty buttons fit within viewport", async ({ page }) => {
    for (const diff of difficulties) {
      const btn = page.locator(`button[data-difficulty="${diff}"]`);
      await expectWithinViewport(page, btn, `${diff} button`);
    }
  });

  test("High Scores button is visible", async ({ page }) => {
    await expect(page.locator("#menuHighScoresButton")).toBeVisible();
  });

  test("Settings button is visible", async ({ page }) => {
    await expect(page.locator("#menuSettingsButton")).toBeVisible();
  });
});

/* ─── Game Board for Each Difficulty ───────────────────────────────────── */

for (const difficulty of difficulties) {
  test.describe(`Mobile: Game Board — ${difficulty}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await waitForAppReady(page);
      await startGame(page, difficulty);
    });

    test("game frame is visible and within viewport", async ({ page }) => {
      const frame = page.locator(sel.gameFrame);
      await expect(frame).toBeVisible();
      await expectWithinViewport(page, frame, `Game frame (${difficulty})`);
    });

    test("app window fits within viewport during game", async ({ page }) => {
      await expectWithinViewport(
        page,
        page.locator(sel.appWindow),
        `App window (${difficulty})`,
      );
    });

    test("board is visible and within viewport", async ({ page }) => {
      const board = page.locator(sel.board);
      await expect(board).toBeVisible();
      await expectWithinViewport(page, board, `Board (${difficulty})`);
    });

    test("all tiles are visible", async ({ page }) => {
      const tiles = page.locator(`${sel.board} ${sel.tile}`);
      const count = await tiles.count();
      const grid = difficultyGrids[difficulty];
      expect(count).toBe(grid.cols * grid.rows);

      for (let i = 0; i < count; i++) {
        await expect(tiles.nth(i)).toBeVisible();
      }
    });

    test("tiles are within viewport bounds", async ({ page }) => {
      const tiles = page.locator(`${sel.board} ${sel.tile}`);
      const count = await tiles.count();

      /* Spot-check first, last, and a middle tile to keep test fast. */
      const indicesToCheck = [0, Math.floor(count / 2), count - 1];
      for (const idx of indicesToCheck) {
        await expectWithinViewport(
          page,
          tiles.nth(idx),
          `Tile ${idx} (${difficulty})`,
        );
      }
    });

    test("bottombar stats are visible during game", async ({ page }) => {
      await expect(page.locator(sel.timeValue)).toBeVisible();
      await expect(page.locator(sel.attemptsValue)).toBeVisible();
    });

    test("Home button is visible during game", async ({ page }) => {
      await expect(page.locator(sel.menuButton)).toBeVisible();
    });

    test("can navigate back to menu", async ({ page }) => {
      await goHome(page);
      await expect(page.locator(sel.menuFrame)).toBeVisible();
    });
  });
}

/* ─── Portrait Toggle ──────────────────────────────────────────────────── */

test.describe("Mobile: Orientation Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("orientation defaults to portrait on mobile", async ({ page }) => {
    /* Clear stored preference and reload for a clean check. */
    await page.evaluate(() =>
      window.localStorage.removeItem("memoryblox-orientation-mode"),
    );
    await page.reload();
    await waitForAppReady(page);

    const orientation = await page
      .locator(sel.appShell)
      .getAttribute("data-orientation");
    expect(orientation).toBe("portrait");
  });

  test("toggling orientation updates data attribute", async ({ page }) => {
    const appShell = page.locator(sel.appShell);
    const initial = await appShell.getAttribute("data-orientation");

    /* The orientation toggle is only visible on the menu screen. */
    const toggle = page.locator(sel.orientationToggle);
    if (await toggle.isHidden()) {
      test.skip();
      return;
    }

    await toggle.click();

    const toggled = await appShell.getAttribute("data-orientation");
    expect(toggled).not.toBe(initial);

    /* Toggle back. */
    await toggle.click();
    const restored = await appShell.getAttribute("data-orientation");
    expect(restored).toBe(initial);
  });

  for (const difficulty of difficulties) {
    test(`board fits viewport after portrait toggle — ${difficulty}`, async ({
      page,
    }) => {
      /* Ensure portrait mode. */
      await page.evaluate(() =>
        window.localStorage.setItem(
          "memoryblox-orientation-mode",
          "portrait",
        ),
      );
      await page.reload();
      await waitForAppReady(page);

      await startGame(page, difficulty);

      await expectWithinViewport(
        page,
        page.locator(sel.board),
        `Board portrait (${difficulty})`,
      );
      await expectWithinViewport(
        page,
        page.locator(sel.appWindow),
        `App window portrait (${difficulty})`,
      );
    });

    test(`board fits viewport in landscape — ${difficulty}`, async ({
      page,
    }) => {
      await page.evaluate(() =>
        window.localStorage.setItem(
          "memoryblox-orientation-mode",
          "landscape",
        ),
      );
      await page.reload();
      await waitForAppReady(page);

      await startGame(page, difficulty);

      await expectWithinViewport(
        page,
        page.locator(sel.board),
        `Board landscape (${difficulty})`,
      );
      await expectWithinViewport(
        page,
        page.locator(sel.appWindow),
        `App window landscape (${difficulty})`,
      );
    });
  }
});

/* ─── Settings Screen ──────────────────────────────────────────────────── */

test.describe("Mobile: Settings Screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.click("#menuSettingsButton");
    await page.locator(sel.settingsFrame).waitFor({ state: "visible" });
  });

  test("settings frame is visible and within viewport", async ({ page }) => {
    const frame = page.locator(sel.settingsFrame);
    await expect(frame).toBeVisible();
    await expectWithinViewport(page, frame, "Settings frame");
  });

  test("settings title is visible", async ({ page }) => {
    await expect(page.locator(".settings-title")).toBeVisible();
  });

  test("Apply button is visible", async ({ page }) => {
    await expect(page.locator("#settingsApplyButton")).toBeVisible();
  });

  test("Home button is visible in settings", async ({ page }) => {
    await expect(page.locator(sel.menuButton)).toBeVisible();
  });

  test("can navigate back to menu from settings", async ({ page }) => {
    await goHome(page);
    await expect(page.locator(sel.menuFrame)).toBeVisible();
  });
});

/* ─── Leaderboard Screen ───────────────────────────────────────────────── */

test.describe("Mobile: Leaderboard Screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await page.click("#menuHighScoresButton");
    await page.locator(sel.leaderboardFrame).waitFor({ state: "visible" });
  });

  test("leaderboard frame is visible and within viewport", async ({
    page,
  }) => {
    const frame = page.locator(sel.leaderboardFrame);
    await expect(frame).toBeVisible();
    await expectWithinViewport(page, frame, "Leaderboard frame");
  });

  test("leaderboard title is visible", async ({ page }) => {
    await expect(page.locator(".leaderboard-title")).toBeVisible();
  });

  test("Back button is visible", async ({ page }) => {
    await expect(page.locator("#leaderboardBackButton")).toBeVisible();
  });

  test("can navigate back to menu from leaderboard", async ({ page }) => {
    await page.click("#leaderboardBackButton");
    await expect(page.locator(sel.menuFrame)).toBeVisible();
  });
});

/* ─── HD Mode Toggle ───────────────────────────────────────────────────── */

test.describe("Mobile: HD Mode Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() =>
      window.localStorage.removeItem("memoryblox-hd-mode"),
    );
    await page.reload();
    await waitForAppReady(page);
  });

  test("HD mode is off by default on mobile", async ({ page }) => {
    const hdMode = await page
      .locator(sel.appShell)
      .getAttribute("data-hd-mode");
    expect(hdMode).toBe("off");
  });

  test("toggling HD mode updates data attribute", async ({ page }) => {
    const appShell = page.locator(sel.appShell);
    expect(await appShell.getAttribute("data-hd-mode")).toBe("off");

    await page.click(sel.hdToggle);
    expect(await appShell.getAttribute("data-hd-mode")).toBe("on");

    await page.click(sel.hdToggle);
    expect(await appShell.getAttribute("data-hd-mode")).toBe("off");
  });

  test("HD toggle button updates aria-pressed", async ({ page }) => {
    const hdBtn = page.locator(sel.hdToggle);
    await expect(hdBtn).toHaveAttribute("aria-pressed", "false");

    await hdBtn.click();
    await expect(hdBtn).toHaveAttribute("aria-pressed", "true");

    await hdBtn.click();
    await expect(hdBtn).toHaveAttribute("aria-pressed", "false");
  });
});

/* ─── Cross-Screen Navigation ──────────────────────────────────────────── */

test.describe("Mobile: Navigation Flow", () => {
  test("full navigation cycle stays within viewport", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    /* 1. Menu → Game (Easy) */
    await startGame(page, "easy");
    await expectWithinViewport(page, page.locator(sel.appWindow), "Game (easy)");

    /* 2. Game → Menu */
    await goHome(page);
    await expectWithinViewport(page, page.locator(sel.appWindow), "Menu (after easy)");

    /* 3. Menu → Game (Hard) */
    await startGame(page, "hard");
    await expectWithinViewport(page, page.locator(sel.appWindow), "Game (hard)");

    /* 4. Game → Menu */
    await goHome(page);

    /* 5. Menu → Settings */
    await page.click("#menuSettingsButton");
    await page.locator(sel.settingsFrame).waitFor({ state: "visible" });
    await expectWithinViewport(page, page.locator(sel.appWindow), "Settings");

    /* 6. Settings → Menu */
    await goHome(page);

    /* 7. Menu → Leaderboard */
    await page.click("#menuHighScoresButton");
    await page.locator(sel.leaderboardFrame).waitFor({ state: "visible" });
    await expectWithinViewport(
      page,
      page.locator(sel.appWindow),
      "Leaderboard",
    );

    /* 8. Leaderboard → Menu */
    await page.click("#leaderboardBackButton");
    await expect(page.locator(sel.menuFrame)).toBeVisible();
    await expectWithinViewport(page, page.locator(sel.appWindow), "Menu (final)");
  });
});
