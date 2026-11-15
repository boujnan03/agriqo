import type { Language } from "./index";

/**
 * Locale used to format numbers and dates per UI language. "ar-MA" gives Moroccan month and
 * day names; every format forces Western digits (design.md §9a "Numerals").
 */
const LOCALE: Record<Language, string> = {
  ar: "ar-MA",
  fr: "fr-FR",
  en: "en-GB",
};

const localeOf = (language: string): string =>
  LOCALE[language as Language] ?? language;

/** 18.9 → "18,9" (fr) / "18.9" (en); at most `maxDecimals` decimals, Western digits. */
export function formatNumber(
  value: number,
  language: string,
  maxDecimals = 1,
): string {
  return new Intl.NumberFormat(localeOf(language), {
    maximumFractionDigits: maxDecimals,
    numberingSystem: "latn",
  }).format(value);
}

/** "2026-11-16" → "lun." (fr) / "Mon" (en) / "الاثنين" (ar). */
export function formatWeekday(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(localeOf(language), {
    weekday: "short",
    timeZone: "UTC", // an ISO date is UTC midnight: never shift it to the previous day
  }).format(new Date(isoDate));
}
