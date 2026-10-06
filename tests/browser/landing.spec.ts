import { expect, test, type Locator, type Page } from "@playwright/test";

const homepage = (page: Page) => page.getByTestId("floating-earth-experience");
const earthControl = (page: Page) => page.getByTestId("earth-control");
const fallback = (page: Page) =>
  page.locator('img[src="/floating-earth/earth-photo.webp"]');

async function orientation(root: Locator, axis: "yaw" | "pitch") {
  const value = await root.getAttribute(`data-earth-${axis}`);
  expect(value).not.toBeNull();
  const angle = Number(value);
  expect(Number.isFinite(angle)).toBe(true);
  return angle;
}

async function ready(page: Page) {
  await page.goto("/");
  await expect(homepage(page)).toHaveAttribute("data-renderer", "webgl");
  await expect(homepage(page)).toHaveAttribute("data-earth-ready", "true");
  await expect(earthControl(page)).toBeEnabled();
}

async function museumEntry(page: Page) {
  await page.getByRole("link", { name: /博物館へ/ }).click();
  await expect(page).toHaveURL(/\/museum$/);
  const games = page.locator(".v2-card");
  await expect(games).toHaveCount(2);
  await expect(
    games.getByRole("heading", { name: "MIRAI: DEEP TIME", exact: true }),
  ).toBeVisible();
  await expect(
    games.getByRole("heading", { name: "MIRAI: STAR DIVE", exact: true }),
  ).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("the floating Earth uses one canvas, spins on tap and enters the museum", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page).toHaveTitle(/MIRAI MUSEUM/);
  await expect(page.getByText("タップで回す · ドラッグで動かす")).toBeVisible();
  await expect(earthControl(page)).toHaveAccessibleName("地球を回す");
  await expect(page.locator("canvas")).toHaveCount(1);
  const canvas = await page.locator("canvas").elementHandle();
  const initialYaw = await orientation(homepage(page), "yaw");
  await earthControl(page).click();
  await expect
    .poll(async () => Math.abs((await orientation(homepage(page), "yaw")) - initialYaw))
    .toBeGreaterThan(0.08);
  await expect(page).toHaveURL(/\/$/);
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  await expect(page.getByTestId("landing-experience")).toHaveCount(0);
  await noOverflow(page);
  await museumEntry(page);
  expect(errors).toEqual([]);
});

test("drag changes both axes and keyboard controls rotate and reset without scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const root = homepage(page);
  const control = earthControl(page);
  const bounds = await control.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width * 0.45;
  const y = bounds!.y + bounds!.height * 0.45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + bounds!.width * 0.22, y + bounds!.height * 0.12, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs(await orientation(root, "yaw")))
    .toBeGreaterThan(0.08);
  await expect
    .poll(async () => Math.abs(await orientation(root, "pitch")))
    .toBeGreaterThan(0.03);
  await control.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => orientation(root, "yaw")).toBeCloseTo(0, 3);
  await expect.poll(() => orientation(root, "pitch")).toBeCloseTo(0, 3);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Math.abs(await orientation(root, "yaw")))
    .toBeGreaterThan(0.04);
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () => Math.abs(await orientation(root, "pitch")))
    .toBeGreaterThan(0.02);
  const beforeEnter = await orientation(root, "yaw");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => Math.abs((await orientation(root, "yaw")) - beforeEnter))
    .toBeGreaterThan(0.1);
  const beforeSpace = await orientation(root, "yaw");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Math.abs((await orientation(root, "yaw")) - beforeSpace))
    .toBeGreaterThan(0.1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(control).toBeFocused();
});

test.describe("mobile Earth", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("touch tap and drag work in portrait and landscape without replacing the canvas", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    const root = homepage(page);
    const control = earthControl(page);
    const canvas = await page.locator("canvas").elementHandle();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    const x = bounds!.x + bounds!.width * 0.5;
    const y = bounds!.y + bounds!.height * 0.5;
    await page.touchscreen.tap(x, y);
    await expect
      .poll(async () => Math.abs(await orientation(root, "yaw")))
      .toBeGreaterThan(0.1);
    await control.focus();
    await page.keyboard.press("Home");
    await expect.poll(() => orientation(root, "yaw")).toBeCloseTo(0, 3);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 6; step++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + step * 14, y: y - step * 7 }],
      });
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
    await expect
      .poll(async () => Math.abs(await orientation(root, "yaw")))
      .toBeGreaterThan(0.08);
    await expect
      .poll(async () => Math.abs(await orientation(root, "pitch")))
      .toBeGreaterThan(0.03);
    const yaw = await orientation(root, "yaw");
    const pitch = await orientation(root, "pitch");
    for (const size of [
      { width: 390, height: 780 },
      { width: 844, height: 390 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(size);
      await noOverflow(page);
      await expect(control).toBeVisible();
      const resized = await control.boundingBox();
      expect(resized!.x).toBeGreaterThanOrEqual(-1);
      expect(resized!.y).toBeGreaterThanOrEqual(-1);
      expect(resized!.x + resized!.width).toBeLessThanOrEqual(size.width + 1);
      expect(resized!.y + resized!.height).toBeLessThanOrEqual(size.height + 1);
      await expect.poll(() => orientation(root, "yaw")).toBeCloseTo(yaw, 3);
      await expect.poll(() => orientation(root, "pitch")).toBeCloseTo(pitch, 3);
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
    }
    await museumEntry(page);
  });
});

