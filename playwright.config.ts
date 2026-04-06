import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for MEMORYBLOX mobile-browser regression tests.
 *
 * Only mobile device profiles are used — desktop browsers are excluded because
 * the layout issues we guard against are mobile-specific.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 10,
  reporter: "list",
  /* Per-test timeout (default 30 s is too tight for mobile emulation). */
  timeout: 60_000,
  /* Global suite timeout. */
  globalTimeout: 300_000,

  use: {
    baseURL: "http://localhost:8080",
    /* Collect trace on first retry for CI debugging. */
    trace: "on-first-retry",
    /* Capture a full-page screenshot on test failure. */
    screenshot: "only-on-failure",
    /* Per-action timeout (click, fill, etc.). */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "Mobile Chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "Mobile Chromium (landscape)",
      use: {
        ...devices["Pixel 7 landscape"],
      },
    },
  ],

  webServer: {
    command: "vite preview --port 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
