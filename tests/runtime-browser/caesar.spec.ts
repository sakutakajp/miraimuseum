import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("Caesar reuses the scene on restart, pauses while hidden and disposes on exit or context loss", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ body: "", contentType: "text/css" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/games/caesar");
  const ready = async () => expect(page.locator(".caesar-world")).toHaveAttribute("data-renderer", "webgl", { timeout: 60000 });
  await ready();
  await page.evaluate(() => { (window as any).__caesarCounters = (window as any).__caesar3d.resources; });
  const resources = () => page.evaluate(() => ({ ...(window as any).__caesarCounters }));
  const original = await page.evaluate(() => (window as any).__caesar3d.metrics());
  await page.getByRole("button", { name: "つぎへ", exact: true }).click();
  await page.getByRole("button", { name: "つぎへ", exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: /^1つ もどす/ }).click();
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("button", { name: "この もんだいを やりなおす", exact: true }).click();
    await page.getByRole("button", { name: "やりなおす", exact: true }).click();
  }
  const resets = await page.evaluate(() => (window as any).__caesar3d.metrics());
  expect(resets.meshes).toBe(original.meshes); expect(resets.materials).toBe(original.materials);
  expect(await resources()).toMatchObject({ engines: 1, scenes: 1, loops: 1, listeners: 2, audioContexts: 0 });
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  expect((await resources()).loops).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  expect((await resources()).loops).toBe(1);
  const visits = [];
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("link", { name: "ゲームを おわる", exact: true }).click();
    await expect.poll(resources).toMatchObject({ engines: 0, scenes: 0, loops: 0, listeners: 0 });
    await page.getByRole("link", { name: /暗号の遺跡/ }).click(); await ready();
    visits.push(await resources()); expect(visits[i]).toMatchObject({ engines: 1, scenes: 1, loops: 1, listeners: 2 });
    await expect(page.locator("canvas")).toHaveCount(1);
  }
  await page.evaluate(() => document.querySelector("canvas")!.getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator(".caesar-world")).toHaveAttribute("data-renderer", "fallback");
  expect(await resources()).toMatchObject({ engines: 0, scenes: 0, loops: 0, listeners: 0 });
  await expect(page.locator(".caesar-world__illustration")).toBeVisible();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "えの うごきを ためす", exact: true }).click(); await ready();
  expect(await resources()).toMatchObject({ engines: 1, scenes: 1, loops: 1, listeners: 2 });
  writeFileSync(info.outputPath("caesar-resources.json"), JSON.stringify({ original, resets, visits }, null, 2));
  expect(errors).toEqual([]);
});
