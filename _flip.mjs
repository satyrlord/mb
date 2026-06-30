import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await page.click('button[data-difficulty="easy"]');
await page.waitForSelector("#board button[data-index]");
// Click a tile and capture mid-flip + settled.
await page.click('#board button[data-index="0"]');
await page.waitForTimeout(230); // mid-flip (~halfway of 560ms)
let board = await page.$("#board");
await board.screenshot({ path: "C:/Users/razva/AppData/Local/Temp/claude/d--dev-mb/86310a7e-97b0-402d-9721-82358be358c4/scratchpad/flip-mid.png" });
await page.waitForTimeout(600); // settled revealed
board = await page.$("#board");
await board.screenshot({ path: "C:/Users/razva/AppData/Local/Temp/claude/d--dev-mb/86310a7e-97b0-402d-9721-82358be358c4/scratchpad/flip-settled.png" });
await browser.close();
console.log("ok");
