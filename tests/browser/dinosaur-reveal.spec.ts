import { test, expect } from "@playwright/test";
import { dinosaurPoint } from "./helpers/dinosaur";

const home = '[data-testid="floating-earth-experience"]';

test("the optional GLB reveals after Earth readiness and remains attached during rotation", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 550 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/floating-earth/dinosaur.glb", async route => { await gate; await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await expect(root).toHaveAttribute("data-dinosaur-source", "loading");
  await expect(root).toHaveAttribute("data-dinosaur-state", "waiting");
  await expect(page.getByTestId("earth-control")).toBeEnabled();
  await root.evaluate(el => {
    const node = el as HTMLElement & { revealStates: string[] };
    node.revealStates = [node.dataset.dinosaurState!];
    new MutationObserver(() => {
      const state = node.dataset.dinosaurState!;
      if (node.revealStates.at(-1) !== state) node.revealStates.push(state);
    }).observe(node, { attributes: true, attributeFilter: ["data-dinosaur-state"] });
  });
  release();
  await expect(root).toHaveAttribute("data-dinosaur-source", "glb", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  expect(await root.evaluate(el => (el as HTMLElement & { revealStates: string[] }).revealStates))
    .toEqual(["waiting", "light", "revealing", "settled"]);
  await page.screenshot({ path: "work/dinosaur-front.png" });
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  const entity = await page.getByTestId("dinosaur-control").boundingBox();
  expect(entity!.x).toBeGreaterThanOrEqual(0);
  expect(entity!.x + entity!.width).toBeLessThanOrEqual(800);
  expect(entity!.y).toBeGreaterThanOrEqual(0);
  expect(entity!.y + entity!.height).toBeLessThanOrEqual(550);
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  const bounds = await page.getByTestId("earth-control").boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.25, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  // Keep capture held to inspect the opposite surface before release inertia.
  const diameter = Number(await root.getAttribute("data-earth-diameter"));
  await page.mouse.move(bounds!.x + bounds!.width * 0.25 + diameter / 2, bounds!.y + bounds!.height / 2);
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw"))).toBeGreaterThan(yaw + 3.1);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await expect(page.getByTestId("dinosaur-control")).toBeHidden();
  await page.getByTestId("earth-control").evaluate(el => (el as HTMLElement).blur());
  await page.screenshot({ path: "work/dinosaur-back.png" });
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled");
  expect(errors).toEqual([]);
});

test("missing dinosaur uses a brief reduced-motion reveal without failing Earth", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("**/floating-earth/dinosaur.glb", route => route.fulfill({ status: 404, body: "" }));
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(home)).toHaveAttribute("data-earth-ready", "true");
  await expect(page.locator(home)).toHaveAttribute("data-dinosaur-source", "placeholder");
  await expect(page.locator(home)).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 5000 });
  await expect(page.getByTestId("earth-control")).toBeEnabled();
  const entity = page.getByRole("button", { name: "ブラキオサウルスで恐竜ゲームをはじめる" });
  await expect(entity).toBeEnabled();
  await entity.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dinosaur\?play=1$/);
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running", { timeout: 30000 });
  expect(errors).toEqual([]);
});

test("mobile dinosaur fits and a real touch drag rotates Earth without opening the game", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home), earth = page.getByTestId("earth-control");
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  const point = await dinosaurPoint(page);
  const before = await page.evaluate(() => Number(document.querySelector<HTMLElement>('[data-testid="floating-earth-experience"]')!.dataset.earthYaw));
  const input = await context.newCDPSession(page);
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id: 0 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x - 25, y: point.y + 8, id: 0 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForFunction(yaw => Number(document.querySelector<HTMLElement>('[data-testid="floating-earth-experience"]')!.dataset.earthYaw) < yaw - 0.2, before);
  expect(new URL(page.url()).pathname).toBe("/");
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-testid="earth-control"]')!.focus());
  await page.keyboard.press("Home");
  await expect(page.getByTestId("dinosaur-control")).toBeVisible();
  const bounds = await page.evaluate(() => {
    const { x, y, width, height } = document.querySelector('[data-testid="dinosaur-control"]')!.getBoundingClientRect();
    return { x, y, width, height };
  });
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await earth.evaluate(el => (el as HTMLElement).blur());
  await page.screenshot({ path: "work/dinosaur-mobile.png" });
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  expect(errors).toEqual([]);
  await context.close();
});

test("a preloaded mobile Brachiosaurus tap starts immediately without another asset download", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  let entering = false;
  const entryAssets: string[] = [];
  page.on("request", request => {
    if (entering && new URL(request.url()).pathname.startsWith("/deep-time/")) entryAssets.push(request.url());
  });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(home)).toHaveAttribute("data-game-ready", "true", { timeout: 30000 });
  const tap = await dinosaurPoint(page);
  await page.evaluate(() => {
    const measurement = { tapped: 0, running: 0, modes: [] as string[] };
    (window as unknown as { gameEntry: typeof measurement }).gameEntry = measurement;
    document.addEventListener("pointerup", () => { measurement.tapped = performance.now(); }, { once: true, capture: true });
    new MutationObserver(() => {
      const mode = document.querySelector<HTMLElement>(".deep-time-host")?.dataset.mode;
      if (!mode || measurement.modes.at(-1) === mode) return;
      measurement.modes.push(mode);
      if (mode === "running" && !measurement.running) measurement.running = performance.now();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-mode"] });
  });
  entering = true;
  await page.touchscreen.tap(tap.x, tap.y);
  await expect(page).toHaveURL(/\/dinosaur\?play=1$/);
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running", { timeout: 30000 });
  const entry = await page.evaluate(() => (window as unknown as {
    gameEntry: { tapped: number; running: number; modes: string[] };
  }).gameEntry);
  expect(entry.tapped).toBeGreaterThan(0);
  expect(entry.running - entry.tapped).toBeLessThan(2000);
  expect(entry.modes).not.toContain("starting");
  expect(entryAssets).toEqual([]);
  await testInfo.attach("game-entry", { body: JSON.stringify({ milliseconds: entry.running - entry.tapped, modes: entry.modes, entryAssets }), contentType: "application/json" });
  await expect(page.getByRole("button", { name: "スタート", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  expect(errors).toEqual([]);
  await context.close();
});

test("a failed background preparation retries the missing art and audio when the dinosaur is tapped", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 550 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  let artAttempts = 0, audioAttempts = 0;
  await page.route("**/deep-time/brachiosaurus-0.svg", route => {
    artAttempts += 1;
    return artAttempts === 1 ? route.fulfill({ status: 503, body: "" }) : route.continue();
  });
  await page.route("**/deep-time/audio/mineral.ogg", route => {
    audioAttempts += 1;
    return audioAttempts === 1 ? route.fulfill({ status: 503, body: "" }) : route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(home)).toHaveAttribute("data-game-ready", "false", { timeout: 30000 });
  await expect(page.locator(home)).toHaveAttribute("data-earth-ready", "true");
  const tap = await dinosaurPoint(page);
  await page.mouse.click(tap.x, tap.y);
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running", { timeout: 30000 });
  expect(artAttempts).toBe(2);
  expect(audioAttempts).toBe(2);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.getByRole("button", { name: "ホームへ戻る", exact: true }).click();
  await expect(page.locator(home)).toHaveAttribute("data-game-ready", "true", { timeout: 30000 });
  const second = await dinosaurPoint(page);
  await page.mouse.click(second.x, second.y);
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running", { timeout: 30000 });
  expect(errors).toEqual([]);
});
