import { test, expect } from "@playwright/test";
test("runner stops its frame loop on pause, hidden state and unmount, and does not duplicate it on return", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const live = new Set<number>();
    const raf = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    (window as any).__runFrames = live;
    window.requestAnimationFrame = (callback) => {
      let id = raf((time) => {
        live.delete(id);
        callback(time);
      });
      live.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      live.delete(id);
      cancel(id);
    };
  });
  await page.goto("/");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page
      .getByRole("link", { name: "もりランで あそぶ", exact: true })
      .click();
    await page.getByRole("button", { name: "はしる", exact: true }).click();
    await expect(page.locator(".ru-run")).toHaveAttribute(
      "data-mode",
      "running",
    );
    await expect
      .poll(() => page.evaluate(() => (window as any).__runFrames.size))
      .toBe(1);
    await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__runFrames.size))
      .toBe(0);
    await page.getByRole("button", { name: "つづける", exact: true }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator(".ru-run")).toHaveAttribute(
      "data-mode",
      "paused",
    );
    expect(await page.evaluate(() => (window as any).__runFrames.size)).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page
      .getByRole("link", { name: "はくぶつかんへ", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__runFrames.size))
      .toBe(0);
    await expect(page.locator("canvas")).toHaveCount(0);
  }
});
