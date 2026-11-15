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

/**
 * A latitude/longitude in decimal degrees, 3 decimals (~110 m, the precision the backend works
 * at), always with a dot and Western digits whatever the UI language: coordinates are a
 * technical notation, read the same everywhere.
 */
export function formatCoordinate(value: number): string {
  return value.toFixed(3);
}

/**
 * A season is labelled by its END year (2025 = October 2024 → May 2025) but always shown as
 * both years: 2025 → "2024–2025", never "2025" alone. Western digits in every language.
 */
export function formatSeason(endYear: number): string {
  return `${endYear - 1}–${endYear}`;
}

/**
 * Display-only distance for a NASA POWER cell: degrees × 111, rounded to 5 km, at least 5.
 * Always shown with "~": an approximation of the cell's offset, not a measured value.
 */
export function approxKm(distanceDeg: number): number {
  return Math.max(5, Math.round((distanceDeg * 111) / 5) * 5);
}

/** "2026-11-16" → "lun." (fr) / "Mon" (en) / "الاثنين" (ar). */
export function formatWeekday(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(localeOf(language), {
    weekday: "short",
    timeZone: "UTC", // an ISO date is UTC midnight: never shift it to the previous day
  }).format(new Date(isoDate));
}
