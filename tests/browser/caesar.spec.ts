import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { SUNNY_SAVE_KEY } from "../../app/games/caesar/sunny-progress";
import { NAP_SAVE_KEY } from "../../app/museum/collection";
const game = ".sunny-game";
const actionY = new WeakMap<Page, number>();
export async function fit(page: Page, fixed = false) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const visible = [...main.querySelectorAll("button,a")].filter(
      (e) => e.getClientRects().length && !e.closest("dialog"),
    );
    return {
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      vh: innerHeight,
      vw: innerWidth,
      buttons: visible.map((e) => {
        const r = e.getBoundingClientRect();
        return {
          text: e.textContent?.trim(),
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        };
      }),
      actions: document
        .querySelector(".sunny-main-actions")
        ?.getBoundingClientRect().y,
      puzzleBottom: document
        .querySelector(".sunny-puzzle")
        ?.getBoundingClientRect().bottom,
      controlsTop: document
        .querySelector(".sunny-controls")
        ?.getBoundingClientRect().top,
    };
  });
  expect(metrics.width).toBeLessThanOrEqual(metrics.vw + 1);
  expect(metrics.height).toBeLessThanOrEqual(metrics.vh + 1);
  for (const b of metrics.buttons) {
    expect(b.w, b.text).toBeGreaterThanOrEqual(47.9);
    expect(b.h, b.text).toBeGreaterThanOrEqual(47.9);
    expect(b.y, b.text).toBeGreaterThanOrEqual(-1);
    expect(b.y + b.h, b.text).toBeLessThanOrEqual(metrics.vh + 1);
    expect(b.x + b.w, b.text).toBeLessThanOrEqual(metrics.vw + 1);
  }
  if (fixed && metrics.actions !== undefined) {
    if (!actionY.has(page)) actionY.set(page, metrics.actions);
    expect(Math.abs(metrics.actions - actionY.get(page)!)).toBeLessThan(1);
  }
}
export async function active(page: Page) {
  await expect(page.locator(game)).toHaveAttribute(
    "data-phase",
    /active|waiting/,
  );
}
export async function next(page: Page) {
  await active(page);
  await page.getByRole("button", { name: "つぎへ", exact: true }).click();
  await active(page);
}
export async function reachQuiz(page: Page, check = false) {
  await next(page);
  await next(page);
  for (let i = 0; i < 3; i++) {
    if (check) await fit(page, true);
    await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
    await expect(page.locator(game)).toHaveAttribute("data-phase", "waiting");
    if (check) await fit(page, true);
    await next(page);
  }
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await expect(page.locator(".sunny-shift-note")).toHaveText(
    "うごいた かず：1つ",
  );
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await next(page);
  await expect(page.locator(game)).toHaveAttribute("data-view", "quiz");
}
export async function configure(
  page: Page,
  amount: number,
  direction = "もどす",
) {
  await page.getByRole("radio", { name: direction, exact: true }).click();
  for (let i = 0; i < amount; i++)
    await page
      .getByRole("button", { name: "かずを 1つ ふやす", exact: true })
      .click();
  await expect(page.locator(".sunny-puzzle .sunny-letter--output")).toHaveText(
    Array(
      await page.locator(".sunny-puzzle .sunny-letter--output").count(),
    ).fill("？"),
  );
  await next(page);
  await page.getByRole("button", { name: "やってみる", exact: true }).click();
}
for (const size of [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
])
  test(`complete story, prediction, clues, nap and reload at ${size.width}x${size.height}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto("/games/caesar");
    await active(page);
    if (size.width === 375)
      await page.locator(game).evaluate((e) => {
        (e as HTMLElement).style.paddingTop = "44px";
        (e as HTMLElement).style.paddingBottom = "34px";
      });
    await fit(page, true);
    await reachQuiz(page, true);
    await fit(page, true);
    await expect(
      page.locator(".sunny-puzzle .sunny-letter--output"),
    ).toHaveText("？");
    await page.getByRole("radio", { name: "く", exact: true }).click();
    await expect(
      page.locator(".sunny-puzzle .sunny-letter--output"),
    ).toHaveText("？");
    await fit(page, true);
    await page.getByRole("button", { name: "たしかめる", exact: true }).click();
    await expect(
      page.locator(".sunny-puzzle .sunny-letter--output"),
    ).toHaveText("く");
    await next(page);
    await fit(page, true);
    await configure(page, 2);
    await expect(
      page.locator(".sunny-puzzle .sunny-letter--output"),
    ).toHaveText(["ひ", "る"]);
    await fit(page, true);
    await next(page);
    await fit(page, true);
    await configure(page, 3);
    await expect(
      page.locator(".sunny-puzzle .sunny-letter--output"),
    ).toHaveText(["お", "う", "ち"]);
    await fit(page, true);
    await next(page);
    await fit(page, true);
    await expect(page.locator(".ru-sprite--sleep")).toBeVisible();
    await page
      .getByRole("button", {
        name: "ほんとうのこと・ゲームの くふう",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toContainText("ひらがなの もじばん");
    await page.getByRole("button", { name: "とじる", exact: true }).click();
    await page.screenshot({ path: info.outputPath("nap.png") });
    for (let i = 0; i < 3; i++) {
      await next(page);
      await fit(page, true);
    }
    await page
      .getByRole("link", { name: "はくぶつかんへ", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("link", { name: /おひるねずかん/ }).click();
    await expect(page.locator(".nap-entry")).toHaveCount(1);
    await page.reload();
    await expect(page.locator(".nap-entry")).toHaveCount(1);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).cleared,
        SUNNY_SAVE_KEY,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).naps[0].id,
        NAP_SAVE_KEY,
      ),
    ).toBe("sunny-room");
    expect(errors).toEqual([]);
  });
test("drag and keyboard match buttons; wrong answers, hints and back choices remain safe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/games/caesar");
  await next(page);
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
  await next(page);
  const board = page.locator(".sunny-board");
  await board.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".sunny-puzzle .sunny-letter--output")).toHaveText([
    "え",
    "か",
  ]);
  const box = await board.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.5 + 60,
    box!.y + box!.height * 0.5,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.locator(".sunny-puzzle .sunny-letter--output")).toHaveText([
    "う",
    "お",
  ]);
  await board.focus();
  await page.keyboard.press("ArrowRight");
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await next(page);
  await page.getByRole("radio", { name: "き", exact: true }).click();
  await page.getByRole("button", { name: "たしかめる", exact: true }).click();
  await expect(page.locator(game)).toHaveAttribute("data-phase", "active");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /^ヒント/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "1つ すすめる", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("1つ すすめた");
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "く", exact: true }).click();
  await page.getByRole("button", { name: "たしかめる", exact: true }).click();
  await next(page);
  await configure(page, 1);
  await expect(page.locator(game)).toHaveAttribute("data-phase", "active");
  await page.getByRole("button", { name: "えらびなおす", exact: true }).click();
  await page
    .getByRole("button", { name: "かずを 1つ ふやす", exact: true })
    .click();
  await page.getByRole("button", { name: "えらびなおす", exact: true }).click();
  await page.getByRole("radio", { name: "もどす", exact: true }).click();
  await expect(page.locator(".sunny-number-choices output")).toHaveText("2");
  await next(page);
  await page.getByRole("button", { name: "やってみる", exact: true }).click();
  await expect(page.locator(".sunny-puzzle .sunny-letter--output")).toHaveText([
    "ひ",
    "る",
  ]);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SUNNY_SAVE_KEY,
  );
  expect(saved.records["predict-two"]).toMatchObject({
    attempts: 2,
    hints: 3,
    firstCorrect: false,
    solved: true,
  });
  expect(saved.records["read-two"].attempts).toBe(2);
});
test("landscape, enlarged text and dialog state allow all controls to be reached", async ({
  page,
}) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/games/caesar");
  await reachQuiz(page);
  await fit(page);
  await page.getByRole("radio", { name: "く", exact: true }).click();
  await page.getByRole("button", { name: "たしかめる", exact: true }).click();
  await next(page);
  await fit(page);
  await page.getByRole("radio", { name: "もどす", exact: true }).click();
  await page
    .getByRole("button", { name: "かずを 1つ ふやす", exact: true })
    .click();
  await fit(page);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sunny-number-choices output")).toHaveText("1");
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeGreaterThan(640);
  await page
    .getByRole("button", { name: "つぎへ", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "つぎへ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "つぎへ", exact: true }).click();
  await page
    .getByRole("button", { name: "やってみる", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "やってみる", exact: true }),
  ).toBeVisible();
});
test("no narration or autoplay; music is opt-in and storage refusal still plays", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__speechCalls = 0;
    (window as any).__audioContexts = [];
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor() {
        super();
        (window as any).__audioContexts.push(this);
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      get() {
        (window as any).__speechCalls++;
        return undefined;
      },
      configurable: true,
    });
    Storage.prototype.setItem = function () {
      throw new Error("blocked");
    };
  });
  await page.goto("/games/caesar");
  await active(page);
  expect(
    await page.evaluate(() => (window as any).__audioContexts.length),
  ).toBe(0);
  await page
    .getByRole("button", { name: "おんがくを オン", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__audioContexts[0]?.state))
    .toBe("running");
  await reachQuiz(page);
  await page.getByRole("radio", { name: "く", exact: true }).click();
  await page.getByRole("button", { name: "たしかめる", exact: true }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("きろくを のこせない");
  await page.getByRole("link", { name: "はくぶつかんへ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "おんがくを オフ", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() => (window as any).__audioContexts.length),
  ).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__audioContexts[0].state))
    .toBe("suspended");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__audioContexts[0].state))
    .toBe("running");
  await page
    .getByRole("button", { name: "おんがくを オフ", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__audioContexts[0].state))
    .toBe("suspended");
  expect(await page.evaluate(() => (window as any).__speechCalls)).toBe(0);
});

test("touch swipe agrees with buttons and a keyboard-only player can finish", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/games/caesar");
  await next(page);
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).tap();
  await next(page);
  const board = page.locator(".sunny-board");
  const rect = await board.boundingBox();
  const x = rect!.x + rect!.width / 2,
    y = rect!.y + rect!.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 60, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".sunny-puzzle .sunny-letter--output")).toHaveText([
    "い",
    "え",
  ]);
  await context.close();
  const keyboard = await browser.newPage({
    baseURL,
    viewport: { width: 1280, height: 800 },
  });
  await keyboard.goto("/games/caesar");
  async function press(
    name: string,
    role: "button" | "radio" | "link" = "button",
  ) {
    const target = keyboard.getByRole(role, { name, exact: true });
    await expect(target).toBeEnabled();
    await target.focus();
    await keyboard.keyboard.press("Enter");
  }
  async function advance() {
    await active(keyboard);
    await press("つぎへ");
    await active(keyboard);
  }
  await advance();
  await advance();
  for (let i = 0; i < 3; i++) {
    await press("1つ もどす");
    await advance();
  }
  await press("1つ すすめる");
  await advance();
  await press("1つ もどす");
  await advance();
  await press("1つ すすめる");
  await press("1つ すすめる");
  await advance();
  await press("く", "radio");
  await press("たしかめる");
  await advance();
  for (const count of [2, 3]) {
    await press("もどす", "radio");
    for (let i = 0; i < count; i++) await press("かずを 1つ ふやす");
    await advance();
    await press("やってみる");
    await advance();
  }
  await expect(keyboard.locator(".ru-sprite--sleep")).toBeVisible();
  for (let i = 0; i < 3; i++) await advance();
  await press("はくぶつかんへ", "link");
  await expect(keyboard).toHaveURL(/\/$/);
  await keyboard.close();
});

test("opening the menu during a success cannot strand the transition", async ({
  page,
}) => {
  await page.goto("/games/caesar");
  await next(page);
  await next(page);
  await page.getByRole("button", { name: "1つ もどす", exact: true }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator(game)).toHaveAttribute("data-phase", "waiting");
  await page.keyboard.press("Escape");
  await next(page);
  await expect(page.locator(game)).toHaveAttribute("data-index", "1");
});
