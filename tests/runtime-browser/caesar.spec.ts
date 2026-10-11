import { test, expect } from "@playwright/test";
test("direct entry creates no WebGL or narration and repeated routes keep one music context", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__speechCalls = 0;
    (window as any).__contexts = [];
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor() {
        super();
        (window as any).__contexts.push(this);
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      get() {
        (window as any).__speechCalls++;
        return undefined;
      },
      configurable: true,
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "おんがくを オン", exact: true })
    .click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("link", { name: /はいる/ }).click();
    await expect(page.locator(".sunny-game")).toHaveAttribute(
      "data-phase",
      "active",
    );
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page
      .getByRole("link", { name: "はくぶつかんへ", exact: true })
      .click();
  }
  expect(await page.evaluate(() => (window as any).__contexts.length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__speechCalls)).toBe(0);
  expect(errors).toEqual([]);
});
