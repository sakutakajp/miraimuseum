import { expect, test, type Page } from "@playwright/test";

const supportingCopy =
  "宇宙も、生命も、数も、機械も。見方を変えれば、同じ世界の一部になる。";

async function at(page: Page, vh: number) {
  await page.evaluate(
    (value) => window.scrollTo(0, window.innerHeight * value),
    vh,
  );
}
test("continuous opening, native forward/reverse scroll, sound and museum entry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "MIRAI MUSEUM" }),
  ).toBeVisible();
  await expect(page.getByText("EXPLORE THE WORLD")).toBeVisible();
  const canvas = await page.locator(".landing-canvas").elementHandle();
  await at(page, 1);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "scale-shift",
  );
  await at(page, 3.6);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "connected",
  );
  await at(page, 2.35);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-core-state",
    "matter",
  );
  await at(page, 5.2);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "connected",
  );
  await expect(
    page.getByRole("heading", { name: "すべての学問は、つながっている。" }),
  ).toBeVisible();
  await expect(page.locator(".landing-connected-support")).toHaveText(
    supportingCopy,
  );
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  await expect(page.locator("canvas")).toHaveCount(1);
  await at(page, 0);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "threshold",
  );
  await expect(
    page.getByRole("heading", { name: "MIRAI MUSEUM" }),
  ).toBeVisible();
  const sound = page.getByTestId("landing-sound-toggle");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.locator(".landing-museum-link").click();
  await expect(page).toHaveURL(/\/museum$/);
  await expect(page.locator(".v2-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("mobile composition, reduced motion, chrome resize and fast reverse scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await at(page, 1 + 2.6 * 0.85);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-earth-phase",
    "connected",
  );
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-earth-dissolve",
    /^0(?:\.0+)?$/,
  );
  await at(page, 2.5);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "scale-shift",
  );
  await page.setViewportSize({ width: 390, height: 780 });
  await expect
    .poll(() => page.evaluate(() => scrollY / innerHeight))
    .toBeCloseTo(2.5, 1);
  await at(page, 5.2);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "connected",
  );
  await expect(
    page.getByRole("heading", { name: "すべての学問は、つながっている。" }),
  ).toBeVisible();
  await expect(page.locator(".landing-connected-support")).toHaveText(
    supportingCopy,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await at(page, 0);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "threshold",
  );
  await expect(
    page.getByRole("heading", { name: "MIRAI MUSEUM" }),
  ).toBeVisible();
});
test("WebGL failure preserves complete DOM opening, thesis and entry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2" || type === "webgl") return null;
      return getContext.apply(this, [type, ...args] as Parameters<
        typeof getContext
      >);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-renderer",
    "static",
  );
  await expect(
    page.getByRole("heading", { name: "MIRAI MUSEUM" }),
  ).toBeVisible();
  await at(page, 1 + 2.6 * 0.7);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-earth-phase",
    "machine",
  );
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-earth-dissolve",
    /^0(?:\.0+)?$/,
  );
  await at(page, 5.2);
  await expect(page.getByTestId("landing-experience")).toHaveAttribute(
    "data-scene",
    "connected",
  );
  await expect(
    page.getByRole("heading", { name: "すべての学問は、つながっている。" }),
  ).toBeVisible();
  await expect(page.locator(".landing-connected-support")).toHaveText(
    supportingCopy,
  );
  await page.locator(".landing-end-link").click();
  await expect(page.locator(".v2-card")).toHaveCount(2);
});

