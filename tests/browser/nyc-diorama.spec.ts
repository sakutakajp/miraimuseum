import { test, expect, type Page } from "@playwright/test";

async function show3D(page: Page, mode: "projection" | "parallax" = "projection") {
  await page.locator(`#nyc-tab-${mode}`).click();
  await expect(page.locator(".nyc-renderer")).toHaveAttribute("data-ready", "true", { timeout: 45_000 });
  const canvas = page.locator(".nyc-renderer canvas");
  await expect(canvas).toHaveAttribute("data-yaw", "0");
  return canvas;
}
const value = (page: Page, key: string) => page.locator(".nyc-renderer canvas")
  .evaluate((el, name) => Number((el as HTMLCanvasElement).dataset[name]), key);
async function sliderSteps(page: Page, name: string, steps: number, fromMinimum = true) {
  await page.getByRole("slider", { name }).focus();
  if (fromMinimum) await page.keyboard.press("Home");
  for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps < 0 ? "ArrowLeft" : "ArrowRight");
}

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
});

test("source-based modes, landmark picking, shared camera, zoom, limits, overlay and idle rendering", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/lab/nyc-diorama");
  await expect(page.getByRole("tab", { name: /元画像/ })).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".nyc-lab__source").evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(1254);
  const canvas = await show3D(page);
  await expect(canvas).toHaveAttribute("data-layer-count", "12");
  expect(Number(await canvas.getAttribute("data-projection-meshes"))).toBeGreaterThan(20);
  expect(Number(await canvas.getAttribute("data-projection-triangles"))).toBeGreaterThan(100);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 461/1254, box.y + box.height * 430/1254);
  await expect(page.locator(".nyc-lab__selected")).toContainText("エンパイア・ステート・ビルディング");
  await canvas.focus();
  for (let i = 0; i < 14; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowDown");
  await expect.poll(() => value(page, "yaw")).toBe(10);
  await expect.poll(() => value(page, "pitch")).toBe(5);
  await page.locator("#nyc-tab-parallax").click();
  await expect(canvas).toHaveAttribute("data-parallax-meshes", "12");
  await expect.poll(() => value(page, "yaw")).toBe(10);
  await page.locator(".nyc-lab__settings summary").click();
  await sliderSteps(page, "左右の回転角度制限", -8, false);
  await sliderSteps(page, "上下の回転角度制限", -4, false);
  await expect.poll(() => value(page, "yaw")).toBe(2);
  await expect.poll(() => value(page, "pitch")).toBe(1);
  await canvas.hover(); await page.mouse.wheel(0, -100);
  await expect.poll(() => value(page, "zoom")).toBeGreaterThan(1.1);
  await page.getByRole("checkbox", { name: "元画像を重ねる" }).check();
  await sliderSteps(page, "元画像の重ね合わせ濃度", 6);
  await expect(page.locator(".nyc-lab__overlay")).toHaveCSS("opacity", "0.3");
  await page.getByRole("button", { name: /基準視点に戻す/ }).click();
  await expect.poll(() => value(page, "yaw")).toBe(0);
  await expect.poll(() => value(page, "pitch")).toBe(0);
  await expect.poll(() => value(page, "zoom")).toBe(1);
  await page.getByRole("checkbox", { name: "元画像を重ねる" }).uncheck();
  const resetBox = (await canvas.boundingBox())!;
  await page.mouse.click(resetBox.x + resetBox.width * 751/1254, resetBox.y + resetBox.height * 430/1254);
  await expect(page.locator(".nyc-lab__selected")).toContainText("ワン・ワールド・トレード・センター");
  const renders = await value(page, "renderCount");
  await page.waitForTimeout(500);
  expect(await value(page, "renderCount")).toBe(renders);
  expect(errors).toEqual([]);
});

test("mobile DPR cap, real touch drag, pinch, cancellation and reset", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/lab/nyc-diorama");
  const canvas = await show3D(page, "parallax");
  const box = (await canvas.boundingBox())!;
  const width = await canvas.evaluate(el => (el as HTMLCanvasElement).width);
  expect(width).toBeLessThanOrEqual(Math.ceil(box.width * 1.35));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const session = await context.newCDPSession(page);
  const point = { x: box.x + box.width * .5, y: box.y + box.height * .5, id: 1 };
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  for (let i = 1; i <= 5; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, x: point.x + 12 * i }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => value(page, "yaw")).toBeLessThan(-2);
  await expect(canvas).toHaveAttribute("data-dragging", "false");
  const a = { ...point, id: 2, x: point.x - 40 }, b = { ...point, id: 3, x: point.x + 40 };
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [a, b] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...a, x: a.x - 20 }, { ...b, x: b.x + 20 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => value(page, "zoom")).toBeGreaterThan(1.2);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(canvas).toHaveAttribute("data-dragging", "false");
  await page.getByRole("button", { name: /基準視点に戻す/ }).click();
  await expect.poll(() => value(page, "yaw")).toBe(0);
  await expect.poll(() => value(page, "zoom")).toBe(1);
  await context.close();
});

test("failed cutout loading is visible, retry succeeds, route departure stops rendering", async ({ page }) => {
  await page.route("**/diorama/generated/empire-state.png", route => route.abort());
  await page.goto("/lab/nyc-diorama");
  await page.locator("#nyc-tab-projection").click();
  await expect(page.getByRole("alert")).toContainText("画像を読み込めません", { timeout: 20_000 });
  await expect(page.locator(".nyc-lab__source")).toBeVisible();
  await page.unroute("**/diorama/generated/empire-state.png");
  await page.getByRole("button", { name: "再試行" }).click();
  await expect(page.locator(".nyc-renderer")).toHaveAttribute("data-ready", "true", { timeout: 45_000 });
  const canvas = page.locator(".nyc-renderer canvas");
  const detached = await canvas.elementHandle();
  await canvas.focus(); await page.keyboard.press("ArrowRight");
  await page.getByRole("link", { name: /MIRAI MUSEUM/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".nyc-renderer")).toHaveCount(0);
  const before = await detached!.evaluate(el => (el as HTMLCanvasElement).dataset.renderCount);
  await page.waitForTimeout(500);
  expect(await detached!.evaluate(el => (el as HTMLCanvasElement).dataset.renderCount)).toBe(before);
});
