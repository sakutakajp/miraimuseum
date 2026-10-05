import { expect, type Locator } from '@playwright/test';
// Assert the original wording independently of the visible furigana.
export async function expectBaseText(locator: Locator, expected: string, options: { timeout?: number } = {}) {
  await expect.poll(() => locator.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('rt').forEach(reading => reading.remove());
    return copy.textContent ?? '';
  }), options).toContain(expected);
}
