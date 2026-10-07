import { test, expect } from "@playwright/test";
import { dinosaurPoint } from "./helpers/dinosaur";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
});

test("home loads visibly, rotates continuously, responds to scroll and opens the dinosaur game", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/floating-earth/earth-vivid.glb", async route => { await gate; await route.continue(); });
  await page.goto("/");
  const root = page.getByTestId("floating-earth-experience");
  await expect(page.getByRole("status")).toHaveText("Loading...");
  await expect(page.getByTestId("earth-control")).toBeHidden();
  await expect(page.locator(".earth-home__fallback")).toBeHidden();
  await expect(page.getByRole("heading", { name: "MIRAI MUSEUM" })).toBeVisible();
  expect(await page.locator("h1").evaluate(el => getComputedStyle(el).fontFamily)).toContain("M PLUS Rounded 1c");
  expect(await page.locator("h1").evaluate(el => getComputedStyle(el).fontWeight)).toBe("700");
  await expect(page.getByText("世界に、触れる。", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Earth imagery credits")).toHaveCount(0);
  await expect(page.locator('a[href="/museum"]')).toHaveCount(0);
  await expect(page.locator(".earth-home__header a, .earth-home__header button")).toHaveCount(0);
  release();
  await expect(root).toHaveAttribute("data-earth-ready", "true", { timeout: 30000 });
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByTestId("earth-control")).toBeVisible();
  const yaw = () => root.evaluate(el => Number((el as HTMLElement).dataset.earthYaw));
  const before = await yaw();
  await expect.poll(yaw).toBeGreaterThan(before + 0.01);
  const scrollBefore = await yaw();
  await page.mouse.move(300, 300);
  await page.mouse.wheel(0, 140);
  await expect.poll(yaw).toBeGreaterThan(scrollBefore + 0.2);
  await page.getByTestId("earth-control").focus();
  await page.keyboard.press("ArrowDown");
  await expect(root).toHaveAttribute("data-earth-pitch", "0.16000");
  await page.keyboard.press("Home");
  const point = await dinosaurPoint(page);
  await page.mouse.click(point.x, point.y);
  await expect(page).toHaveURL(/\/dinosaur\?play=1$/);
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-loaded", "true", { timeout: 30000 });
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running");
  await expect(page.getByRole("button", { name: "スタート", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.getByRole("button", { name: "ホームへ戻る", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".deep-time-host")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile WebGL failure ends loading and keeps the direct game link available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/floating-earth/earth-vivid.glb", route => route.abort());
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByTestId("floating-earth-experience")).toHaveAttribute("data-renderer", "static");
  await expect(page.locator(".earth-home__fallback")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "恐竜ゲームをはじめる" }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-loaded", "true", { timeout: 30000 });
});

test("museum pages have been removed", async ({ page }) => {
  for (const path of ["/museum", "/museum/games", "/museum/dinosaur-run"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});
