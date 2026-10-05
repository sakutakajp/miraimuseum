import { describe, expect, it } from 'vitest';
import { rubySegments } from '../app/data/readings';
import { discoveries } from '../app/data/discoveries';
import { worlds } from '../app/data/worlds';

describe('furigana', () => {
  it('preserves the original text, punctuation and numbers', () => {
    const text = '約6700万年前。恐竜の世界へ！\n<test>&';
    expect(rubySegments(text).map(part => part.text).join('')).toBe(text);
  });
  it('uses contextual readings instead of individual kanji', () => {
    expect(rubySegments('生き物が生まれる。')).toContainEqual({ text: '生き物', reading: 'いきもの' });
    expect(rubySegments('生き物が生まれる。')).toContainEqual({ text: '生まれ', reading: 'うまれ' });
    expect(rubySegments('熱水噴出孔')).toEqual([{ text: '熱水噴出孔', reading: 'ねっすいふんしゅつこう' }]);
  });
  it('annotates all kanji in the three worlds and every discovery', () => {
    const texts = [
      ...discoveries.flatMap(item => [item.name, item.category, item.detail, ...item.facts]),
      ...worlds.flatMap(world => [world.name, world.subtitle, world.room, world.action, ...Object.values(world.phases)]),
    ];
    const missing = texts.flatMap(text => rubySegments(text).filter(part => !part.reading && /[一-龯]/.test(part.text)).map(part => part.text));
    expect([...new Set(missing)]).toEqual([]);
  });
});
