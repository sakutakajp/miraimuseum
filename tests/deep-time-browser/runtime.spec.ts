import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("mirai-museum:language", "en"));
  await page.goto("/dinosaur?deepTimeDebug=1");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-loaded",
    "true",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "running",
  );
}
test("Brachiosaurus runs and jumps against scenery without background lettering", async ({ page }) => {
  await open(page);
  const observed = await page.evaluate(() => {
    const s = window.__deepTime!;
    const image = s.children.list.find(object => object.type === "Image"
      && (object as import("phaser").GameObjects.Image).texture.key.startsWith("dt-brachiosaurus-")) as import("phaser").GameObjects.Image;
    s.debugSeek(0);
    s.runtime.world.previewInvincible = true;
    s.debugTick(0.04);
    const running = { texture: image.texture.key, width: image.displayWidth, height: image.displayHeight };
    s.jump();
    s.debugTick(0.12);
    const rising = image.texture.key;
    s.debugTick(0.22);
    const falling = image.texture.key;
    const sections: string[][] = [];
    for (const index of [0, 1, 2, 3, 4, 5]) {
      s.debugSeek(index);
      s.debugTick(0.01);
      sections.push(s.children.list.filter(object => object.type === "Text")
        .map(object => (object as import("phaser").GameObjects.Text).text));
    }
    s.debugTick(12);
    sections.push(s.children.list.filter(object => object.type === "Text")
      .map(object => (object as import("phaser").GameObjects.Text).text));
    return { running, rising, falling, sections, humanTexture: s.textures.exists("dt-runner-0") };
  });
  expect(observed.running.texture).toMatch(/^dt-brachiosaurus-[0-5]$/);
  expect(observed.running.width / observed.running.height).toBeCloseTo(1.2);
  expect(observed.rising).toBe("dt-brachiosaurus-6");
  expect(observed.falling).toBe("dt-brachiosaurus-7");
  expect(observed.sections.every(text => text.length === 0)).toBe(true);
  expect(observed.humanTexture).toBe(false);
});
test("one-input jump, midair pause, hidden pause and twenty pooled retries", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page
    .locator("canvas")
    .evaluate((c) => c.setAttribute("data-original", "true"));
  await page.evaluate(() => {
    const s = window.__deepTime!,
      original = s.runtime.world.onJump;
    const w = window as Window & { __jumpEvents: number };
    w.__jumpEvents = 0;
    s.runtime.world.onJump = (t, at) => {
      w.__jumpEvents++;
      original?.(t, at);
    };
  });
  await page.mouse.move(220, 510);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __jumpEvents: number }).__jumpEvents,
      ),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    const s = window.__deepTime!;
    s.debugSeek(0);
    s.jump();
    s.debugTick(0.12);
    s.pause();
  });
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "Resume", exact: true }).focus();
  const state = await page.evaluate(() => ({
    ...window.__deepTime!.runtime.world.state,
  }));
  expect(state.grounded).toBe(false);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => window.__deepTime!.runtime.world.state),
  ).toEqual(state);
  await page.keyboard.press("Escape");
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "running",
  );
  await page.keyboard.press("ArrowUp");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const pooled = await page.evaluate(() => {
    const s = window.__deepTime!,
      textureCount = Object.keys(s.textures.list).length,
      game = s.game;
    for (let i = 0; i < 22; i++) s.debugTick(3);
    return {
      textureCount,
      afterTextures: Object.keys(s.textures.list).length,
      sameGame: game === s.game,
      scenes: s.game.scene.scenes.length,
      attempts: s.attempts,
      inputListeners: s.input.listenerCount("pointerdown"),
      audio: s.audio.activeSources,
      vfx: s.vfx.activeCount,
      best: s.record.bestProgress,
    };
  });
  expect(pooled.attempts).toBeGreaterThanOrEqual(20);
  expect(pooled.textureCount).toBe(pooled.afterTextures);
  expect(pooled.sameGame).toBe(true);
  expect(pooled.scenes).toBe(2);
  expect(pooled.inputListeners).toBe(1);
  expect(pooled.audio).toBeLessThanOrEqual(22);
  expect(pooled.vfx).toBeLessThanOrEqual(72);
  expect(pooled.best).toBeGreaterThan(0);
  await expect(page.locator("canvas[data-original=true]")).toHaveCount(1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mirai-museum:deep-time:v1")!),
  );
  expect(saved.bestProgress).toBeGreaterThan(0);
  expect(saved.bestClearScore).toBe(0);
  expect(errors).toEqual([]);
});
test("authored input run clears with real physics, scores, exhibit and persistent BEST", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const state = await page.evaluate(() => {
    const s = window.__deepTime!;
    s.debugSeek(0);
    s.runtime.world.previewInvincible = false;
    for (const c of s.runtime.level.challenges) s.runtime.world.queueJump(c.at);
    s.debugTick(77);
    return {
      alive: s.runtime.world.state.alive,
      progress: s.runtime.world.clock.progress,
      score: s.result?.score,
      rank: s.result?.rank,
      attempts: s.attempts,
    };
  });
  expect(state.alive).toBe(true);
  expect(state.progress).toBe(1);
  expect(state.score).toBe(100000);
  expect(state.rank).toBe("S");
  await expect(
    page.getByRole("heading", { name: "RUN COMPLETE", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open exhibit", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "DEEP TIME exhibit" }),
  ).toContainText("iridium");
  await page
    .locator(".deep-time-debug")
    .evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  await page.screenshot({ path: "/tmp/deep-time-exhibit.png" });
  await page.getByRole("button", { name: "Run again", exact: true }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute(
    "data-mode",
    "running",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Return home", exact: true })
    .click();
  await page.reload();
  const saved = await page.evaluate(() => ({
    record: JSON.parse(localStorage.getItem("mirai-museum:deep-time:v1")!),
    shared: JSON.parse(localStorage.getItem("mirai-museum:v2")!)[
      "dinosaur-run"
    ],
  }));
  expect(saved.record).toMatchObject({
    bestProgress: 1,
    bestClearScore: 100000,
    bestRank: "S",
    cleared: true,
  });
  expect(saved.shared.stages[1]).toMatchObject({ best: 100000, cleared: true });
  expect(errors).toEqual([]);
});
test("four compositions, reduced effects, low quality and recoverable context loss", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  for (const [width, height] of [
    [390, 844],
    [430, 932],
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.evaluate(() => {
      const s = window.__deepTime!;
      s.runtime.world.previewInvincible = true;
      s.debugSeek(2);
      s.debugTick(6.2);
      s.pause();
      s.ui!.scene.setVisible(false);
      s.visual.quality = "low";
    });
    await page
      .locator(".deep-time-debug")
      .evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
    await page.screenshot({ path: `/tmp/deep-time-${width}x${height}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => window.__deepTime!.runtime.world.state.alive),
    ).toBe(true);
    await page.evaluate(() => window.__deepTime!.ui!.scene.setVisible(true));
  }
  await page
    .locator("canvas")
    .evaluate((c) =>
      c.dispatchEvent(
        new Event("webglcontextlost", { bubbles: true, cancelable: true }),
      ),
    );
  await expect(page.locator(".deep-time-loading.fatal")).toBeVisible();
  await page
    .getByRole("button", { name: "Return home", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "MIRAI MUSEUM" })).toBeVisible();
});

test("FLASH holds the existing rex while gameplay keeps advancing", async ({
  page,
}) => {
  await open(page);
  const observed = await page.evaluate(() => {
    const s = window.__deepTime!;
    s.runtime.world.previewInvincible = true;
    s.debugSeek(3);
    s.debugTick(0.01);
    const rex = s.children.list.find(
      (object) =>
        object.type === "Image" &&
        (object as import("phaser").GameObjects.Image).texture.key.startsWith(
          "dt-rex-near",
        ),
    ) as import("phaser").GameObjects.Image;
    const before = {
      x: rex.x,
      y: rex.y,
      texture: rex.texture.key,
      visible: rex.visible,
      worldX: s.runtime.world.state.worldX,
    };
    s.debugTick(0.2);
    return {
      before,
      after: {
        x: rex.x,
        y: rex.y,
        texture: rex.texture.key,
        visible: rex.visible,
        worldX: s.runtime.world.state.worldX,
      },
    };
  });
  expect(observed.before.visible).toBe(true);
  expect(observed.after.visible).toBe(true);
  expect(observed.after.x).toBe(observed.before.x);
  expect(observed.after.y).toBe(observed.before.y);
  expect(observed.after.texture).toBe(observed.before.texture);
  expect(observed.after.worldX).toBeGreaterThan(observed.before.worldX);
});
