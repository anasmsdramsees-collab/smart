'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { Dict, Locale, dictionaries, dir as dirOf } from '@/lib/i18n';

const STORAGE_KEY = 'syltra_locale';
const DEFAULT_LOCALE: Locale = 'ar';

type LocaleContextValue = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
  setLocale: (next: Locale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts on the default so the first client render matches the server-rendered
  // <html lang="ar" dir="rtl">; the stored preference is applied after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const toggle = useCallback(
    () => setLocale(locale === 'ar' ? 'en' : 'ar'),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider
      value={{ locale, dir: dirOf(locale), t: dictionaries[locale], setLocale, toggle }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useI18n must be used inside <LocaleProvider>');
  return ctx;
}

/** Single-tap switch: the label always names the language you'd switch *to*. */
export function LocaleToggle({ className = '' }: { className?: string }) {
  const { t, toggle } = useI18n();
  return (
    <button
      type='button'
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[#8b98ab] transition hover:bg-white/[0.06] hover:text-white ${className}`}
    >
      <Languages size={16} />
      {t.localeName}
    </button>
  );
}
