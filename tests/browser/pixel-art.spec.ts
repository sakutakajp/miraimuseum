import { test, expect } from "@playwright/test";

test("portrait, desktop and landscape render shared 2 CSS px dots without stretching images", async ({
  page,
}) => {
  for (const size of [
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    const art = page.locator(".museum-exterior-art");
    await expect(art).toHaveAttribute(
      "data-pixel-asset",
      size.width > size.height && size.height <= 550
        ? "exterior-landscape"
        : size.width >= 700
          ? "exterior-wide"
          : "exterior-phone",
    );
    await expect(art.locator("img").first()).toHaveJSProperty("complete", true);
    await expect(page.locator(".museum-entrance img")).toHaveJSProperty(
      "naturalWidth",
      64,
    );
    const metrics = await page
      .locator(".museum-pixel-frame > img,.museum-entrance img")
      .evaluateAll((images) =>
        images.map((image) => {
          const img = image as HTMLImageElement,
            r = img.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            nw: img.naturalWidth,
            nh: img.naturalHeight,
            filter: getComputedStyle(img).imageRendering,
          };
        }),
      );
    for (const m of metrics) {
      expect(m.width / m.nw).toBe(2);
      expect(m.height / m.nh).toBe(2);
      expect(m.filter).toBe("pixelated");
    }
    const button = await page
      .getByRole("link", { name: /はいる/ })
      .boundingBox();
    expect(button!.y).toBeGreaterThanOrEqual(0);
    expect(button!.y + button!.height).toBeLessThanOrEqual(size.height);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole("link", { name: /はいる/ }).click();
  await expect(page.locator(".sunny-game")).toHaveAttribute(
    "data-phase",
    "active",
  );
  const metrics = await page
    .locator(
      ".sunny-world .museum-pixel-frame > img,.sunny-world .ru-sprite img",
    )
    .evaluateAll((images) =>
      images.map((image) => {
        const img = image as HTMLImageElement,
          r = img.getBoundingClientRect();
        return {
          w: r.width / img.naturalWidth,
          h: r.height / img.naturalHeight,
          render: getComputedStyle(img).imageRendering,
        };
      }),
    );
  for (const m of metrics) {
    expect(m.w).toBe(2);
    expect(m.h).toBe(2);
    expect(m.render).toBe("pixelated");
  }
});
