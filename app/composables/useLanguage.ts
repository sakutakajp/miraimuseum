import { LANGUAGE_KEY, parseLocale, translate, type Locale } from '~/i18n';
export function useLanguage() {
  const locale = useState<Locale>('museum-language', () => 'ja');
  const t = (text: string | undefined) => translate(text, locale.value);
  function initializeLanguage() {
    try { locale.value = parseLocale(localStorage.getItem(LANGUAGE_KEY)); }
    catch { /* Language switching still works when storage is unavailable. */ }
  }
  function setLocale(next: Locale) {
    locale.value = next;
    try { localStorage.setItem(LANGUAGE_KEY, next); }
    catch { /* Keep the selection for this page when storage is unavailable. */ }
  }
  return { locale, t, setLocale, initializeLanguage };
}
