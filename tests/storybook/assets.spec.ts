import { expect, test } from "@playwright/test";
test("Babylon home preview renders the same supplied Earth", async ({ page }) => {
  await page.goto("/iframe.html?id=babylon-home--home&viewMode=story");
  await expect(page.locator('[data-testid="floating-earth-experience"]')).toHaveAttribute("data-earth-ready", "true", { timeout: 90000 });
  await expect(page.locator("canvas")).toHaveCount(1);
});
