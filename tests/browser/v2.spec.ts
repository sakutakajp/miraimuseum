import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 } });
async function openGame(page: import("@playwright/test").Page, title: string) {
  await page
    .locator(".v2-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .click();
  await page
    .getByRole("button", { name: "Choose a stage", exact: false })
    .click();
  await page.locator(".stage-choice").click();
}
test("museum navigation, one-hit auto retry, records and language persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "mirai-museum:v2",
      JSON.stringify({
        "dinosaur-run": { stages: { 1: { best: 4800, cleared: true } } },
      }),
    ),
  );
  await page.goto("/museum?deepTimeDebug=1");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A world of games awaits." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore by play style" }).click();
  await page.getByRole("button", { name: "Action", exact: true }).click();
  await expect(page.locator(".v2-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(
    page.locator(".v2-card").filter({ hasText: "MIRAI: DEEP TIME" }),
  ).toContainText("STAGE 0 / 1");
  await openGame(page, "MIRAI: DEEP TIME");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-loaded",
    "true",
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "running",
  );
  await expect(page.locator(".deep-time-debug")).toHaveCount(0);
  expect(await page.evaluate(() => window.__deepTime)).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  const attempt = await page
    .locator(".deep-time-host")
    .getAttribute("data-attempts");
  await page.waitForTimeout(250);
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-attempts",
    attempt!,
  );
  await page.keyboard.press("Escape");
  await expect
    .poll(
      async () =>
        Number(
          await page.locator(".deep-time-host").getAttribute("data-attempts"),
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThanOrEqual(2);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mirai-museum:deep-time:v1")!),
  );
  expect(record.bestProgress).toBeGreaterThan(0);
  expect(record.bestClearScore).toBe(0);
  expect(errors).toEqual([]);
});
test("3D shooting renders, pauses, moves, clears and returns to shared shell", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "mirai-museum:v2",
      JSON.stringify({
        "star-flight": { stages: { 1: { best: 0, cleared: false } } },
      }),
    ),
  );
  await page.goto("/museum?starDiveDebug=1");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await openGame(page, "MIRAI: STAR DIVE");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Take a break" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume adventure", exact: false })
    .click();
  await page.mouse.move(370, 750);
  await page.mouse.down();
  await page.mouse.move(389, 843);
  await page.mouse.up();
  await page.screenshot({ path: "/tmp/mvp-space.png" });
  await expect(page.locator(".dive-debug")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Stage cleared!" }),
  ).toBeVisible({ timeout: 100000 });
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await expect(
    page.locator(".v2-card").filter({ hasText: "MIRAI: STAR DIVE" }),
  ).toContainText("STAGE 1 / 1");
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("responsive Japanese museum and keyboard DEEP TIME entry", async ({
  page,
}) => {
  await page.goto("/museum");
  for (const width of [320, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "/tmp/mvp-museum-ja.png", fullPage: true });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await openGame(page, "MIRAI: DEEP TIME");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-loaded",
    "true",
  );
  await page.getByRole("button", { name: "Start", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "running",
  );
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "SOUND ON", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "SOUND OFF", exact: false }),
  ).toBeVisible();
});

test("shooting hits show burst particles and score feedback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "mirai-museum:v2",
      JSON.stringify({
        "star-flight": { stages: { 1: { best: 0, cleared: false } } },
      }),
    ),
  );
  await page.goto("/museum");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await openGame(page, "MIRAI: STAR DIVE");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".dive-event")).toContainText(/\+\d+/, {
    timeout: 22000,
  });
  await expect(page.locator(".dive-chain")).toContainText("CHAIN");
  await page.screenshot({ path: "/tmp/shooter-impact.png" });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sound off", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
