import { test, expect } from "./fixtures";
import type { Page, Locator } from "@playwright/test";
import { SAVE_KEY } from "../../app/games/caesar/progress";
import { writeFileSync } from "node:fs";

const root = (page: Page) => page.locator(".caesar-adventure");
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const ready = async (page: Page) => expect(root(page)).toHaveAttribute("data-phase", /editing|incorrect|waiting/);
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ body: "", contentType: "text/css" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});
async function open(page: Page, renderer = "webgl") {
  await page.goto("/games/caesar");
  await expect(root(page)).toHaveAttribute("data-view", "intro");
  await expect(page.locator(".caesar-world")).toHaveAttribute("data-renderer", renderer, { timeout: 60000 });
  await ready(page);
}
async function tabTo(page: Page, locator: Locator) {
  for (let i = 0; i < 35; i++) {
    if (await locator.evaluate(element => document.activeElement === element)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("A game control was unreachable by Tab");
}
async function click(page: Page, name: string | RegExp, keyboard = false) {
  const target = button(page, name);
  await expect(target).toBeEnabled();
  if (keyboard) { await tabTo(page, target); await page.keyboard.press("Enter"); }
  else await target.click();
}
async function next(page: Page, keyboard = false) {
  await ready(page); await click(page, "つぎへ", keyboard); await ready(page);
}
const actionPositions = new WeakMap<Page, Map<string, number>>();
async function fit(page: Page) {
  const geometry = await page.evaluate(() => {
    const game = document.querySelector(".caesar-adventure")!;
    const visible = [...game.querySelectorAll<HTMLElement>("button, a")].filter(e => !e.closest("dialog") && e.getBoundingClientRect().width > 0);
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      targets: visible.map(e => { const b = e.getBoundingClientRect(); return { text: e.textContent?.trim(), x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; }),
      current: [...game.querySelectorAll(".adventure-band-strip .is-current")].map(e => parseFloat(getComputedStyle(e).fontSize)),
      controlsY: game.querySelector(".adventure-main-actions")!.getBoundingClientRect().y,
      insetKey: [(game as HTMLElement).style.paddingTop, (game as HTMLElement).style.paddingBottom].join("/") };
  });
  expect(geometry.scrollHeight, "normal portrait/landscape needs no page scrolling").toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  for (const target of geometry.targets) {
    expect(target.height, JSON.stringify(target)).toBeGreaterThanOrEqual(48);
    expect(target.width, JSON.stringify(target)).toBeGreaterThanOrEqual(48);
    expect(target.y).toBeGreaterThanOrEqual(-1); expect(target.bottom).toBeLessThanOrEqual(geometry.height + 1);
    expect(target.right).toBeLessThanOrEqual(geometry.width + 1);
  }
  expect(geometry.current.every(font => font >= 30)).toBe(true);
  const key = `${geometry.width}/${geometry.height}/${geometry.insetKey}`;
  const positions = actionPositions.get(page) || new Map<string, number>();
  if (positions.has(key)) expect(geometry.controlsY, "main buttons stay in place across story, hints and success").toBeCloseTo(positions.get(key)!, 0);
  else { positions.set(key, geometry.controlsY); actionPositions.set(page, positions); }
  return geometry.controlsY;
}
async function safeInsets(page: Page) {
  await root(page).evaluate(e => { (e as HTMLElement).style.paddingTop = "44px"; (e as HTMLElement).style.paddingBottom = "34px"; });
  await fit(page);
  await root(page).evaluate(e => { (e as HTMLElement).style.paddingTop = ""; (e as HTMLElement).style.paddingBottom = ""; });
}
async function expectChildText(page: Page) {
  const kanji = await root(page).evaluate(main => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT), missing: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (parent && !parent.closest("dialog, [aria-hidden=true]") && parent.getBoundingClientRect().width && /[一-龯]/.test(node.textContent || "")) missing.push(node.textContent!);
    }
    return missing;
  });
  expect(kanji).toEqual([]);
}
async function bridge(page: Page, check = fit, keyboard = false) {
  await next(page, keyboard); await next(page, keyboard);
  await expect(page.locator(".adventure-band")).toHaveCount(1);
  await expect(page.locator(".adventure-hand")).toBeVisible();
  await expect(button(page, /^1つ すすめる/)).toHaveCount(0);
  await check(page); await click(page, /^1つ もどす/, keyboard); await ready(page); await check(page);
  await expect(page.locator(".adventure-world-letters")).toHaveText("あ"); await next(page, keyboard);
  await expect(page.locator(".adventure-hand")).toHaveCount(0);
  const y = await check(page); await click(page, "コロの ヒント", keyboard); expect(await check(page)).toBeCloseTo(y, 0);
  await click(page, /^1つ すすめる/, keyboard); await expect(page.locator(".adventure-world-letters")).toHaveText("え");
  await click(page, /^1つ もどす/, keyboard); await click(page, /^1つ もどす/, keyboard); await ready(page); await check(page); await next(page, keyboard);
  await expect(page.locator(".adventure-band")).toHaveCount(2);
  await click(page, /^1つ もどす/, keyboard); await ready(page); await expect(page.locator(".adventure-world-letters")).toHaveText("いえ"); await check(page); await next(page, keyboard);
  await expect(page.locator(".adventure-band")).toHaveCount(3); await expect(page.locator(".adventure-world-letters")).toHaveText("すひす");
}
async function finishBridgeAndTutorial(page: Page, check = fit, keyboard = false) {
  for (const word of ["しはし", "さのさ", "こねこ"]) {
    await click(page, /^1つ もどす/, keyboard); await expect(page.locator(".adventure-world-letters")).toHaveText(word); await check(page);
  }
  await ready(page); await next(page, keyboard);
  await expect(root(page)).toHaveAttribute("data-view", "bridge-story");
  await expect(page.locator(".adventure-conversation p")).toHaveText("ぜんぶ 3つ もどしたね");
  await check(page); await next(page, keyboard); await check(page);
  await expect(page.locator(".adventure-conversation p")).toHaveText("ずらす かずが、ひみつの かぎだよ");
  await next(page, keyboard); await check(page); await next(page, keyboard);
  for (const position of [0, 1, 2, 3, 3, 2, 1, 0]) {
    await expect(root(page)).toHaveAttribute("data-view", "tutorial");
    await expect(page.locator(".adventure-count strong")).toHaveText(String(position));
    await check(page); await ready(page);
    const target = page.locator(".adventure-main-actions > button");
    if (keyboard) { await tabTo(page, target); await page.keyboard.press("Enter"); } else await target.click();
    await ready(page);
  }
  await expect(root(page)).toHaveAttribute("data-view", "machine");
  await expect(root(page)).toHaveAttribute("data-control", "direction");
  await expect(page.locator(".adventure-result .adventure-word")).toHaveText("？？？");
}
async function configure(page: Page, direction: string, amount: number, keyboard = false) {
  await click(page, direction, keyboard); await ready(page);
  await expect(page.locator(".adventure-number output")).toHaveText("0");
  for (let i = 0; i < amount; i++) await click(page, "かずを 1つ ふやす", keyboard);
  await click(page, "つぎへ", keyboard); await ready(page);
}
async function run(page: Page, keyboard = false) { await click(page, /^やってみる/, keyboard); await ready(page); }
async function repair(page: Page, check = fit, keyboard = false) {
  await expect(root(page)).toHaveAttribute("data-question", "repair");
  await click(page, "2ばんめの もじ：せ", keyboard); await click(page, "たしかめる", keyboard); await ready(page);
  await expect(page.locator(".adventure-guide p")).toHaveText("ここを もういちど みてみよう"); await check(page);
  await click(page, "コロの ヒント", keyboard); await check(page);
  await click(page, "1つ もどす", keyboard); await expect(page.locator(".adventure-word--select")).toHaveText("ひす");
  await click(page, "1ばんめの もじ：ひ", keyboard); await expect(page.locator(".adventure-word--select")).toHaveText("ひせ");
  await click(page, "2ばんめの もじ：せ", keyboard); await click(page, "1つ もどす", keyboard);
  await click(page, "たしかめる", keyboard); await ready(page); await expect(page.locator(".adventure-result .adventure-word")).toHaveText("ひす"); await check(page); await next(page, keyboard);
}

