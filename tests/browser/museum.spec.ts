import { expectBaseText } from "./helpers/text";
import { test, expect, type Page } from "@playwright/test";
import {
  obstacles,
  collectibles,
  STAGE_LENGTH,
} from "../../app/game/expedition";
import { SAVE_KEY } from "../../app/game/progress";
async function expectMobileViewportFilled(page: Page) {
  await expect
    .poll(() => page.locator("canvas").evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      return Math.max(
        Math.abs(bounds.x),
        Math.abs(bounds.y),
        Math.abs(bounds.width - innerWidth),
        Math.abs(bounds.height - innerHeight),
      );
    }))
    .toBeLessThan(2);
  expect(
    await page.evaluate(() =>
      document.documentElement.scrollHeight <= innerHeight &&
      document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("desktop: empty museum, corrupt save recovery and sound preference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /世界の「なぜ？」は、/ }),
  ).toBeVisible();
  await expect(page.locator('.hero h1 ruby rt').first()).toHaveText('せかい');
  await expect(page.locator('.hero h1 ruby rt').first()).toHaveAttribute('aria-hidden', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: /Lv. 1 ·/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Lv. 2 ·/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Lv. 3 ·/ })).toBeDisabled();
  await page.getByRole("button", { name: "わたしの博物館" }).click();
  await expect(page.locator(".exhibit-card:disabled")).toHaveCount(6);
  await page.getByRole("button", { name: "音をオフにする" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "音をオンにする" }),
  ).toBeVisible();
  await page.evaluate(
    (key) => localStorage.setItem(key, "invalid json"),
    SAVE_KEY,
  );
  await page.reload();
  await expect(page.locator(".header-museum b")).toHaveText("0 / 18");
  await page.getByRole("button", { name: "冒険をはじめる" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".site-header")).toHaveCount(0);
  expect(
    await page.locator("canvas").evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      return bounds.height > innerHeight * 0.75 &&
        bounds.width < bounds.height && bounds.y >= 0 &&
        bounds.bottom <= innerHeight;
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "一時停止" }).click();
  await page.getByRole("button", {
    name: "博物館にもどる（今回の発見は保存されません）",
  }).click();
  await expect(page.locator(".site-header")).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile: play the full expedition, pause, discover all exhibits and restore them", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "わたしの博物館" }).tap();
  await expect(page.getByRole("heading", { name: "わたしの博物館。" })).toBeVisible();
  await page.getByRole("button", { name: "みらい博物館のホーム" }).tap();
  await page.getByRole("button", { name: "冒険をはじめる" }).tap();
  await expect(page.locator("canvas")).toBeVisible();
  await expectMobileViewportFilled(page);
  await expect(page.locator(".site-header")).toHaveCount(0);
  const progress = page.getByRole("progressbar");
  await expect(progress).toHaveAttribute("aria-valuenow", /\d/);
  await page.getByRole("button", { name: "一時停止" }).tap();
  const before = await progress.getAttribute("aria-valuenow");
  await page.waitForTimeout(700);
  expect(await progress.getAttribute("aria-valuenow")).toBe(before);
  await page.setViewportSize({ width: 320, height: 568 });
  await expectMobileViewportFilled(page);
  await expect(page.getByRole("button", { name: "冒険をつづける" })).toBeInViewport();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect
    .poll(() => page.locator("canvas").evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      return Math.abs(bounds.height - innerHeight);
    }))
    .toBeLessThan(2);
  await expect(page.getByRole("button", { name: "冒険をつづける" })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectMobileViewportFilled(page);
  expect(await progress.getAttribute("aria-valuenow")).toBe(before);
  await page.getByRole("button", { name: "冒険をつづける" }).tap();
  const targets = [
    ...obstacles.map((item) => ({ x: item.x, lead: 65 })),
    ...collectibles
      .filter((item) => item.elevated)
      .map((item) => ({ x: item.x, lead: 85 })),
  ].sort((a, b) => a.x - b.x);
  for (const target of targets) {
    // Read the real progress meter and tap the actual canvas; no scene mutation or time skipping.
    const threshold = ((target.x - target.lead) / STAGE_LENGTH) * 100;
    await page.waitForFunction(
      (value) =>
        Number(
          document
            .querySelector('[role="progressbar"]')
            ?.getAttribute("aria-valuenow"),
        ) >= value,
      threshold,
      { timeout: 15_000, polling: 30 },
    );
    await page.locator("canvas").tap({ position: { x: 160, y: 240 } });
  }
  await expect(
    page.getByRole("heading", { name: "おかえり、冒険家！" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".level-result")).toContainText("Lv. 2");
  await expect(page.locator(".result-count > strong")).toHaveText("6");
  await expectBaseText(page.locator(".result-count b"), "6 個が初めて");
  await page.getByRole("button", { name: "博物館で見てみる" }).tap();
  await expect(page.locator(".exhibit-card:not(:disabled)")).toHaveCount(6);
  await page
    .getByRole("button", { name: "ティラノサウルスの展示を見る", exact: true })
    .tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("北アメリカ");
  await page.getByRole("button", { name: "展示を閉じる" }).tap();
  await page.reload();
  await expect(page.locator(".header-museum b")).toHaveText("6 / 18");
  const save = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(save.expeditions).toBe(1);
  expect(Object.values(save.visits)).toEqual([1, 1, 1, 1, 1, 1]);
  await expect(page.getByRole("button", { name: /Lv. 2 ·/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Lv. 3 ·/ })).toBeDisabled();
  await page.getByRole("button", { name: /Lv. 1 ·/ }).tap();
  await page.getByRole("button", { name: "冒険をはじめる" }).tap();
  await expect(page.locator(".stage-heading h1")).toContainText("Lv. 1");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "一時停止" }).tap();
  await page
    .getByRole("button", {
      name: "博物館にもどる（今回の発見は保存されません）",
    })
    .tap();
  await expect(page.locator("canvas")).toHaveCount(0);
  const afterLeaving = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(afterLeaving.expeditions).toBe(1);
  expect(errors).toEqual([]);
  await context.close();
});

test("existing saves unlock higher levels and start the chosen difficulty", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, visits: { rex: 2 }, expeditions: 2, muted: true })), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: /Lv. 3 ·/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "冒険をはじめる" }).click();
  await expect(page.locator(".stage-heading h1")).toContainText("Lv. 3");
  await expect(page.locator("canvas")).toBeVisible();
});