test("one Earth persists through observations before connected fragments appear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const root = page.getByTestId("landing-experience");
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await expect(root).toHaveAttribute("data-earth-object", /.+/);
  const earth = await root.getAttribute("data-earth-object");
  const canvas = await page.locator(".landing-canvas").elementHandle();
  const observations = [
    [0, "threshold"],
    [1 + 2.6 * 0.1, "space"],
    [1 + 2.6 * 0.28, "life"],
    [1 + 2.6 * 0.48, "matter"],
    [1 + 2.6 * 0.7, "machine"],
    [1 + 2.6 * 0.83, "connected"],
  ] as const;
  for (const [vh, phase] of observations) {
    await at(page, vh);
    await expect(root).toHaveAttribute("data-earth-phase", phase);
    await expect(root).toHaveAttribute("data-earth-dissolve", /^0(?:\.0+)?$/);
    await expect(root).toHaveAttribute("data-earth-object", earth!);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  }
  await at(page, 1 + 2.6 * 0.97);
  await expect(root).toHaveAttribute("data-earth-phase", "fragments");
  await expect
    .poll(async () => Number(await root.getAttribute("data-earth-dissolve")))
    .toBeGreaterThan(0);
  for (const [vh, phase] of [...observations].reverse()) {
    await at(page, vh);
    await expect(root).toHaveAttribute("data-earth-phase", phase);
    await expect(root).toHaveAttribute("data-earth-dissolve", /^0(?:\.0+)?$/);
    await expect(root).toHaveAttribute("data-earth-object", earth!);
  }
  expect(errors).toEqual([]);
});

test("Earth fragments suggest orbit, life, crystal, network and contours in either direction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const root = page.getByTestId("landing-experience");
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  const canvas = await page.locator(".landing-canvas").elementHandle();
  const structures = [
    [0.03, "orbit"],
    [0.23, "life"],
    [0.44, "crystal"],
    [0.65, "network"],
    [0.94, "contour"],
  ] as const;
  for (const [progress, form] of structures) {
    await at(page, 3.6 + 1.6 * progress);
    await expect(root).toHaveAttribute("data-scene", "connected");
    await expect(root).toHaveAttribute("data-connected-form", form);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  }
  await expect(page.locator(".landing-connected-support")).toHaveText(
    supportingCopy,
  );
  await expect(
    page.getByRole("heading", { name: "すべての学問は、つながっている。" }),
  ).toBeVisible();
  for (const [progress, form] of [...structures].reverse()) {
    await at(page, 3.6 + 1.6 * progress);
    await expect(root).toHaveAttribute("data-connected-form", form);
  }
});
test("SSR copy and routes remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3001/");
  await expect(
    page.getByRole("heading", { name: "MIRAI MUSEUM" }),
  ).toBeVisible();
  await expect(page.locator(".landing-nojs p").first()).toHaveText(
    "すべての学問は、つながっている。",
  );
  await page.locator(".landing-museum-link").click();
  await expect(page).toHaveURL(/\/museum$/);
  await expect(page.locator(".v2-card")).toHaveCount(2);
  await context.close();
});

test("an Earth texture failure retains the geographic fallback and museum entry", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/landing-earth/day.webp", (route) => route.abort());
  await page.goto("/");
  const root = page.getByTestId("landing-experience");
  await expect(root).toHaveAttribute("data-quality", "static");
  await expect(root).toHaveAttribute("data-renderer", "static");
  await expect(page.locator(".landing-earth-globe")).toBeVisible();
  await at(page, 5.2);
  await expect(root).toHaveAttribute("data-connected-form", "contour");
  await expect(page.locator(".landing-connected-support")).toHaveText(
    supportingCopy,
  );
  await page.locator(".landing-end-link").click();
  await expect(page.locator(".v2-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("WebGL context loss and background resume keep the same complete experience", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const root = page.getByTestId("landing-experience");
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(root).toHaveAttribute("data-suspended", "true");
  const progress = await root.evaluate((node) =>
    node.style.getPropertyValue("--landing-progress"),
  );
  await at(page, 2.5);
  await page.waitForTimeout(200);
  expect(
    await root.evaluate((node) =>
      node.style.getPropertyValue("--landing-progress"),
    ),
  ).toBe(progress);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(root).toHaveAttribute("data-scene", "scale-shift");
  await page.locator(".landing-canvas").evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext("webgl2");
    context!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(root).toHaveAttribute("data-renderer", "static");
  await expect(root).toHaveAttribute("data-quality", "static");
  await at(page, 5.2);
  await expect
    .poll(() =>
      root.evaluate((node) =>
        Number(node.style.getPropertyValue("--line-two")),
      ),
    )
    .toBe(1);
  await page.locator(".landing-end-link").click();
  await expect(page.locator(".v2-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});
