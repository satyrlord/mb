import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await page.click('button[data-difficulty="easy"]');
await page.waitForSelector("#board button[data-index]");
const data = await page.evaluate(() => {
  const out = [];
  for (const i of [0, 1, 2, 7, 15, 29]) {
    const f = document.querySelector(`#board button[data-index="${i}"] .tile-front`);
    if (!f) continue;
    const s = getComputedStyle(f);
    out.push({ i, bgPos: s.backgroundPosition, bgSize: s.backgroundSize, tileIndex: getComputedStyle(f.parentElement).getPropertyValue("--tile-index") });
  }
  return out;
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
