import { translations, type Locale, type Translations } from "./translations.js";

export type { Locale, Translations };

let currentLocale: Locale = (process.env["LANG_LOCALE"] as Locale) ?? "fr";

/**
 * Returns the active locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Sets the active locale. Accepts "fr" or "en".
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Returns the translation object for the active locale.
 */
export function t(): Translations {
  return translations[currentLocale];
}

export { translations };
