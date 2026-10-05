import { describe, expect, it } from 'vitest';
import { discoveries } from '../app/data/discoveries';
import { worlds } from '../app/data/worlds';
import { parseLocale, translate } from '../app/i18n';
import { uiEnglish } from '../app/i18n/messages';

describe('Japanese and English', () => {
  it('translates every discovery, fact, detail and world label', () => {
    const sources = [
      ...discoveries.flatMap(item => [item.name, item.category, item.detail, ...item.facts]),
      ...worlds.flatMap(world => [world.name, world.subtitle, world.room, world.action, ...Object.values(world.phases)]),
    ];
    for (const source of sources) {
      expect(translate(source, 'ja')).toBe(source);
      expect(translate(source, 'en')).not.toMatch(/[一-龯ぁ-んァ-ヶ]/);
      expect(translate(source, 'en')).not.toBe('');
    }
    for (const [source, english] of Object.entries(uiEnglish)) {
      expect(translate(source, 'en')).toBe(english);
    }
  });
  it('translates dynamic counts, levels and accessible labels without losing values', () => {
    expect(translate('恐竜の冒険：Lv. 2 · クリア 15 回', 'en')).toBe('Dinosaur adventure: Lv. 2 · 15 completed');
    expect(translate('地層の展示を見る', 'en')).toBe('View Rock layers exhibit');
    expect(translate('恐竜の世界を冒険する', 'en')).toBe('Explore Dinosaur World');
    expect(translate('海・深海の世界。タップ、またはスペースキーで泳ぐ', 'en')).toBe('Ocean & Deep Sea. Tap or press Space to swim');
    expect(translate('次は宇宙の世界へ', 'en')).toBe('Next: Space World');
    expect(translate('わたしの博物館、発見 6 / 18', 'en')).toBe('My Museum, discoveries 6 / 18');
    expect(translate('Lv. 3 に挑戦できるよ！', 'en')).toBe('Ready for Lv. 3!');
    expect(translate('タップ / Space で噴射', 'en')).toBe('Tap / Space to boost');
    expect(translate('うち 1 個が初めての発見', 'en')).toBe('1 new discovery');
    expect(translate('1 個の発見が、きみの帰りを待っているよ。', 'en')).toBe('1 discovery is waiting for you.');
  });
  it('preserves Japanese line breaks, translates ending captions and validates saved languages', () => {
    const ending = '青い地球から、\n星の海へ。';
    expect(translate(ending, 'ja')).toBe(ending);
    expect(translate(ending, 'en')).toBe('From our blue Earth\nto a sea of stars.');
    expect(translate(undefined, 'en')).toBe('');
    expect(translate('an unknown message', 'en')).toBe('an unknown message');
    expect([null, 'ja', 'en', 'invalid'].map(parseLocale)).toEqual(['ja', 'ja', 'en', 'ja']);
  });
});
