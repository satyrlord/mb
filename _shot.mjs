import { chromium } from "playwright";

const OUT = process.argv[2] || "board.png";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });

// Start an Easy game.
await page.click('button[data-difficulty="easy"]');
await page.waitForSelector("#board button[data-index]", { timeout: 5000 });
await page.waitForTimeout(400);

// Rest state.
await page.screenshot({ path: OUT.replace(/\.png$/, "-rest.png") });

// Reveal first two tiles to show flipped faces + side faces mid-state.
await page.click('#board button[data-index="0"]');
await page.waitForTimeout(700);
await page.click('#board button[data-index="1"]');
await page.waitForTimeout(700);
await page.screenshot({ path: OUT.replace(/\.png$/, "-flipped.png") });

// Zoom: crop the board region tightly.
const board = await page.$("#board");
if (board) await board.screenshot({ path: OUT.replace(/\.png$/, "-board.png") });

await browser.close();
console.log("shots written");
