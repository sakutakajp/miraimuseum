import { discoveries } from '../data/discoveries';
import { worlds } from '../data/worlds';
import { discoveryEnglish } from './discoveries.en';
import { worldEnglish } from './worlds.en';
import { uiEnglish } from './messages';
export type Locale = 'ja' | 'en';
export const LANGUAGE_KEY = 'mirai-museum:language';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const pairs: [string, string][] = Object.entries(uiEnglish);
for (const item of discoveries) {
  const translated = discoveryEnglish[item.id];
  pairs.push([item.name, translated.name], [item.category, translated.category], [item.detail, translated.detail]);
  item.facts.forEach((fact, index) => pairs.push([fact, translated.facts[index]!]));
}
for (const world of worlds) {
  const translated = worldEnglish[world.id];
  for (const field of ['name', 'subtitle', 'room', 'action'] as const) pairs.push([world[field], translated[field]]);
  for (const [phase, label] of Object.entries(world.phases)) pairs.push([label, translated.phases[phase]!]);
}
export const englishMessages = Object.fromEntries(pairs.map(([key, value]) => [normalize(key), value]));
const templates = pairs.filter(([key]) => /\{\w+\}/.test(key)).map(([key, value]) => {
  const names: string[] = [];
  const escaped = normalize(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\\\{(\w+)\\\}/g, (_match, name: string) => { names.push(name); return '(.+?)'; });
  return { pattern: new RegExp(`^${pattern}$`), names, value };
});
export function parseLocale(value: string | null): Locale { return value === 'en' ? 'en' : 'ja'; }
export function translate(text: string | undefined, locale: Locale): string {
  if (!text) return '';
  if (locale === 'ja') return text;
  const key = normalize(text);
  if (englishMessages[key]) return englishMessages[key];
  for (const template of templates) {
    const match = template.pattern.exec(key);
    if (!match) continue;
    const result = template.value.replace(/\{(\w+)\}/g, (_placeholder, name: string) => {
      const value = match[template.names.indexOf(name) + 1]!;
      return englishMessages[normalize(value)] ?? value;
    });
    return result.replace(/\b1 (new )?discoveries\b/g, (_match, qualifier: string | undefined) => `1 ${qualifier ?? ''}discovery`).replace('1 discovery are', '1 discovery is');
  }
  return text;
}
