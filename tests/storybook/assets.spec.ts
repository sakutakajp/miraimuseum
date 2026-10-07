import { test, expect } from "@playwright/test";
for (const id of [
  "ui-gamecard--dinosaur",
  "backgrounds-gameartwork--dinosaur",
  "ui-gamehud--last-life",
  "characters-pixelsprite--explorer",
  "backgrounds-dinosaur--ancient-forest",
  "backgrounds-dinosaur--present",
  "backgrounds-dinosaur--chase",
  "backgrounds-dinosaur--flash",
  "backgrounds-dinosaur--fallout",
  "backgrounds-dinosaur--boundary",
  "backgrounds-dinosaur--low-quality",
  "backgrounds-dinosaur--reduced-motion",
  "backgrounds-dinosaur--illustration",
]) {
  test(id, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("#storybook-root > div")).toBeVisible();
    if (id.startsWith("backgrounds-dinosaur") && !id.endsWith("illustration"))
      await expect(page.locator("canvas")).toBeVisible();
    if (
      id.includes("explorer") ||
      id.includes("pixel-objects") ||
      id.includes("illustration")
    )
      expect(await page.locator("svg rect").count()).toBeGreaterThan(0);
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
    expect(errors).toEqual([]);

  });
}
test("language toolbar applies to real game cards", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=ui-gamecard--dinosaur&viewMode=story&globals=locale:en",
  );
  await expect(
    page.getByRole("heading", { name: "MIRAI: DEEP TIME" }),
  ).toBeVisible();
});
