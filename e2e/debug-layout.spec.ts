import { test, expect } from "@playwright/test";

test("capture layout values on Mobile Chrome", async ({ page }) => {
  await page.goto("/");
  await page.locator('#appShell[data-resize-ready="true"]').waitFor({
    state: "attached",
    timeout: 15_000,
  });
  // Wait a bit for settle timeout (200ms in code)
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const shell = document.querySelector("#appShell") as HTMLElement;
    const app = document.querySelector("#appWindow") as HTMLElement;
    const shellBox = shell.getBoundingClientRect();
    const appBox = app.getBoundingClientRect();
    const shellStyle = getComputedStyle(shell);
    const bodyStyle = getComputedStyle(document.body);

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      userAgent: navigator.userAgent,
      bodyPadding: bodyStyle.padding,
      bodyOverflowX: bodyStyle.overflowX,
      bodyFlexDirection: bodyStyle.flexDirection,
      bodyWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      shellDataset: { ...shell.dataset },
      shellCssVars: {
        appBaseWidth: shellStyle.getPropertyValue("--app-base-width"),
        appBaseHeight: shellStyle.getPropertyValue("--app-base-height"),
        uiScale: shellStyle.getPropertyValue("--ui-scale"),
      },
      shellBox: {
        x: shellBox.x,
        y: shellBox.y,
        width: shellBox.width,
        height: shellBox.height,
      },
      shellComputedWidth: shellStyle.width,
      shellComputedHeight: shellStyle.height,
      appBox: {
        x: appBox.x,
        y: appBox.y,
        width: appBox.width,
        height: appBox.height,
      },
      orientation: shell.dataset.orientation,
      resizeReady: shell.dataset.resizeReady,
    };
  });

  console.log("=== LAYOUT DEBUG DATA ===");
  console.log(JSON.stringify(data, null, 2));

  // Just log, don't fail
  expect(true).toBe(true);
});
