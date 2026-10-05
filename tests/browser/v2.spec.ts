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
test("museum navigation, 2D failure, records and language persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A world of games awaits." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore by play style" }).click();
  await page.getByRole("button", { name: "Action", exact: true }).click();
  await expect(page.locator(".v2-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await openGame(page, "Dinosaur Dash");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".demo")).toBeVisible();
  await expect(page.locator(".demo")).toBeHidden({ timeout: 10000 });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Take a break" }),
  ).toBeVisible();
  const pausedDistance = await page
    .locator(".mvp-hud progress")
    .getAttribute("value");
  await page.waitForTimeout(300);
  expect(await page.locator(".mvp-hud progress").getAttribute("value")).toBe(
    pausedDistance,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Take a break" }),
  ).toBeHidden();
  await expect(page.getByRole("heading", { name: "Try again!" })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".score-panel strong")).not.toHaveText("0");
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("mirai-museum:v2")!)["dinosaur-run"]
          .stages["1"].best,
    ),
  ).toBeGreaterThan(0);
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
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await openGame(page, "Star Flight");
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
  await expect(
    page.getByRole("heading", { name: "Stage cleared!" }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Return to the museum", exact: true })
    .click();
  await expect(
    page.locator(".v2-card").filter({ hasText: "Star Flight" }),
  ).toContainText("STAGE 1 / 1");
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("dinosaur clear with keyboard jumps and responsive Japanese museum", async ({
  page,
}) => {
  await page.goto("/");
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
  await openGame(page, "Dinosaur Dash");
  await expect(page.locator(".demo")).toBeHidden({ timeout: 10000 });
  for (const rock of [
    900, 1850, 3450, 4100, 5000, 5700, 6500, 7650, 8350, 9000, 9720,
  ].map((x) => x * 0.6)) {
    await page.waitForFunction(
      (rock) => {
        const bar =
          document.querySelector<HTMLProgressElement>(".mvp-hud progress");
        if (!bar || rock - bar.value * 6270 > 65) return false;
        const down = new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          bubbles: true,
        });
        Object.defineProperty(down, "keyCode", { value: 32 });
        window.dispatchEvent(down);
        const up = new KeyboardEvent("keyup", {
          key: " ",
          code: "Space",
          bubbles: true,
        });
        Object.defineProperty(up, "keyCode", { value: 32 });
        window.dispatchEvent(up);
        return true;
      },
      rock,
      { timeout: 10000 },
    );
  }
  await expect(
    page.getByRole("heading", { name: "Stage cleared!" }),
  ).toBeVisible({ timeout: 60000 });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("mirai-museum:v2")!)["dinosaur-run"]
          .unlocked,
    ),
  ).toBe(2);
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
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await openGame(page, "Star Flight");
  await expect(page.locator("canvas")).toBeVisible();
  await page.mouse.move(313, 468);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator(".hit-reward")).toContainText(/HIT!|COMBO!/, {
    timeout: 15000,
  });
  await expect(page.locator(".hit-reward strong")).toHaveText(/\+\d+/);
  await page.screenshot({ path: "/tmp/shooter-impact.png" });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sound off", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
