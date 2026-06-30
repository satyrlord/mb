import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await page.click('button[data-difficulty="easy"]');
await page.waitForSelector("#board button[data-index]");
const info = await page.evaluate(() => {
  const tile = document.querySelector('#board button[data-index="0"]');
  const right = tile.querySelector(".tile-right");
  const top = tile.querySelector(".tile-top");
  const board = document.querySelector("#board");
  const cs = (el) => {
    const s = getComputedStyle(el);
    return { transform: s.transform, display: s.display, width: s.width, height: s.height, background: s.backgroundColor, bfv: s.backfaceVisibility };
  };
  return {
    boardPerspective: getComputedStyle(board).perspective,
    boardPerspectiveOrigin: getComputedStyle(board).perspectiveOrigin,
    tileTransform: getComputedStyle(tile).transform,
    tileTransformStyle: getComputedStyle(tile).transformStyle,
    tileDepth: getComputedStyle(tile).getPropertyValue("--tile-depth"),
    cameraTilt: getComputedStyle(tile).getPropertyValue("--tile-camera-tilt"),
    right: cs(right),
    top: cs(top),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
