'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { zh, type Messages } from '@/lib/locales/zh';
import { en } from '@/lib/locales/en';
import { ja } from '@/lib/locales/ja';
import { languageTags, localeStorageKey, normalizeLocale, resolveLocale, type Locale } from '@/lib/locale';
import { trackEvent } from '@/lib/analytics';

export const messages: Record<Locale, Messages> = { zh, en, ja };
const LocaleContext = createContext<{ locale: Locale; t: Messages; setLocale(locale: Locale): void } | null>(null);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('zh');
  useEffect(() => {
    function readLanguage() {
      let saved: string | null = null;
      try { saved = localStorage.getItem(localeStorageKey); } catch { /* Storage is optional. */ }
      updateLocale(resolveLocale(new URLSearchParams(location.search).get('lang'), saved, navigator.languages ?? [navigator.language]));
    }
    readLanguage();
    window.addEventListener('popstate', readLanguage);
    return () => window.removeEventListener('popstate', readLanguage);
  }, []);
  useEffect(() => {
    document.documentElement.lang = languageTags[locale];
    document.title = messages[locale].title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', messages[locale].description);
  }, [locale]);
  function setLocale(next: Locale) {
    if (!normalizeLocale(next) || next === locale) return;
    trackEvent('language_change', { from: locale, to: next });
    updateLocale(next);
    try { localStorage.setItem(localeStorageKey, next); } catch { /* Storage is optional. */ }
    const url = new URL(location.href); url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
  }
  return <LocaleContext.Provider value={{ locale, t: messages[locale], setLocale }}>{children}</LocaleContext.Provider>;
}
export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useI18n requires LocaleProvider');
  return context;
}
