import { test, expect } from "@playwright/test";

const home = '[data-testid="floating-earth-experience"]';

test("the optional GLB reveals after Earth readiness and remains attached during rotation", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 550 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/floating-earth/dinosaur.glb", async route => { await gate; await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await expect(root).toHaveAttribute("data-dinosaur-source", "loading");
  await expect(root).toHaveAttribute("data-dinosaur-state", "waiting");
  await expect(page.getByTestId("earth-control")).toBeEnabled();
  await root.evaluate(el => {
    const node = el as HTMLElement & { revealStates: string[] };
    node.revealStates = [node.dataset.dinosaurState!];
    new MutationObserver(() => {
      const state = node.dataset.dinosaurState!;
      if (node.revealStates.at(-1) !== state) node.revealStates.push(state);
    }).observe(node, { attributes: true, attributeFilter: ["data-dinosaur-state"] });
  });
  release();
  await expect(root).toHaveAttribute("data-dinosaur-source", "glb", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 30000 });
  expect(await root.evaluate(el => (el as HTMLElement & { revealStates: string[] }).revealStates))
    .toEqual(["waiting", "light", "revealing", "settled"]);
  await page.screenshot({ path: "work/dinosaur-front.png" });
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  const yaw = Number(await root.getAttribute("data-earth-yaw"));
  const bounds = await page.getByTestId("earth-control").boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.25, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  // Keep capture held to inspect the opposite surface before release inertia.
  await page.mouse.move(bounds!.x + bounds!.width * 0.6925, bounds!.y + bounds!.height / 2);
  await expect.poll(async () => Number(await root.getAttribute("data-earth-yaw"))).toBeGreaterThan(yaw + 3.1);
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await page.getByTestId("earth-control").evaluate(el => (el as HTMLElement).blur());
  await page.screenshot({ path: "work/dinosaur-back.png" });
  await expect(root).toHaveAttribute("data-earth-ready", "true");
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-dinosaur-state", "settled");
  expect(errors).toEqual([]);
});

test("missing dinosaur uses a brief reduced-motion reveal without failing Earth", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("**/floating-earth/dinosaur.glb", route => route.fulfill({ status: 404, body: "" }));
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(home)).toHaveAttribute("data-earth-ready", "true");
  await expect(page.locator(home)).toHaveAttribute("data-dinosaur-source", "placeholder");
  await expect(page.locator(home)).toHaveAttribute("data-dinosaur-state", "settled", { timeout: 5000 });
  await expect(page.getByTestId("earth-control")).toBeEnabled();
  await expect(page.getByRole("link", { name: "恐竜ゲームをはじめる" })).toBeVisible();
  expect(errors).toEqual([]);
});
