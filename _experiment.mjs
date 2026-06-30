import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await page.click('button[data-difficulty="easy"]');
await page.waitForSelector("#board button[data-index]");

const variants = [
  { name: "A-tilt12", css: ".tile{--tile-camera-tilt:12deg;--tile-depth:12px;}" },
  { name: "B-iso", css: ".tile{--tile-camera-tilt:0deg;} .board{perspective:none!important;} .tile{transform:none!important;} .tile-right{transform:translateX(100%) skewY(-45deg) scaleX(0.18)!important;transform-origin:left center;} .tile-top{transform:translateY(-100%) skewX(-45deg) scaleY(0.18)!important;transform-origin:left bottom;}" },
  { name: "C-shadowstack", css: ".tile{--tile-camera-tilt:0deg;} .tile-right,.tile-top{display:none!important;} .game-block{box-shadow: 3px 0 0 var(--color-tile-side-left), 0 -3px 0 var(--color-tile-side-bottom), 5px 0 0 rgba(0,0,0,0.25), 0 -5px 0 rgba(0,0,0,0.2), 6px 6px 10px rgba(0,0,0,0.4)!important;}" },
];

for (const v of variants) {
  await page.addStyleTag({ content: v.css, id: "exp" });
  await page.waitForTimeout(300);
  const board = await page.$("#board");
  await board.screenshot({ path: `C:/Users/razva/AppData/Local/Temp/claude/d--dev-mb/86310a7e-97b0-402d-9721-82358be358c4/scratchpad/exp-${v.name}.png` });
  await page.evaluate(() => document.querySelectorAll("#exp").forEach(e => e.remove()));
}
await browser.close();
console.log("done");