for (const size of [{ width: 360, height: 640 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
  test(`entire silent adventure fits ${size.width}×${size.height}, including hints, retries and successes`, async ({ page }, info) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const check = async (p: Page) => {
      const position = await fit(p);
      if (size.width === 375) await safeInsets(p);
      return position;
    };
    await page.setViewportSize(size);
    await page.addInitScript(() => Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined }));
    await open(page); await check(page); await expectChildText(page);
    await page.screenshot({ path: info.outputPath("01-intro.png") });
    await bridge(page, check); await check(page); if (size.width === 375) await safeInsets(page); await page.screenshot({ path: info.outputPath("02-bridge.png") });
    if (size.width === 375) {
      const band = page.locator(".adventure-band").first(), box = (await band.boundingBox())!;
      const session = await page.context().newCDPSession(page);
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + box.width / 3, y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(page.locator(".adventure-world-letters")).toHaveText("しはし");
      await click(page, /^1つ すすめる/); await expect(page.locator(".adventure-world-letters")).toHaveText("すひす");
      await session.detach();
    }
    await finishBridgeAndTutorial(page, check); await expectChildText(page);
    await expect(page.locator(".adventure-puzzle")).not.toContainText("おうち");
    await check(page); await page.screenshot({ path: info.outputPath("03-letter.png") });
    await configure(page, "もどす", 3); await expect(page.locator(".adventure-result .adventure-word")).toHaveText("？？？"); await check(page);
    await run(page); await expect(page.locator(".adventure-result .adventure-word")).toHaveText("おうち"); await check(page);
    await page.screenshot({ path: info.outputPath("04-letter-read.png") }); await next(page);
    await configure(page, "すすめる", 3); await run(page); await expect(page.locator(".adventure-receiver")).toContainText("ここ"); await check(page); await next(page);
    await repair(page, check); if (size.width === 375) await safeInsets(page); await expect(page.locator(".adventure-clue")).toContainText("う");
    await expect(page.locator(".adventure-progress")).toHaveText("さいごの とびら");
    await configure(page, "もどす", size.width === 360 ? 3 : 2); await run(page);
    if (size.width === 360) {
      await check(page); await click(page, "かずを えらびなおす"); await ready(page);
      await expect(page.locator(".adventure-number output")).toHaveText("3");
      await expect(page.locator(".adventure-result .adventure-word")).toHaveText("？？");
      await click(page, "かずを 1つ へらす"); await click(page, "つぎへ"); await ready(page); await run(page);
    }
    await expect(page.locator(".adventure-result .adventure-word")).toHaveText("いえ"); await check(page); await next(page);
    for (let i = 0; i < 4; i++) { await check(page); await next(page); }
    await expect(root(page)).toHaveAttribute("data-view", "complete"); await check(page); await expectChildText(page);
    await page.screenshot({ path: info.outputPath("05-home.png") });
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved).toMatchObject({ version: 2, curriculum: "mii-home-1", bridgeCleared: true, machineCleared: true, doorCleared: true,
      records: { decrypt: { attempts: 1, hints: 0, firstCorrect: true }, repair: { attempts: 2, hints: 1, firstCorrect: false }, door: { attempts: size.width === 360 ? 2 : 1, hints: 0, firstCorrect: size.width !== 360 } } });
    writeFileSync(info.outputPath("progress.json"), JSON.stringify(saved, null, 2));
    await page.reload(); await expect(root(page)).toHaveAttribute("data-view", "intro");
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)).toEqual(saved);
    expect(errors).toEqual([]);
  });
}

