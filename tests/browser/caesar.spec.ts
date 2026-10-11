import { test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";
import { SAVE_KEY } from "../../app/games/caesar/progress";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ body: "", contentType: "text/css" }));
});
async function open(page: Page) {
  await page.goto("/games/caesar");
  await expect(page.locator(".caesar-world")).toHaveAttribute("data-renderer", "webgl", { timeout: 30000 });
}
async function expectAllKanjiHaveReadings(page: Page) {
  const unread = await page.locator("main").evaluate(main => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const missing: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (/[一-龯]/.test(node.textContent || "") && !node.parentElement?.closest("ruby, rt, [aria-hidden=true], script, style")) missing.push(node.textContent!.trim());
    }
    return missing;
  });
  expect(unread, "Every visible kanji should have a reading").toEqual([]);
}
async function expectReadable(page: Page, selector: string, text: string) {
  const area = page.locator(selector);
  await expect(area).toBeVisible();
  await expect.poll(() => area.evaluate(element => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach(reading => reading.remove());
    return clone.textContent;
  })).toContain(text);
}
async function machine(page: Page) {
  await page.getByRole("button", { name: "ステージ選択へ", exact: true }).click();
  await page.getByRole("button", { name: /STAGE 02 壊れた通信機/ }).click();
}
async function amount(page: Page, count: number, increase = true) {
  for (let i = 0; i < count; i++) await page.getByRole("button", { name: increase ? "ずらす数を1ふやす" : "ずらす数を1へらす" }).click();
}
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 45; i++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Control was unreachable using Tab");
}
async function keyboardButton(page: Page, name: string) {
  await tabTo(page, page.getByRole("button", { name, exact: true }));
  await page.keyboard.press("Enter");
}

