import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page
    .locator(".v2-card")
    .filter({ hasText: "MIRAI: STAR DIVE" })
    .click();
  await page
    .getByRole("button", { name: "Choose a stage", exact: false })
    .click();
  await page.locator(".stage-choice").click();
  await expect(page.locator(".dive-hud")).toBeVisible();
  await page.locator(".dive-debug summary").click();
}
test("section visuals, pause/visibility, clear persistence and exhibit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/museum?starDiveDebug=1");
  await expect(page.locator(".v2-shell[data-ready=true]")).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await start(page);
  await page.getByLabel("Debug quality").selectOption("low");
  await expect(page.locator(".star-dive")).toHaveAttribute(
    "data-quality",
    "low",
  );
  await page.screenshot({ path: "/tmp/star-dive-dive.png" });
  await page.getByLabel("Debug section").selectOption("4");
  await expect(page.locator(".star-dive")).toHaveAttribute(
    "data-section",
    "inside",
  );
  await expect(page.locator(".star-dive")).toHaveAttribute(
    "data-gate-open",
    "true",
    { timeout: 10000 },
  );
  await page.screenshot({ path: "/tmp/star-dive-inside.png" });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Take a break" }),
  ).toBeVisible();
  const progress = await page
    .locator(".dive-stage-progress i")
    .getAttribute("style");
  await page.waitForTimeout(250);
  expect(
    await page.locator(".dive-stage-progress i").getAttribute("style"),
  ).toBe(progress);
  await page.getByRole("button", { name: "Resume adventure" }).click();
  await expect
    .poll(async () =>
      Number(
        (await page.locator(".dive-sync").textContent())?.match(
          /[\d.]+/,
        )?.[0] ?? 1,
      ),
    )
    .toBeLessThan(0.02);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("heading", { name: "Take a break" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
  await page.getByRole("button", { name: "Resume adventure" }).click();
  await page.getByRole("button", { name: "Debug clear", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Stage cleared!" }),
  ).toBeVisible();
  await expect(page.locator(".dive-new-best")).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("mirai-museum:v2")!)["star-flight"],
  );
  expect(saved.best).toBeGreaterThanOrEqual(6000);
  expect(saved.unlocked).toBe(2);
  expect(saved.discoveries).toEqual(["asteroid"]);
  await page.getByRole("button", { name: "Explore the exhibit" }).click();
  await expect(
    page.getByRole("dialog", { name: "Asteroid exhibit" }),
  ).toContainText("between Mars and Jupiter");
  await page.getByRole("button", { name: "Close exhibit" }).click();
  await page.getByRole("button", { name: "Return to the museum" }).click();
  await page.reload();
  await expect(page.locator(".museum-discovery")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("mirai-museum:v2")!)["star-flight"]
          .best,
    ),
  ).toBe(saved.best);
  expect(errors).toEqual([]);
});
test("failure keeps BEST unchanged, retries quickly, and safely handles context loss", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("mirai-museum:language", "en");
    localStorage.setItem(
      "mirai-museum:v2",
      JSON.stringify({
        "star-flight": {
          stages: { 1: { best: 12000, cleared: true } },
          discoveries: ["asteroid"],
        },
      }),
    );
  });
  await page.goto("/museum?starDiveDebug=1");
  await expect(page.locator(".v2-shell[data-ready=true]")).toBeVisible();
  await start(page);
  await page.getByRole("button", { name: "Debug fail", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Try again!" })).toBeVisible({
    timeout: 2000,
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("mirai-museum:v2")!)["star-flight"]
          .best,
    ),
  ).toBe(12000);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator(".dive-hud")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".dive-gesture")).toHaveCount(0);
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { bubbles: true })),
    );
  await expect(
    page.getByRole("heading", { name: "Space could not be loaded." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await expect(page.locator(".v2-grid")).toBeVisible();
  expect(errors).toEqual([]);
});

test("unavailable WebGL2 shows a recoverable museum error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("mirai-museum:language", "en");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof original>
    ) {
      if ((args[0] as string).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/museum?starDiveDebug=1");
  await expect(page.locator(".v2-shell[data-ready=true]")).toBeVisible();
  await page
    .locator(".v2-card")
    .filter({ hasText: "MIRAI: STAR DIVE" })
    .click();
  await page
    .getByRole("button", { name: "Choose a stage", exact: false })
    .click();
  await page.locator(".stage-choice").click();
  await expect(
    page.getByRole("heading", { name: "Space could not be loaded." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await expect(page.locator(".v2-grid")).toBeVisible();
  expect(errors).toEqual([]);
});