test("desktop linked drags match buttons; keyboard completes every part, with usable landscape and text enlargement", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await open(page); await bridge(page, fit, true);
  const band = page.locator(".adventure-band").first(), box = (await band.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + box.width / 5, y, { steps: 8 });
  const transforms = await page.locator(".adventure-band-strip").evaluateAll(elements => elements.map(e => getComputedStyle(e).transform));
  expect(new Set(transforms).size).toBe(1); await expect(page.locator(".adventure-world-letters")).toHaveText("すひす");
  await page.mouse.up(); await expect(page.locator(".adventure-world-letters")).toHaveText("しはし");
  await tabTo(page, band); await page.keyboard.press("ArrowLeft"); await expect(page.locator(".adventure-world-letters")).toHaveText("すひす");
  await page.setViewportSize({ width: 667, height: 375 }); await fit(page); await page.screenshot({ path: info.outputPath("landscape.png") });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  await button(page, /^1つ もどす/).scrollIntoViewIfNeeded(); await expect(button(page, /^1つ もどす/)).toBeInViewport();
  await page.evaluate(() => document.documentElement.style.fontSize = ""); await page.evaluate(() => scrollTo(0, 0));
  await fit(page); await page.setViewportSize({ width: 1280, height: 800 }); await finishBridgeAndTutorial(page, fit, true);
  await configure(page, "すすめる", 43, true); await run(page, true); await expect(page.locator(".adventure-result .adventure-word")).toHaveText("おうち"); await next(page, true);
  await configure(page, "もどす", 43, true); await run(page, true); await next(page, true);
  await repair(page, fit, true); await configure(page, "すすめる", 44, true); await run(page, true); await next(page, true);
  for (let i = 0; i < 4; i++) await next(page, true);
  await tabTo(page, page.getByRole("link", { name: "おしまい" })); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/games\/?$/);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
});

