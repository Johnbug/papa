export const locales = ['zh', 'en', 'ja'] as const;
export type Locale = typeof locales[number];
export const languageTags: Record<Locale, string> = { zh: 'zh-CN', en: 'en', ja: 'ja' };
export const localeStorageKey = 'papa-language';
export function normalizeLocale(value: string | null | undefined): Locale | null {
  const language = value?.toLowerCase().split(/[-_]/)[0];
  return language === 'zh' || language === 'en' || language === 'ja' ? language : null;
}
export function resolveLocale(url: string | null, saved: string | null, languages: readonly string[]): Locale {
  return normalizeLocale(url) ?? normalizeLocale(saved) ?? languages.map(normalizeLocale).find(Boolean) ?? 'en';
}
