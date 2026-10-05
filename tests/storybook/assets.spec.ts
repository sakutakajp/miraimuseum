import { test, expect } from "@playwright/test";
for (const id of [
  "ui-gamecard--dinosaur",
  "ui-gamehud--last-life",
  "characters-pixelsprite--explorer",
  "characters-spaceship--damaged",
  "objects-space--pixel-objects",
  "objects-space--asteroid",
  "objects-impact--frozen-frame",
  "backgrounds-dinosaur--ancient-forest",
  "backgrounds-dinosaur--illustration",
  "backgrounds-dinosaur--starfield",
]) {
  test(id, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("#storybook-root > div")).toBeVisible();
    if (
      id.includes("spaceship") ||
      id.includes("asteroid") ||
      id.includes("frozen-frame") ||
      id.includes("ancient-forest") ||
      id.includes("starfield")
    )
      await expect(page.locator("canvas")).toBeVisible();
    if (
      id.includes("explorer") ||
      id.includes("pixel-objects") ||
      id.includes("illustration")
    )
      expect(await page.locator("svg rect").count()).toBeGreaterThan(0);
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
    expect(errors).toEqual([]);
    if (id.includes("frozen-frame"))
      await page.screenshot({ path: "/tmp/storybook-impact.png" });
  });
}
test("language toolbar applies to real game cards", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=ui-gamecard--dinosaur&viewMode=story&globals=locale:en",
  );
  await expect(
    page.getByRole("heading", { name: "Dinosaur Dash" }),
  ).toBeVisible();
});
