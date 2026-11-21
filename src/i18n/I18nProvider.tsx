import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DATE_FORMAT_CHANGED_EVENT, formatToday } from '../utils/date';
import {
  setActiveLocale,
  translateFor,
  type Locale,
  type Translator,
  type TranslationValues,
} from './translate';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;

    let midnightTimer: number | undefined;
    const syncTitle = () => {
      document.title = `Folio - ${formatToday()}`;
      if (midnightTimer) window.clearTimeout(midnightTimer);
      const now = new Date();
      const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1000;
      midnightTimer = window.setTimeout(syncTitle, ms);
    };
    syncTitle();
    window.addEventListener(DATE_FORMAT_CHANGED_EVENT, syncTitle);

    return () => {
      window.removeEventListener(DATE_FORMAT_CHANGED_EVENT, syncTitle);
      if (midnightTimer) window.clearTimeout(midnightTimer);
    };
  }, [locale]);

  const t = useCallback<Translator>(
    (key, values) => translateFor(locale, key, values),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider.');
  return context;
}

export type { TranslationValues };