test("reduced motion keeps the Earth still at rest and immediately accepts explicit rotation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const root = homepage(page);
  await expect(root).toHaveAttribute("data-motion", "reduced");
  const initialYaw = await orientation(root, "yaw");
  const initialPitch = await orientation(root, "pitch");
  await page.waitForTimeout(350);
  expect(await orientation(root, "yaw")).toBe(initialYaw);
  expect(await orientation(root, "pitch")).toBe(initialPitch);
  await earthControl(page).click();
  await expect
    .poll(async () => Math.abs((await orientation(root, "yaw")) - initialYaw))
    .toBeGreaterThan(0.1);
  const tappedYaw = await orientation(root, "yaw");
  await page.waitForTimeout(350);
  expect(await orientation(root, "yaw")).toBe(tappedYaw);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root).toHaveAttribute("data-motion", "full");
  await earthControl(page).click();
  await expect
    .poll(async () => Math.abs((await orientation(root, "yaw")) - tappedYaw))
    .toBeGreaterThan(0.1);
});

test("WebGL failure preserves the illustrated Earth and museum route", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2" || type === "webgl") return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(homepage(page)).toHaveAttribute("data-renderer", "static");
  await expect(fallback(page)).toBeVisible();
  await expect(earthControl(page)).toBeDisabled();
  await noOverflow(page);
  await museumEntry(page);
});

test("the Earth and museum entry remain usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3001/");
  await expect(homepage(page)).toHaveAttribute("data-renderer", "static");
  await expect(fallback(page)).toBeVisible();
  expect(await fallback(page).evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  await museumEntry(page);
  await context.close();
});

test("model download failure retains the Earth fallback and museum entry", async ({ page }) => {
  const errors: string[] = [];
  let requested = false;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/floating-earth/earth-vivid.glb", async (route) => {
    requested = true;
    await route.abort();
  });
  await page.goto("/");
  await expect.poll(() => requested).toBe(true);
  await expect(homepage(page)).toHaveAttribute("data-renderer", "static");
  await expect(fallback(page)).toBeVisible();
  await expect(earthControl(page)).toBeDisabled();
  await museumEntry(page);
  expect(errors).toEqual([]);
});

test("background pause freezes rotation, resume accepts input, and context loss restores fallback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  const root = homepage(page);
  await earthControl(page).click();
  await expect
    .poll(async () => Math.abs(await orientation(root, "yaw")))
    .toBeGreaterThan(0.05);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(root).toHaveAttribute("data-suspended", "true");
  const paused = await orientation(root, "yaw");
  await page.waitForTimeout(200);
  expect(await orientation(root, "yaw")).toBe(paused);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(root).toHaveAttribute("data-suspended", "false");
  await earthControl(page).focus();
  const resumed = await orientation(root, "yaw");
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(async () => Math.abs((await orientation(root, "yaw")) - resumed))
    .toBeGreaterThan(0.05);
  const contextLost = await page.locator("canvas").evaluate((node: HTMLCanvasElement) => {
    const extension = node.getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(contextLost).toBe(true);
  await expect(root).toHaveAttribute("data-renderer", "static");
  await expect(fallback(page)).toBeVisible();
  await expect(earthControl(page)).toBeDisabled();
  await museumEntry(page);
  expect(errors).toEqual([]);
});

test("context loss during model loading cannot revive a disposed Earth renderer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let modelHeld = false;
  let releaseModel!: () => void;
  const held = new Promise<void>((resolve) => { releaseModel = resolve; });
  await page.route("**/floating-earth/earth-vivid.glb", async (route) => {
    const response = await route.fetch();
    await response.body();
    modelHeld = true;
    await held;
    await route.fulfill({ response });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => modelHeld).toBe(true);
  const root = homepage(page);
  await expect(root).toHaveAttribute("data-earth-ready", "false");
  await page.locator("canvas").evaluate(async (node: HTMLCanvasElement) => {
    const extension = node.getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("The initialized renderer must support context loss");
    await new Promise<void>((resolve) => {
      node.addEventListener("webglcontextlost", () => resolve(), { once: true });
      extension.loseContext();
    });
  });
  await expect(root).toHaveAttribute("data-renderer", "static");
  const modelResponse = page.waitForResponse("**/floating-earth/earth-vivid.glb");
  releaseModel();
  await (await modelResponse).finished();
  // Let fetch/json, model construction and the create() continuation finish.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(root).toHaveAttribute("data-earth-ready", "false");
  await expect(root).toHaveAttribute("data-renderer", "static");
  await expect(earthControl(page)).toBeDisabled();
  await expect(fallback(page)).toBeVisible();
  await museumEntry(page);
  expect(errors).toEqual([]);
});
