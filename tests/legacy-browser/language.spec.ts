import { test, expect, type Page } from '@playwright/test';
import { LANGUAGE_KEY } from '../../app/i18n';
import { SAVE_KEY } from '../../app/game/progress';
import { collectibles, obstacles, STAGE_LENGTH } from '../../app/game/expedition';

async function expectEnglish(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const untranslated = await page.locator('.ruby-text').evaluateAll(elements =>
    elements.map(element => element.textContent ?? '').filter(text => /[一-龯ぁ-んァ-ヶ]/.test(text)));
  expect(untranslated).toEqual([]);
  await expect(page.locator('ruby')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('language switch persists, translates all galleries and preserves the original save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, visits: { strata: 1, rex: 2, blackhole: 1, vent: 1 }, expeditions: 2, muted: true })), SAVE_KEY);
  await page.reload();
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page).toHaveTitle(/Mirai Museum/);
  await expect(page.getByRole('button', { name: 'Start an adventure', exact: true })).toBeVisible();
  await expectEnglish(page);
  await page.getByRole('button', { name: /My Museum, discoveries/ }).click();
  await expect(page.getByRole('heading', { name: 'My Museum', exact: true })).toBeVisible();
  for (const [world, exhibit, detail] of [
    ['Dinosaur World', 'Tyrannosaurus', 'Cretaceous'],
    ['Space World', 'Black hole', 'gravity'],
    ['Ocean & Deep Sea', 'Hydrothermal vent', 'microbes'],
  ]) {
    await page.locator('.gallery-filters').getByRole('button', { name: new RegExp(world!) }).click();
    await page.getByRole('button', { name: `View ${exhibit} exhibit`, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(new RegExp(detail!, 'i'));
    await expectEnglish(page);
    await page.getByRole('button', { name: 'Close exhibit', exact: true }).click();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectEnglish(page);
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(saved);
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('.hero h1 ruby rt').first()).toHaveText('せかい');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(saved);
  expect(errors).toEqual([]);
});

test('English mobile expedition: switch while paused, discover, finish and save', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ languageKey, saveKey }) => {
    localStorage.setItem(languageKey, 'en');
    localStorage.setItem(saveKey, JSON.stringify({ version: 1, visits: {}, expeditions: 0, muted: true }));
  }, { languageKey: LANGUAGE_KEY, saveKey: SAVE_KEY });
  await page.goto('/');
  await expectEnglish(page);
  await page.getByRole('button', { name: 'Start an adventure', exact: true }).tap();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.game-location')).toContainText('Where fossils sleep');
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  const before = await page.getByRole('progressbar').getAttribute('aria-valuenow');
  await page.getByRole('button', { name: '日本語', exact: true }).tap();
  await expect(page.getByRole('button', { name: '冒険をつづける' })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).tap();
  await expectEnglish(page);
  expect(await page.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(before);
  await page.getByRole('button', { name: 'Resume adventure' }).tap();
  const targets = [
    ...obstacles.map(item => ({ x: item.x, lead: 65 })),
    ...collectibles.filter(item => item.elevated).map(item => ({ x: item.x, lead: 85 })),
  ].sort((a, b) => a.x - b.x);
  for (const target of targets) {
    await page.waitForFunction(value => Number(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')) >= value,
      ((target.x - target.lead) / STAGE_LENGTH) * 100, { timeout: 15_000, polling: 30 });
    await page.locator('canvas').tap({ position: { x: 160, y: 240 } });
  }
  await expect(page.locator('.ending-caption')).toBeVisible({ timeout: 30_000 });
  await expectEnglish(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, explorer!', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.result-count > strong')).toHaveText('6');
  await expect(page.locator('.result-count b')).toContainText('6 new discoveries');
  await expect(page.locator('.level-result')).toContainText('Ready for Lv. 2!');
  await expectEnglish(page);
  const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.expeditions).toBe(1);
  expect(Object.keys(save.visits)).toHaveLength(6);
  expect(errors).toEqual([]);
  await context.close();
});
