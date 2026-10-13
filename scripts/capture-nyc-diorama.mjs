// Use the repository's existing Playwright/Chromium setup; no browser download.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../docs/nyc-diorama/", import.meta.url));
mkdirSync(output, { recursive: true });
const url = process.argv[2] || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
page.on("console", message => { if (message.type() === "error" && !message.text().includes("net::ERR_FAILED")) console.error(message.text()); });
await page.route("https://fonts.googleapis.com/**", route => route.abort());
await page.goto(`${url}/lab/nyc-diorama`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${output}desktop-page.png`, fullPage: true });
await page.addStyleTag({ content: ".nyc-lab__zoom,.nyc-lab__selected { visibility:hidden!important } .nyc-renderer canvas:focus-visible { outline:none!important }" });
await page.locator("#nyc-viewer").screenshot({ path: `${output}original.png` });
const states = {};
const canvas = page.locator(".nyc-renderer canvas");
async function mode(value) {
  await page.locator(`#nyc-tab-${value}`).click();
  await page.waitForSelector('.nyc-renderer[data-ready="true"]', { timeout: 45_000 });
  await page.waitForFunction(() => document.querySelector(".nyc-renderer canvas")?.dataset.yaw !== undefined);
  await page.waitForTimeout(450);
}
async function capture(name) {
  await page.locator("#nyc-viewer").screenshot({ path: `${output}${name}.png` });
  states[name] = await canvas.evaluate(el => ({ width: el.width, height: el.height, ...el.dataset }));
  console.log(name, states[name]);
}
try {
  await mode("projection"); await capture("projection-reference");
  await mode("parallax"); await capture("parallax-reference");
  await canvas.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => Number(document.querySelector(".nyc-renderer canvas").dataset.yaw) === 8);
  await capture("parallax-yaw8-pitch3");
  await mode("projection"); await capture("projection-yaw8-pitch3");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  await mobile.route("https://fonts.googleapis.com/**", route => route.abort());
  await mobile.goto(`${url}/lab/nyc-diorama`, { waitUntil: "networkidle" });
  for (const value of ["projection", "parallax"]) {
    await mobile.locator(`#nyc-tab-${value}`).click();
    await mobile.waitForSelector('.nyc-renderer[data-ready="true"]', { timeout: 45_000 });
    await mobile.waitForFunction(() => document.querySelector(".nyc-renderer canvas")?.dataset.yaw === "0");
    await mobile.waitForTimeout(300);
    await mobile.addStyleTag({ content: ".nyc-lab__zoom {visibility:hidden!important}" });
    await mobile.locator("#nyc-viewer").screenshot({ path: `${output}mobile-${value}.png` });
    states[`mobile-${value}`] = await mobile.locator(".nyc-renderer canvas").evaluate(el => ({ width: el.width, height: el.height, cssWidth: el.clientWidth, ...el.dataset }));
    if (value === "projection") await mobile.screenshot({ path: `${output}mobile-page.png`, fullPage: true });
  }
  const resources = await mobile.evaluate(() => performance.getEntriesByType("resource").filter(r => new URL(r.name).pathname.startsWith("/diorama/")).map(r => ({ file: new URL(r.name).pathname, bytes: r.encodedBodySize })));
  writeFileSync(`${output}browser-capture.json`, JSON.stringify({ states, errors, resources, device: "Headless Chromium, SwiftShader. Mobile viewport/DPR/touch emulation, not a phone measurement." }, null, 2) + "\n");
  await mobileContext.close();
} finally { await browser.close(); }
