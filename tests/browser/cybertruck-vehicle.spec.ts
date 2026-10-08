import { test, expect } from "@playwright/test";

const home = '[data-testid="floating-earth-experience"]';

test("the uploaded car drives on Earth alongside the dinosaur", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 550 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  const before = Number(await root.getAttribute("data-cybertruck-angle"));
  await expect.poll(async () => Number(await root.getAttribute("data-cybertruck-angle")))
    .toBeGreaterThan(before + 0.03);
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await expect(root).toHaveAttribute("data-cybertruck-visible", "true");
  await expect(page.getByTestId("dinosaur-control")).toBeEnabled();
  await page.screenshot({ path: "work/cybertruck-earth.png" });
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  await page.getByTestId("earth-control").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw")))
    .toBeGreaterThan(yaw + 0.1);
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb");
  expect(errors).toEqual([]);
});

test("reduced motion pauses driving while the globe remains interactive", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb", { timeout: 30000 });
  const angle = await root.getAttribute("data-cybertruck-angle");
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw")))
    .toBeGreaterThan(yaw + 0.005);
  await expect(root).toHaveAttribute("data-cybertruck-angle", angle!);
  await expect(page.getByTestId("earth-control")).toBeEnabled();
});

test("a failed car download leaves the Earth and dinosaur available", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("**/floating-earth/cybertruck.glb", route => route.fulfill({ status: 404, body: "" }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-cybertruck-source", "unavailable", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-visible", "false");
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-renderer", "webgl");
  await expect(page.getByTestId("dinosaur-control")).toBeEnabled();
  expect(errors).toEqual([]);
});
