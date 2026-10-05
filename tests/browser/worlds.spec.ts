import { test, expect } from "@playwright/test";
import {
  voyageCollectibles,
  voyageObstacles,
  VOYAGE_LENGTH,
} from "../../app/game/voyage";
import { discoveriesFor } from "../../app/data/discoveries";
import { getWorld } from "../../app/data/worlds";
import { SAVE_KEY } from "../../app/game/progress";

for (const worldId of ["space", "ocean"] as const) {
  test(
    worldId +
      ": play all discoveries, keep the old dinosaur save and exhibit in the right room",
    async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        ({ key, visits }) => {
          if (!localStorage.getItem(key))
            localStorage.setItem(
              key,
              JSON.stringify({
                version: 1,
                visits,
                expeditions: 1,
                muted: true,
              }),
            );
        },
        {
          key: SAVE_KEY,
          visits: Object.fromEntries(
            discoveriesFor("dinosaur").map((item) => [item.id, 1]),
          ),
        },
      );
      await page.goto("/");
      await page
        .getByRole("button", { name: getWorld(worldId).name + "を冒険する" })
        .tap();
      await expect(page.locator("canvas")).toHaveCount(1);
      await expect(page.locator("canvas")).toBeVisible();
      await expect(page.locator(".game-location")).toContainText(
        getWorld(worldId).phases.start!,
      );
      await page.getByRole("button", { name: "一時停止" }).tap();
      const progress = page.getByRole("progressbar");
      const paused = await progress.getAttribute("aria-valuenow");
      await page.setViewportSize({ width: 320, height: 568 });
      await expect
        .poll(() =>
          page.locator("canvas").evaluate((canvas) => {
            const bounds = canvas.getBoundingClientRect();
            return Math.max(
              Math.abs(bounds.x),
              Math.abs(bounds.y),
              Math.abs(bounds.width - innerWidth),
              Math.abs(bounds.height - innerHeight),
            );
          }),
        )
        .toBeLessThan(2);
      expect(await progress.getAttribute("aria-valuenow")).toBe(paused);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "冒険をつづける" }).tap();
      const targets = [
        ...voyageObstacles
          .filter((item) => item.y === 0)
          .map((item) => ({ x: item.x, lead: 80 })),
        ...voyageCollectibles(worldId)
          .filter((item) => item.elevated)
          .map((item) => ({ x: item.x, lead: 85 })),
      ].sort((a, b) => a.x - b.x);
      for (const target of targets) {
        await page.waitForFunction(
          (value) =>
            Number(
              document
                .querySelector('[role="progressbar"]')
                ?.getAttribute("aria-valuenow"),
            ) >= value,
          ((target.x - target.lead) / VOYAGE_LENGTH) * 100,
          { timeout: 30_000, polling: 30 },
        );
        await page.locator("canvas").tap({ position: { x: 160, y: 240 } });
      }
      await expect(page.locator(".game-location")).toContainText(
        getWorld(worldId).phases.encounter!,
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { name: "おかえり、冒険家！" }),
      ).toBeVisible({ timeout: 40_000 });
      await expect(page.locator(".result-count > strong")).toHaveText("6");
      await expect(
        page.getByRole("button", {
          name:
            "次は" +
            getWorld(worldId === "space" ? "ocean" : "dinosaur").name +
            "へ",
        }),
      ).toBeVisible();
      const nextId = worldId === "space" ? "ocean" : "dinosaur";
      await page
        .getByRole("button", { name: "次は" + getWorld(nextId).name + "へ" })
        .tap();
      await expect(page.locator("canvas")).toHaveCount(1);
      await expect(page.locator(".game-canvas")).toHaveAttribute(
        "aria-label",
        new RegExp(getWorld(nextId).name),
      );
      await page.getByRole("button", { name: "一時停止" }).tap();
      await page
        .getByRole("button", {
          name: "博物館にもどる（今回の発見は保存されません）",
        })
        .tap();
      await page
        .locator(".gallery-filters")
        .getByRole("button", { name: new RegExp(getWorld(worldId).name) })
        .tap();
      await expect(page.locator(".gallery-toolbar")).toContainText(
        getWorld(worldId).room,
      );
      await expect(page.locator(".exhibit-card:not(:disabled)")).toHaveCount(6);
      const exhibit = worldId === "space" ? "ブラックホール" : "マッコウクジラ";
      await page
        .getByRole("button", { name: exhibit + "の展示を見る", exact: true })
        .tap();
      await expect(page.getByRole("dialog")).toContainText(
        worldId === "space" ? "光も外へ出られない" : "哺乳類",
      );
      await page.getByRole("button", { name: "展示を閉じる" }).tap();
      await page
        .locator(".gallery-filters")
        .getByRole("button", { name: /恐竜の世界/ })
        .tap();
      await expect(page.locator(".exhibit-card:not(:disabled)")).toHaveCount(6);
      await page.reload();
      await expect(page.locator(".header-museum b")).toHaveText("12 / 18");
      const save = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        SAVE_KEY,
      );
      expect(save.expeditions).toBe(2);
      expect(save.muted).toBe(true);
      for (const item of [
        ...discoveriesFor("dinosaur"),
        ...discoveriesFor(worldId),
      ])
        expect(save.visits[item.id]).toBe(1);
      // Replaying and leaving early must keep the completed expedition intact.
      await page
        .getByRole("button", { name: getWorld(worldId).name + "を冒険する" })
        .tap();
      await expect(page.locator("canvas")).toHaveCount(1);
      await page.getByRole("button", { name: "一時停止" }).tap();
      await page
        .getByRole("button", {
          name: "博物館にもどる（今回の発見は保存されません）",
        })
        .tap();
      await expect(page.locator("canvas")).toHaveCount(0);
      expect(
        (
          await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)!),
            SAVE_KEY,
          )
        ).expeditions,
      ).toBe(2);
      expect(errors).toEqual([]);
      await context.close();
    },
  );
}