test("modal chart preserves the puzzle, next spam is gated, and resizing follows viewport height", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mirai-museum:language", "en"));
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await expect(root(page)).toHaveAttribute("lang", "ja");
  await expectChildText(page);
  await button(page, "つぎへ").evaluate(e => { (e as HTMLButtonElement).click(); (e as HTMLButtonElement).click(); });
  await expect(page.locator(".adventure-conversation p")).toHaveText("はしを なおして、いっしょに いこう！");
  await ready(page); await next(page); await click(page, "もじの ならび");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("list", { name: "46この もじの ならび" }).locator("span")).toHaveCount(46);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(button(page, "もじの ならび")).toBeFocused(); await expect(page.locator(".adventure-world-letters")).toHaveText("い");
  await page.setViewportSize({ width: 375, height: 667 });
  await root(page).evaluate(e => { (e as HTMLElement).style.paddingTop = "44px"; (e as HTMLElement).style.paddingBottom = "34px"; });
  await fit(page);
  await root(page).evaluate(e => { (e as HTMLElement).style.paddingTop = ""; (e as HTMLElement).style.paddingBottom = ""; });
  for (const height of [710, 640, 844]) { await page.setViewportSize({ width: 390, height }); await fit(page); }
  await click(page, "メニュー"); await click(page, "この もんだいを やりなおす"); await click(page, "やりなおす"); await ready(page); await fit(page);
  await expect(page.locator(".adventure-world-letters")).toHaveText("い");
});

test("missing WebGL retains illustration, movable feet and a playable puzzle without a technical banner", async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) { return type.includes("webgl") ? null : (original as any).call(this, type, ...args); } as any;
  });
  await open(page, "fallback"); await fit(page);
  await expect(page.locator(".adventure-puzzle")).not.toContainText(/WebGL|演出|表示できません/);
  expect(await page.locator(".caesar-world__illustration").evaluate(e => (e as HTMLImageElement).naturalWidth)).toBe(1536);
  await next(page); await next(page); await click(page, /^1つ もどす/); await ready(page);
  await expect(page.locator(".adventure-world-steps i.active")).toHaveCount(1); await fit(page);
  await page.screenshot({ path: info.outputPath("fallback.png") });
  await click(page, "メニュー"); await click(page, "おとなの かたへ");
  await expect(page.getByRole("dialog")).toContainText(/この環境ではWebGL.*できません。/);
});

test("speech starts after a gesture, never overlaps, cancels on changes and offers off/repeat", async ({ page }, info) => {
  await page.addInitScript(() => {
    const log: any = { active: 0, max: 0, spoken: [], cancels: 0 };
    (window as any).__voiceLog = log;
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{ name: "Test Japanese", lang: "ja-JP", localService: true }],
      cancel: () => { log.active = 0; log.cancels++; },
      speak: (u: any) => { log.active++; log.max = Math.max(log.max, log.active); log.spoken.push({ text: u.text, lang: u.lang }); },
      addEventListener() {}, removeEventListener() {},
    } });
  });
  await open(page);
  expect(await page.evaluate(() => (window as any).__voiceLog.spoken)).toEqual([]);
  await click(page, "もういちど きく");
  expect(await page.evaluate(() => (window as any).__voiceLog.spoken.at(-1).text)).toBe("おうちに かえりたいな……");
  await next(page); expect(await page.evaluate(() => (window as any).__voiceLog.spoken.at(-1).text)).toBe("はしを なおして、いっしょに いこう！");
  await click(page, "メニュー"); expect(await page.evaluate(() => (window as any).__voiceLog.active)).toBe(0);
  await click(page, "おと：オン"); await click(page, "とじて あそびに もどる");
  const count = await page.evaluate(() => (window as any).__voiceLog.spoken.length); await next(page);
  expect(await page.evaluate(() => (window as any).__voiceLog.spoken.length)).toBe(count);
  await click(page, "おとを オンにする"); await click(page, "もういちど きく");
  await click(page, /^1つ もどす/); await ready(page); await next(page);
  const log = await page.evaluate(() => (window as any).__voiceLog); expect(log.max).toBe(1); expect(log.spoken.every((s: any) => s.lang === "ja-JP")).toBe(true);
  writeFileSync(info.outputPath("simulated-speech.json"), JSON.stringify(log, null, 2));
  await click(page, "メニュー"); await page.getByRole("link", { name: "ゲームを おわる" }).click();
  expect(await page.evaluate(() => (window as any).__voiceLog.active)).toBe(0);
});

test("denied storage still allows the first practice and explains missing records in the menu", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("blocked storage"); };
    Storage.prototype.setItem = () => { throw new Error("blocked storage"); };
  });
  await open(page); await next(page); await next(page); await click(page, /^1つ もどす/); await ready(page); await fit(page);
  await expect(page.locator(".adventure-world-letters")).toHaveText("あ");
  await click(page, "メニュー"); await click(page, "おとなの かたへ");
  await expect(page.getByRole("dialog")).toContainText("この環境では記録を保存できません。遊びは続けられます。");
});
