import { expect, type Page } from "@playwright/test";

/** Locate actual pickable geometry, rather than clicking the keyboard-only proxy. */
export async function dinosaurPoint(page: Page) {
  const entity = page.getByTestId("dinosaur-control");
  await expect(entity).toBeVisible({ timeout: 30000 });
  for (const y of [0.55, 0.7, 0.4, 0.25, 0.85]) {
    for (const x of [0.5, 0.65, 0.35, 0.8, 0.2]) {
      const bounds = await page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>('[data-testid="dinosaur-control"]')!;
        if (button.hidden) return null;
        const { x, y, width, height } = button.getBoundingClientRect();
        return { x, y, width, height };
      });
      if (!bounds) throw new Error("The revealed dinosaur became unavailable");
      const point = { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y };
      await page.mouse.move(point.x, point.y);
      if (await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-testid="earth-control"]')!.style.cursor === "pointer")) return point;
      await page.waitForTimeout(60);
    }
  }
  throw new Error("No visible dinosaur geometry was pickable");
}
