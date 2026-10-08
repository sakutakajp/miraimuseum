import { test, expect } from "@playwright/test";
import { DEEP_TIME_SAVE_KEY } from "../../app/game/dinosaur/systems/records";
import { entityPoint } from "./helpers/dinosaur";

const home = '[data-testid="floating-earth-experience"]';

async function savedClear(page: import("@playwright/test").Page) {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ cleared: true, bestProgress: 1 })), DEEP_TIME_SAVE_KEY);
}

test("the uploaded car drives on Earth alongside the dinosaur", async ({ page }) => {
  await savedClear(page);
  await page.setViewportSize({ width: 800, height: 550 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-earth-ready", "true", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-state", "settled", { timeout: 30000 });
  const before = Number(await root.getAttribute("data-cybertruck-angle"));
  await expect.poll(async () => Number(await root.getAttribute("data-cybertruck-angle")))
    .toBeGreaterThan(before + 0.03);
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await expect(root).toHaveAttribute("data-cybertruck-visible", "true");
  await expect(page.getByTestId("dinosaur-control")).toBeEnabled();
  await page.screenshot({ path: "work/cybertruck-earth.png" });
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  await page.getByTestId("earth-control").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw")))
    .toBeGreaterThan(yaw + 0.1);
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb");
  expect(errors).toEqual([]);
});

test("reduced motion pauses driving while the globe remains interactive", async ({ page }) => {
  await savedClear(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb", { timeout: 30000 });
  const angle = await root.getAttribute("data-cybertruck-angle");
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw")))
    .toBeGreaterThan(yaw + 0.005);
  await expect(root).toHaveAttribute("data-cybertruck-angle", angle!);
  await expect(page.getByTestId("earth-control")).toBeEnabled();
});

test("a failed car download leaves the Earth and dinosaur available", async ({ page }) => {
  await savedClear(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("**/floating-earth/cybertruck.glb", route => route.fulfill({ status: 404, body: "" }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-cybertruck-source", "unavailable", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-visible", "false");
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await expect(page.getByTestId("dinosaur-control")).toBeEnabled();
  expect(errors).toEqual([]);
});

test("an uncleared visitor sees the dinosaur without downloading or revealing the car", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(new URL(request.url()).pathname));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-entry", "locked");
  await expect(root).toHaveAttribute("data-cybertruck-state", "locked");
  await expect(root).toHaveAttribute("data-cybertruck-visible", "false");
  await expect(root).toHaveAttribute("data-cybertruck-column", "false");
  expect(requests).not.toContain("/floating-earth/cybertruck.glb");
});

test("a returning cleared visitor gets simultaneous light-first introductions, even with a delayed car", async ({ page }) => {
  await savedClear(page);
  await page.setViewportSize({ width: 800, height: 550 });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/floating-earth/cybertruck.glb", async route => { await gate; await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await expect(root).toHaveAttribute("data-dinosaur-source", "glb", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-dinosaur-state", "waiting");
  await expect(root).toHaveAttribute("data-cybertruck-visible", "false");
  await root.evaluate(el => {
    const node = el as HTMLElement & { introductions: string[] };
    node.introductions = [];
    new MutationObserver(() => {
      const states = `${node.dataset.dinosaurState}|${node.dataset.cybertruckState}`;
      if (node.introductions.at(-1) !== states) node.introductions.push(states);
    }).observe(node, { attributes: true, attributeFilter: ["data-dinosaur-state", "data-cybertruck-state"] });
  });
  release();
  await expect(root).toHaveAttribute("data-cybertruck-column", "true", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-state", "settled", { timeout: 30000 });
  const stages = await root.evaluate(el => (el as HTMLElement & { introductions: string[] }).introductions);
  expect(stages).toContain("light|light");
  expect(stages).toContain("revealing|revealing");
  expect(stages).toContain("settled|settled");
  expect(stages.every(stage => { const [dinosaur, car] = stage.split("|"); return dinosaur === car; })).toBe(true);
  await expect(root).toHaveAttribute("data-cybertruck-column", "false");
});

test("a car touch shows the next-game notice, while dragging, the far side and keyboard activation stay distinct", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await savedClear(page);
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home), car = page.getByTestId("cybertruck-control"), earth = page.getByTestId("earth-control");
  const notice = page.getByRole("dialog");
  await expect(root).toHaveAttribute("data-cybertruck-state", "settled", { timeout: 30000 });
  const point = await entityPoint(page, "cybertruck-control");
  const before = Number(await root.getAttribute("data-earth-yaw"));
  const input = await context.newCDPSession(page);
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id: 0 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x - 25, y: point.y + 8, id: 0 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw"))).toBeLessThan(before - 0.2);
  await expect(notice).toBeHidden();
  await earth.focus();
  await page.keyboard.press("Home");
  const tap = await entityPoint(page, "cybertruck-control");
  await page.screenshot({ path: "work/cybertruck-silver-mobile.png" });
  await page.touchscreen.tap(tap.x, tap.y);
  await expect(notice).toContainText("次のゲームは開発中です。");
  await expect(notice).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(notice).toBeHidden();
  await car.focus();
  await page.keyboard.press("Enter");
  await expect(notice).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(notice).toBeHidden();
  await page.getByTestId("language-switch").click();
  await car.focus();
  await page.keyboard.press("Space");
  await expect(notice).toContainText("The next game is in development.");
  await page.keyboard.press("Escape");
  await earth.focus();
  for (let step = 0; step < 10; step++) await page.keyboard.press("Shift+ArrowRight");
  await expect(root).toHaveAttribute("data-cybertruck-visible", "false");
  await expect(car).toBeHidden();
  await expect(earth).toBeEnabled();
  expect(errors).toEqual([]);
  await context.close();
});
