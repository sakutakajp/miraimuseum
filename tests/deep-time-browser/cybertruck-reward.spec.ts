import { test, expect, type Page } from "@playwright/test";
import { DEEP_TIME_SAVE_KEY } from "../../app/game/dinosaur/systems/records";
import { GAME_SAVE_KEY } from "../../app/games/progress";

const home = '[data-testid="floating-earth-experience"]';
type Introduction = {
  entry: string;
  dinosaur: string;
  car: string;
  visible: boolean;
  column: boolean;
};

async function clearDinosaur(page: Page) {
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-loaded", "true", { timeout: 60000 });
  await page.waitForFunction(() => window.__deepTime?.devEnabled);
  // Advance the real game through its ending, including its normal save/clear hooks.
  await page.evaluate(() => {
    const run = window.__deepTime!;
    run.debugSeek(5);
    run.runtime.world.previewInvincible = true;
    run.debugTick(13);
  });
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "complete");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cleared, DEEP_TIME_SAVE_KEY)).toBe(true);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)["dinosaur-run"].stages[1].cleared, GAME_SAVE_KEY)).toBe(true);
}

async function introductions(page: Page) {
  return page.evaluate(() => (window as unknown as { carIntroductions: Introduction[] }).carIntroductions);
}

test("first clear reveals the reward, later clears do not repeat it, and a new access introduces both together", async ({ page }, testInfo) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 800, height: 550 });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("mirai-museum:language", "ja");
    const state = window as unknown as { carIntroductions: Introduction[] };
    state.carIntroductions = [];
    new MutationObserver(() => {
      const root = document.querySelector<HTMLElement>('[data-testid="floating-earth-experience"]');
      if (!root?.dataset.cybertruckState) return;
      const entry = {
        entry: root.dataset.cybertruckEntry!,
        dinosaur: root.dataset.dinosaurState!,
        car: root.dataset.cybertruckState,
        visible: root.dataset.cybertruckVisible === "true",
        column: root.dataset.cybertruckColumn === "true",
      };
      if (JSON.stringify(state.carIntroductions.at(-1)) !== JSON.stringify(entry)) state.carIntroductions.push(entry);
    }).observe(document, { subtree: true, attributes: true, childList: true });
  });

  await page.goto("/dinosaur?play=1&deepTimeDebug=1", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}").cleared === true, DEEP_TIME_SAVE_KEY)).toBe(false);
  await clearDinosaur(page);
  await page.getByRole("button", { name: "ホームへ戻る", exact: true }).click();
  const root = page.locator(home);
  await expect(root).toHaveAttribute("data-cybertruck-entry", "reveal", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-column", "true", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-state", "revealing", { timeout: 30000 });
  const screenshot = testInfo.outputPath("cybertruck-first-clear.png");
  await page.screenshot({ path: screenshot });
  await testInfo.attach("First clear reward", { path: screenshot, contentType: "image/png" });
  await expect(root).toHaveAttribute("data-cybertruck-state", "settled", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-visible", "true");
  expect((await introductions(page)).some(frame => frame.car === "light" && frame.column && !frame.visible)).toBe(true);

  // Client navigation preserves the current access, like entering via the globe.
  await page.evaluate(async () => {
    const mount = document.getElementById("__nuxt") as HTMLElement & {
      __vue_app__?: { config: { globalProperties: { $router?: { push: (url: string) => Promise<unknown> } } } };
    };
    const router = mount.__vue_app__?.config.globalProperties.$router;
    if (!router) throw new Error("Nuxt router unavailable");
    await router.push("/dinosaur?play=1&deepTimeDebug=1");
  });
  await clearDinosaur(page);
  await page.evaluate(() => { (window as unknown as { carIntroductions: Introduction[] }).carIntroductions = []; });
  await page.getByRole("button", { name: "ホームへ戻る", exact: true }).click();
  await expect(root).toHaveAttribute("data-cybertruck-entry", "visible", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-source", "glb", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-visible", "true", { timeout: 30000 });
  await expect(root).toHaveAttribute("data-cybertruck-column", "false");
  const repeated = await introductions(page);
  expect(repeated.length).toBeGreaterThan(0);
  expect(repeated.every(frame => frame.car === "settled" && !frame.column)).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(root).toHaveAttribute("data-cybertruck-entry", "reveal", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-column", "true", { timeout: 60000 });
  await expect(root).toHaveAttribute("data-cybertruck-state", "settled", { timeout: 30000 });
  const returning = await introductions(page);
  expect(returning.some(frame => frame.car === "light" && frame.column)).toBe(true);
  expect(returning.some(frame => frame.car === "revealing")).toBe(true);
  expect(returning.every(frame => frame.dinosaur === frame.car)).toBe(true);
  expect(errors).toEqual([]);
});
