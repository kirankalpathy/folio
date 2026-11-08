import { en, type MessageKey } from './messages/en';

export type { MessageKey };
export type TranslationValues = Record<string, string | number>;
export type Translator = (key: MessageKey, values?: TranslationValues) => string;

export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en };
let activeLocale: Locale = 'en';

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    values[name] === undefined ? match : String(values[name]),
  );
}

export function translateFor(
  locale: Locale,
  key: MessageKey,
  values?: TranslationValues,
): string {
  const template = dictionaries[locale][key] ?? en[key] ?? key;
  return interpolate(template, values);
}

export function translate(key: MessageKey, values?: TranslationValues): string {
  return translateFor(activeLocale, key, values);
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}