test("linked drag, bridge completion, wrong answers, equivalent keys and one-slot repair", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.getByTestId("bridge-output")).toHaveText("FDW");
  await expect(page.getByRole("heading", { name: "暗号の橋", exact: true })).toBeVisible();
  await expectAllKanjiHaveReadings(page);
  await expect(page.locator("h1 rt").first()).toHaveText("あんごう");
  await expect(page.locator("h1 rt").first()).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => page.locator(".caesar-world__illustration").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1536);
  const band = page.locator(".caesar-band").first();
  const box = (await band.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + box.width / 5, y, { steps: 8 });
  const transforms = await page.locator(".caesar-band__strip").evaluateAll(elements => elements.map(element => getComputedStyle(element).transform));
  expect(new Set(transforms).size).toBe(1);
  await expect(page.getByTestId("bridge-output")).toHaveText("FDW");
  await page.mouse.up();
  await expect(page.getByTestId("bridge-output")).toHaveText("ECV");
  await expect(page.getByTestId("back-count")).toHaveText("1");
  await expect(page.locator(".caesar-world__letters")).toHaveText("ECV");
  await page.screenshot({ path: info.outputPath("stage1-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "1文字もどす" }).click();
  await expect(page.getByTestId("bridge-output")).toHaveText("DBU");
  await page.getByRole("button", { name: "1文字もどす" }).click();
  await expect(page.getByTestId("bridge-output")).toHaveText("CAT");
  await expect(page.getByRole("button", { name: "1文字もどす" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "通信機へ進む" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("bridge-connected-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "通信機へ進む" }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await expect(page.getByRole("button", { name: "実行" })).toBeDisabled();
  await expect(page.locator(".caesar-console")).not.toContainText("DOG");
  await expectAllKanjiHaveReadings(page);
  await expect(page.locator(".caesar-world__illustration")).toHaveAttribute("src", "/caesar/transmitter.webp");
  await expect.poll(() => page.locator(".caesar-world__illustration").evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1536);
  await page.screenshot({ path: info.outputPath("stage2-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "すすめる", exact: false }).click();
  await amount(page, 3);
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("JUM");
  await expectReadable(page, ".caesar-feedback", "元に戻すときは、反対向きに動かしてみよう。");
  await page.getByRole("button", { name: "もどす", exact: false }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await page.getByRole("button", { name: /ヒントを見る/ }).click();
  await page.getByRole("button", { name: /ヒントを見る/ }).click();
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("DOG");
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByTestId("shift-amount")).toHaveText("0");
  await expect(page.getByRole("button", { name: "実行", exact: true })).toBeDisabled();
  await amount(page, 3, false); // 0 -> 25 -> 24 -> 23
  await page.getByRole("button", { name: "もどす", exact: false }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("ERA");
  await expectReadable(page, ".caesar-feedback", "23文字戻すのは、3文字進めるのと同じ。");
  await page.getByRole("button", { name: "次へ" }).click();
  await page.getByRole("button", { name: "1文字目 F を直す" }).click();
  await page.getByRole("button", { name: "次の文字にする" }).click();
  await expect(page.locator(".caesar-word--repair")).toHaveText("GDY");
  await page.getByRole("button", { name: "3文字目 Y を直す" }).click();
  await expect(page.locator(".caesar-word--repair")).toHaveText("FDY");
  await page.getByRole("button", { name: "確かめる" }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("FDY");
  await page.getByLabel("置き換える文字を選ぶ").selectOption("W");
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await page.getByRole("button", { name: "確かめる" }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("FDW");
  await page.getByRole("button", { name: "通信機を起動する" }).click();
  await expect(page.getByRole("heading", { name: "通信機が、目を覚ました。" })).toBeVisible();
  await expectAllKanjiHaveReadings(page);
  await expectReadable(page, ".caesar-review", "ヒントを使って解けた");
  const record = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(record).toMatchObject({ version: 1, bridgeCleared: true, machineCleared: true, records: { decrypt: { attempts: 2, hints: 2, firstCorrect: false }, encrypt: { attempts: 1, firstCorrect: true }, repair: { attempts: 2, firstCorrect: false } } });
  await page.screenshot({ path: info.outputPath("complete-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "もう一度遊ぶ" }).click();
  await expect(page.getByTestId("bridge-output")).toHaveText("FDW");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("link", { name: "ゲーム一覧", exact: false }).first().click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".games-index__game")).toHaveCount(2);
  await expect(page.locator(".games-index__game--dinosaur svg")).toBeVisible();
  await expectAllKanjiHaveReadings(page);
  await page.screenshot({ path: info.outputPath("games-desktop.png"), fullPage: true });
  await page.reload();
  await page.getByRole("link", { name: /暗号の遺跡/ }).click();
  await page.getByRole("button", { name: "ステージ選択へ", exact: true }).click();
  await expectReadable(page, ".caesar-review", "ヒントを使って解けた");
  expect(errors).toEqual([]);
});

test("both stages can be completed with only the keyboard and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await tabTo(page, page.locator(".caesar-band").first());
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("bridge-output")).toHaveText("GEX");
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await keyboardButton(page, "通信機へ進む →");
  await keyboardButton(page, "« もどす");
  await tabTo(page, page.getByRole("button", { name: "ずらす数を1ふやす" }));
  for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
  await keyboardButton(page, "実行");
  await expect(page.getByTestId("machine-result")).toHaveText("DOG");
  await keyboardButton(page, "次へ →");
  await keyboardButton(page, "すすめる »");
  await tabTo(page, page.getByRole("button", { name: "ずらす数を1ふやす" }));
  for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
  await keyboardButton(page, "実行");
  await expect(page.getByTestId("machine-result")).toHaveText("ERA");
  await keyboardButton(page, "次へ →");
  await keyboardButton(page, "3文字目 Y を直す");
  await tabTo(page, page.getByRole("button", { name: "前の文字にする" }));
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await keyboardButton(page, "確かめる ◇");
  await keyboardButton(page, "通信機を起動する →");
  await expect(page.locator(".caesar")).toHaveAttribute("data-view", "complete");
});

test.describe("portrait touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("horizontal touch drags synchronize, vertical touch still scrolls, and panels fit", async ({ page }, info) => {
    await open(page);
    const band = page.locator(".caesar-band").first();
    await band.scrollIntoViewIfNeeded();
    const bounds = (await band.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const x = bounds.x + bounds.width * .4, y = bounds.y + bounds.height / 2;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + bounds.width / 5 * step / 8, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("bridge-output")).toHaveText("ECV");
    expect(await band.evaluate(element => getComputedStyle(element).touchAction)).toBe("pan-y");
    await page.evaluate(() => window.scrollTo(0, 100));
    const vertical = (await band.boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: vertical.x + 90, y: vertical.y + 30 }] });
    for (let step = 1; step <= 8; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: vertical.x + 90, y: vertical.y + 30 - step * 15 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 20);
    await expect(page.getByTestId("bridge-output")).toHaveText("ECV");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("stage1-mobile.png"), fullPage: true });
    await machine(page);
    await expect(page.getByTestId("machine-result")).toHaveText("???");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("stage2-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test("corrupt/blocked storage and unavailable WebGL keep the game usable", async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, "{broken");
    Storage.prototype.setItem = () => { throw new Error("storage unavailable"); };
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl2" || type === "webgl" || type === "experimental-webgl") return null;
      return (original as (...args: unknown[]) => unknown).apply(this, [type, ...args]) as never;
    } as typeof original;
  }, SAVE_KEY);
  await page.goto("/games/caesar");
  await expect(page.locator(".caesar-world")).toHaveAttribute("data-renderer", "fallback");
  await page.getByRole("button", { name: "1文字もどす" }).click();
  await expect(page.getByTestId("bridge-output")).toHaveText("ECV");
  await machine(page);
  await expectReadable(page, ".caesar-page-footer", "記録を保存できません。このまま遊べます。");
  await page.getByRole("button", { name: "もどす", exact: false }).click();
  await amount(page, 3);
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("DOG");
});

test("the circular decoding alternative is explained and a reset cancels pending execution", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await machine(page);
  await page.getByRole("button", { name: "すすめる", exact: false }).click();
  await amount(page, 3, false);
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("DOG");
  await expectReadable(page, ".caesar-feedback", "23文字進めるのは、3文字戻すのと同じ。");
  await page.getByRole("button", { name: "このステージをやり直す" }).click();
  await expect(page.getByTestId("machine-result")).toHaveText("???");
  await expect(page.getByTestId("shift-amount")).toHaveText("0");
  await page.getByRole("button", { name: "もどす", exact: false }).click();
  await page.getByRole("button", { name: "実行", exact: true }).click();
  await page.getByRole("button", { name: "ステージ選択へ", exact: true }).click();
  await page.getByRole("button", { name: /STAGE 01 暗号の橋/ }).click();
  await expect(page.getByTestId("bridge-output")).toHaveText("FDW");
  await expect(page.locator(".caesar")).toHaveAttribute("data-phase", "editing");
});
