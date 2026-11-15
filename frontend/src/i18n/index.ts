/**
 * The app's single i18n mechanism (design.md §9a): i18next + react-i18next, one resource file
 * per language. Every piece of UI text is a key in ar.json / fr.json / en.json; components read
 * it with `useTranslation()`. Per-crop content (names, descriptions…) is fixture data in
 * src/mocks, not UI chrome, so it is not translated here.
 *
 * Arabic is the default language on every load (no persisted preference yet). The active
 * language is mirrored onto <html lang dir>: `dir` mirrors the whole layout (components use
 * CSS logical properties only), `lang` switches the font stack (theme/global.css).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import en from "./en.json";
import fr from "./fr.json";

/** Switcher order (design.md §9a): Arabic first, it is the default. */
export const LANGUAGES = ["ar", "fr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "ar";

export const resources = {
  ar: { translation: ar },
  fr: { translation: fr },
  en: { translation: en },
} as const;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    // Keys are type-checked against the Arabic (default) file; a test keeps the 3 files in sync.
    resources: { translation: typeof ar };
  }
}

/** <html lang dir> follow the active language. */
export function applyDocumentLanguage(language: string): void {
  const root = document.documentElement;
  root.lang = language;
  root.dir = i18n.dir(language);
}

i18n.on("languageChanged", applyDocumentLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  initAsync: false, // resources are bundled: initialise synchronously, no first-render flash
  interpolation: { escapeValue: false }, // React already escapes
});
applyDocumentLanguage(i18n.language);

export default i18n;
