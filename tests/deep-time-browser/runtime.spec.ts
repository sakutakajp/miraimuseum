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
test("the actual Brachiosaurus GLB follows jumps in a fixed pose on the shared canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await open(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-player-renderer", "three");
  await expect(page.locator("canvas")).toHaveAttribute("data-player-model-source", "glb");
  const observed = await page.evaluate(() => {
    const s = window.__deepTime!;
    const avatar = s.children.list.find(object => object.type === "Brachiosaurus3D") as import("../../app/game/dinosaur/rendering/Brachiosaurus3D").Brachiosaurus3D;
    s.debugSeek(0);
    s.runtime.world.previewInvincible = true;
    s.debugTick(0.04);
    const runningY = avatar.model.object3D.position.y;
    const pose = avatar.model.object3D.children[0]!.quaternion.toArray();
    s.jump();
    s.debugTick(0.12);
    const risingY = avatar.model.object3D.position.y;
    s.debugTick(0.22);
    const fallingVelocity = s.runtime.world.state.playerVelocityY;
    const samePose = JSON.stringify(pose) === JSON.stringify(avatar.model.object3D.children[0]!.quaternion.toArray());
    const sharedContext = avatar.renderer.getContext() === (s.game.renderer as import("phaser").Renderer.WebGL.WebGLRenderer).gl;
    const triangles = avatar.renderer.info.render.triangles;
    const glError = avatar.renderer.getContext().getError();
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
    s.debugSeek(0); s.debugTick(0.01); s.pause();
    return { runningY, risingY, fallingVelocity, samePose, sharedContext, triangles, glError, sections, humanTexture: s.textures.exists("dt-runner-0") };
  });
  expect(observed.risingY).toBeGreaterThan(observed.runningY);
  expect(observed.fallingVelocity).toBeGreaterThan(0);
  expect(observed.samePose).toBe(true);
  expect(observed.sharedContext).toBe(true);
  expect(observed.triangles).toBeGreaterThan(20000);
  expect(observed.glError).toBe(0);
  expect(observed.sections.every(text => text.length === 0)).toBe(true);
  expect(observed.humanTexture).toBe(false);
  await page.evaluate(() => window.__deepTime!.ui!.scene.setVisible(false));
  await page.locator(".deep-time-debug").evaluate(el => (el as HTMLElement).style.visibility = "hidden");
  await page.screenshot({ path: "work/dinosaur-game-3d.png" });
  expect(errors).toEqual([]);
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
    s.runtime.world.previewInvincible = true;
    s.debugSeek(0);
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
    .toBe(1);
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
    const s = window.__deepTime!;
    s.debugSeek(0);
    s.runtime.world.previewInvincible = false;
    const
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
test("authored input run clears with real physics, scores, retry and persistent BEST", async ({
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
  await expect(page.getByRole("button", { name: "Open exhibit", exact: true })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
  await page
    .locator(".deep-time-debug")
    .evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  await page.screenshot({ path: "work/dinosaur-clear.png" });
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

test("mobile menus and the 3D player's jump fit above and below the safe areas", async ({ page }) => {
  test.setTimeout(150000);
  await page.addInitScript(() => {
    if (!localStorage.getItem("mirai-museum:language")) localStorage.setItem("mirai-museum:language", "en");
  });
  await page.goto("/dinosaur?deepTimeDebug=1");
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-loaded", "true", { timeout: 60000 });
  await page.addStyleTag({ content: ".deep-time-canvas { padding-top: 24px; padding-bottom: 34px; }" });
  const checkPanel = async () => {
    const panel = await page.evaluate(() => {
      const run = window.__deepTime!, ui = run.ui!;
      const container = ui.children.list.find(object => object.type === "Container") as import("phaser").GameObjects.Container;
      const bounds = container.getBounds();
      const texts = container.list.filter(object => object.type === "Text")
        .map(object => {
          const text = object as import("phaser").GameObjects.Text;
          return { value: text.text, bounds: text.getBounds() };
        });
      const overlaps: string[][] = [];
      for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
        const first = texts[a]!, last = texts[b]!;
        if (Math.min(first.bounds.right, last.bounds.right) - Math.max(first.bounds.left, last.bounds.left) > 1 &&
          Math.min(first.bounds.bottom, last.bounds.bottom) - Math.max(first.bounds.top, last.bounds.top) > 1)
          overlaps.push([first.value, last.value]);
      }
      return { top: bounds.top, bottom: bounds.bottom, height: innerHeight, texts: texts.map(text => text.value), overlaps };
    });
    expect(panel.top).toBeGreaterThanOrEqual(24);
    expect(panel.bottom).toBeLessThanOrEqual(panel.height - 34);
    expect(panel.texts.join(" ")).not.toMatch(/deep\s*time|cretaceous[\s/]*last\s*day|experience\s*\/\s*002/i);
    expect(panel.overlaps).toEqual([]);
    for (const control of await page.locator(".deep-time-control").all()) {
      const bounds = await control.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(24);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(panel.height - 34 + 1);
    }
  };
  await page.setViewportSize({ width: 390, height: 664 });
  await page.waitForFunction(() => window.__deepTime!.scale.height === 664);
  await checkPanel();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running");
  for (const [width, height] of [[390, 664], [844, 390], [430, 932]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.waitForFunction(([w, h]) => window.__deepTime!.scale.width === w && window.__deepTime!.scale.height === h, [width, height]);
    const jump = await page.evaluate(() => {
      const run = window.__deepTime!;
      run.runtime.world.previewInvincible = true;
      run.debugSeek(0); run.jump(); run.debugTick(0.335); run.pause();
      const avatar = run.children.list.find(object => object.type === "Brachiosaurus3D") as import("../../app/game/dinosaur/rendering/Brachiosaurus3D").Brachiosaurus3D;
      avatar.model.object3D.updateMatrixWorld(true); avatar.camera.updateMatrixWorld(true);
      const bounds = avatar.model.bounds, point = avatar.model.object3D.position.clone();
      let top = Infinity, bottom = -Infinity;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        point.set(x, y, z).applyMatrix4(avatar.model.object3D.matrixWorld).project(avatar.camera);
        const screenY = (1 - point.y) * innerHeight / 2;
        top = Math.min(top, screenY); bottom = Math.max(bottom, screenY);
      }
      return { top, bottom };
    });
    expect(jump.top).toBeGreaterThanOrEqual(24);
    expect(jump.bottom).toBeLessThanOrEqual(height! - 34);
    await checkPanel();
    await page.evaluate(() => {
      const run = window.__deepTime!;
      run.debugSeek(5); run.runtime.world.previewInvincible = true; run.debugTick(13);
    });
    await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "complete");
    await checkPanel();
    await expect(page.getByRole("button", { name: "Open exhibit", exact: true })).toHaveCount(0);
    await page.locator(".deep-time-debug").evaluate(el => (el as HTMLElement).style.visibility = "hidden");
    await page.screenshot({ path: `work/dinosaur-clear-${width}x${height}.png` });
  }
  await page.evaluate(() => localStorage.setItem("mirai-museum:language", "ja"));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-loaded", "true", { timeout: 60000 });
  await page.addStyleTag({ content: ".deep-time-canvas { padding-top: 24px; padding-bottom: 34px; }" });
  await checkPanel();
  await page.getByRole("button", { name: "スタート", exact: true }).click();
  await expect(page.locator(".deep-time-host")).toHaveAttribute("data-mode", "running");
  await page.evaluate(() => window.__deepTime!.pause());
  await checkPanel();
  await expect(page.getByRole("button", { name: "音声 オン", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "続ける", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const run = window.__deepTime!;
    run.debugSeek(5); run.runtime.world.previewInvincible = true; run.debugTick(13);
  });
  await checkPanel();
  await expect(page.getByRole("heading", { name: "クリア", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "もう一度", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open exhibit", exact: true })).toHaveCount(0);
  await page.locator(".deep-time-debug").evaluate(el => (el as HTMLElement).style.visibility = "hidden");
  await page.screenshot({ path: "work/dinosaur-clear-ja-844x390.png" });
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
