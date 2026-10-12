import { expect, test, type Page } from "@playwright/test";
import { stages } from "../../app/game/space-delivery/stages";
import { dragFromShot } from "../../app/game/space-delivery/input";
import { SAVE_KEY } from "../../app/game/space-delivery/progress";
const url = "/games/space-delivery/";
async function ready(page: Page) {
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-loaded",
    "true",
  );
}
async function shoot(page: Page, index: number, wrong = false) {
  const box = (await page.locator(".delivery-pad").boundingBox())!,
    s = stages[index]!,
    d = wrong
      ? { x: 45, y: 0 }
      : dragFromShot(s.references.threeStars, s.maxSpeed);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + d.x, y + d.y, { steps: 8 });
  await page.mouse.up();
}
test("actual drag flights deliver all six stages, persist stars, and reenter cleanly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await ready(page);
  for (let i = 0; i < 6; i++) {
    await expect(page.locator(".delivery")).toHaveAttribute(
      "data-stage",
      String(i + 1),
    );
    if (i === 1)
      await page.screenshot({ path: "/tmp/space-delivery-stage02.png" });
    await shoot(page, i);
    await expect(page.locator(".delivery")).toHaveAttribute(
      "data-mode",
      "success",
      { timeout: 12000 },
    );
    await expect(page.locator(".delivery-result-stars")).toHaveText("★★★");
    if (i === 5)
      await page.screenshot({ path: "/tmp/space-delivery-finale.png" });
    if (i < 5) await page.getByRole("button", { name: "つぎの配達 →" }).click();
  }
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    ),
  ).toMatchObject({ version: 1, best: [3, 3, 3, 3, 3, 3], unlocked: 6 });
  await page.reload();
  await ready(page);
  await expect(page.locator(".delivery-best")).toHaveText("★★★");
  await page.getByRole("button", { name: "配達をえらぶ", exact: true }).click();
  await expect(page.locator(".delivery-menu-stage:disabled")).toHaveCount(0);
  await page.locator(".delivery-menu-stage").nth(4).click();
  await expect(page.locator(".delivery")).toHaveAttribute("data-stage", "5");
  await page.getByRole("button", { name: "音あり", exact: true }).click();
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("button", { name: "音なし", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "博物館へ" }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page
    .getByRole("link", { name: "ねこの宇宙宅配便", exact: true })
    .click();
  await ready(page);
  await expect(page.locator(".delivery canvas")).toHaveCount(1);
  await shoot(page, 0);
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "success",
    { timeout: 12000 },
  );
  expect(errors).toEqual([]);
});
test("failure, one-action retry, assistance, keyboard, cancellation and pause", async ({
  page,
}) => {
  await page.goto(url);
  await ready(page);
  for (let i = 0; i < 3; i++) {
    await shoot(page, 0, true);
    await expect(page.locator(".delivery")).toHaveAttribute(
      "data-mode",
      "failure",
      { timeout: 12000 },
    );
    await page.locator(".delivery-retry").click();
    await expect(page.locator(".delivery")).toHaveAttribute(
      "data-mode",
      "ready",
    );
  }
  await page.getByRole("button", { name: "ヒントを見る" }).click();
  await page.getByRole("button", { name: "＋ 先まで見えるおたすけ" }).click();
  await expect(
    page.getByRole("button", { name: "✓ おたすけ中" }),
  ).toHaveAttribute("aria-pressed", "true");
  const pad = page.locator(".delivery-pad"),
    b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 35);
  await pad.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
  await page.locator(".delivery").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "flying",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "▶ つづける", exact: true }).click();
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "flying",
  );
  await page.locator(".delivery").focus();
  await page.keyboard.press("r");
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
  await page
    .locator(".delivery")
    .evaluate((el) => el.dispatchEvent(new Event("blur"))); // root blur is harmless; window blur pauses.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "▶ つづける", exact: true }).click();
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
});
for (const [width, height] of [
  [360, 640],
  [390, 844],
  [430, 932],
  [844, 390],
  [1440, 900],
])
  test(`viewport ${width}x${height}: entire board and controls without scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await ready(page);
    expect(
      await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
      })),
    ).toEqual({ height, width });
    for (const selector of [
      ".delivery-pad",
      ".delivery-retry",
      ".delivery-fire",
      ".delivery canvas",
    ]) {
      const b = (await page.locator(selector).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(height + 1);
      if (selector !== ".delivery canvas") {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
    }
    const board = (await page.locator(".delivery canvas").boundingBox())!;
    expect(board.width / board.height).toBeCloseTo(360 / 520, 2);
    await page.screenshot({
      path: `/tmp/space-delivery-${width}x${height}.png`,
    });
    await shoot(page, 0);
    await expect(page.locator(".delivery")).toHaveAttribute(
      "data-mode",
      "success",
      { timeout: 12000 },
    );
  });
test("mobile touch launches; resizing cancels a held pointer; unavailable storage still plays", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto(url);
  await ready(page);
  const box = (await page.locator(".delivery-pad").boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y + 33, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "success",
    { timeout: 12000 },
  );
  await expect(page.locator(".delivery-storage")).toBeVisible();
  await page.locator(".delivery-retry").click();
  const b = (await page.locator(".delivery-pad").boundingBox())!,
    xx = b.x + b.width / 2,
    yy = b.y + b.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: xx, y: yy, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: xx, y: yy + 35, id: 1 }],
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
});
test("secondary pointers are ignored and background / rotation never auto-launch", async ({
  page,
}) => {
  await page.goto(url);
  await ready(page);
  const pad = page.locator(".delivery-pad"),
    b = (await pad.boundingBox())!,
    x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 33);
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "aiming",
  );
  await pad.dispatchEvent("pointerdown", {
    pointerId: 99,
    button: 0,
    clientX: x,
    clientY: y,
  });
  await pad.dispatchEvent("pointermove", {
    pointerId: 99,
    clientX: x + 50,
    clientY: y,
  });
  await pad.dispatchEvent("pointerup", {
    pointerId: 99,
    clientX: x + 50,
    clientY: y,
  });
  await pad.dispatchEvent("pointercancel", { pointerId: 99 });
  await pad.dispatchEvent("lostpointercapture", { pointerId: 99 });
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "aiming",
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("orientationchange")),
  );
  await page.mouse.up();
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "▶ つづける", exact: true }).click();
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "paused",
  );
  await page.getByRole("button", { name: "▶ つづける", exact: true }).click();
  await expect(page.locator(".delivery")).toHaveAttribute("data-mode", "ready");
});
test("WebGL unavailable still delivers through the lightweight pixel canvas fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        kind: string,
        options: unknown,
      ) {
        if (kind.startsWith("webgl")) return null;
        return Reflect.apply(original, this, [kind, options]);
      },
    });
  });
  await page.goto(url);
  await ready(page);
  await expect(page.locator(".delivery canvas")).toHaveAttribute(
    "data-renderer",
    "canvas",
  );
  await shoot(page, 0);
  await expect(page.locator(".delivery")).toHaveAttribute(
    "data-mode",
    "success",
    { timeout: 12000 },
  );
});
test("render loops and game audio are released while museum music returns to its previous setting", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const frames = new Set<number>(),
      contexts: AudioContext[] = [];
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window),
      OriginalAudio = window.AudioContext;
    Object.assign(window, {
      __deliveryFrames: frames,
      __deliveryAudio: contexts,
    });
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      cancel(id);
    };
    window.AudioContext = class extends OriginalAudio {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "おんがくを オン", exact: true })
    .click();
  const audioStates = () =>
    page.evaluate(() =>
      (
        window as unknown as { __deliveryAudio: AudioContext[] }
      ).__deliveryAudio.map((c) => c.state),
    );
  await expect.poll(audioStates).toEqual(["running"]);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page
      .getByRole("link", { name: "ねこの宇宙宅配便", exact: true })
      .click();
    await ready(page);
    await expect(page.locator(".delivery canvas")).toHaveAttribute(
      "data-renderer",
      "babylon",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __deliveryFrames: Set<number> })
              .__deliveryFrames.size,
        ),
      )
      .toBe(1);
    await expect
      .poll(audioStates)
      .toEqual(["suspended", ...Array(i).fill("closed")]);
    await page.locator(".delivery-sound").click();
    await page.getByRole("link", { name: "博物館へ" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __deliveryFrames: Set<number> })
              .__deliveryFrames.size,
        ),
      )
      .toBe(0);
    await expect
      .poll(audioStates)
      .toEqual(["running", ...Array(i + 1).fill("closed")]);
    await expect(
      page.getByRole("button", { name: "おんがくを オフ", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});
