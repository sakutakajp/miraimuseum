import {
  MUSIC_BARS,
  MUSIC_BASS,
  BEAT,
  noteFrequency,
  scheduleMusicBar,
} from "../../app/museum/music";
import { test, expect } from "./fixtures";
import { NAP_SAVE_KEY } from "../../app/museum/collection";
import { runObstacles } from "../../app/games/ru-run/level";
test("exterior preserves entrance and Ru on desktop and phone; entry goes directly to the game", async ({
  page,
}, info) => {
  const errors: string[] = [];
  const models: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\.glb|babylon/i.test(r.url())) models.push(r.url());
  });
  for (const size of [
    { width: 1440, height: 900 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page).toHaveTitle("みらい博物館");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /みらい博物館/,
    );
    await expect(page.locator(".museum-exterior-art > .museum-pixel-frame > img")).toHaveJSProperty(
      "naturalWidth",
      size.width < 700 ? 180 : 720,
    );
    const enter = page.getByRole("link", { name: /はいる/ });
    const box = await enter.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(size.height);
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    await expect(page.locator(".museum-entrance .ru-sprite")).toBeInViewport();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`home-${size.width}.png`) });
  }
  await page.getByRole("link", { name: /はいる/ }).click();
  await expect(page).toHaveURL(/\/games\/caesar$/);
  await expect(page.locator(".sunny-portal")).toBeVisible();
  expect(models).toEqual([]);
  expect(errors).toEqual([]);
});
test("all public routes work with Japanese semantics, corrupt records and reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mirai-museum:language", "en");
    localStorage.setItem("mirai-museum:naps:v1", "broken");
    localStorage.setItem(
      "mirai-museum:caesar:v2",
      '{"version":2,"curriculum":"mii-home-1","doorCleared":true}',
    );
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/",
    "/games",
    "/games/caesar/",
    "/dinosaur?play=1",
    "/naps",
    "/about",
  ]) {
    const response = await page.goto(route);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle("みらい博物館");
    await expect(page.locator("main")).toHaveAttribute("lang", "ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  }
  await expect(page.locator(".history-box").first()).toContainText("前50年");
  await expect(page.locator(".history-box").first()).toContainText("ゲーム");
  await expect(page.locator(".history-box").last()).toContainText("J・U・W");
  await page.goto("/naps");
  await expect(page.locator(".nap-entry")).toHaveCount(0);
});
test("Ru runner completes through real input, can pause/retry, saves a nap and keeps old URL", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dinosaur");
  await page.getByRole("button", { name: "はしる", exact: true }).click();
  await expect(page.locator(".ru-run")).toHaveAttribute("data-mode", "running");
  // Exercise a genuine failed approach and its checkpoint retry before the successful run.
  await expect(page.locator(".ru-run")).toHaveAttribute(
    "data-mode",
    "stumble",
    { timeout: 10000 },
  );
  await page
    .getByRole("button", { name: "ここから はしる", exact: true })
    .click();
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  const distance = await page.locator(".ru-run").getAttribute("data-distance");
  await page.waitForTimeout(200);
  expect(await page.locator(".ru-run").getAttribute("data-distance")).toBe(
    distance,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "つづける", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const obstacle of runObstacles) {
    await page.waitForFunction(
      (x) =>
        Number(
          document.querySelector(".ru-run")?.getAttribute("data-distance"),
        ) >= x,
      obstacle.x - 55,
    );
    await page.locator(".ru-run-world").focus();
    await page.keyboard.press("Space");
  }
  await expect(page.locator(".ru-run")).toHaveAttribute(
    "data-mode",
    "complete",
    { timeout: 10000 },
  );
  await expect(page.locator(".ru-run")).toHaveAttribute("data-passed", "9");
  await expect(page.locator(".ru-sprite--sleep")).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), NAP_SAVE_KEY),
  ).not.toBeNull();
  await page.screenshot({ path: info.outputPath("run-nap.png") });
  await page
    .getByRole("button", { name: "ほんとうのこと", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("トリケラトプス");
  await expect(page.getByRole("dialog")).toContainText("ゲームの くふう");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "おひるねずかん", exact: true }).click();
  await expect(page).toHaveURL(/\/naps$/);
  await expect(page.locator(".nap-entry")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".nap-entry")).toHaveCount(1);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).naps[0].id,
      NAP_SAVE_KEY,
    ),
  ).toBe("forest-run");
  expect(errors).toEqual([]);
});

test("BGM graph renders an audible waveform offline", async ({ page }) => {
  await page.goto("/");
  const rendered = await page.evaluate(
    async ({ bars, bass, beat, frequency, graph }) => {
      const MUSIC_BARS = bars,
        MUSIC_BASS = bass,
        BEAT = beat,
        noteFrequency = (0, eval)(`(${frequency})`);
      const render = (0, eval)(
        `(MUSIC_BARS,MUSIC_BASS,BEAT,noteFrequency)=>(${graph})`,
      )(MUSIC_BARS, MUSIC_BASS, BEAT, noteFrequency);
      const ctx = new OfflineAudioContext(1, 44100 * 4, 44100);
      const master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      render(ctx, master, 0, 0.04);
      const output = await ctx.startRendering();
      const values = output.getChannelData(0);
      return {
        finite: values.every(Number.isFinite),
        peak: Math.max(...values.slice(0, 44100).map(Math.abs)),
        rms: Math.sqrt(
          values.reduce((sum, n) => sum + n * n, 0) / values.length,
        ),
      };
    },
    {
      bars: MUSIC_BARS,
      bass: MUSIC_BASS,
      beat: BEAT,
      frequency: noteFrequency.toString(),
      graph: scheduleMusicBar.toString(),
    },
  );
  expect(rendered.finite).toBe(true);
  expect(rendered.peak).toBeGreaterThan(0.01);
  expect(rendered.peak).toBeLessThan(0.25);
  expect(rendered.rms).toBeGreaterThan(0.005);
});
