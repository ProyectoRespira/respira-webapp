// Supported languages and i18n configuration.
// Spanish is the default language and the fallback for any unsupported value.

export const languages = {
  es: "Español",
  en: "English",
  pt: "Português",
} as const;

export type Lang = keyof typeof languages;

export const DEFAULT_LANG: Lang = "es";

export const LANGUAGE_CODES = Object.keys(languages) as Lang[];

// Cookie used to persist the manually selected language across navigation and refresh.
export const LANG_COOKIE = "respira-lang";

// One year in seconds.
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && value in languages;
}

// Normalize any value (cookie, query param, Accept-Language tag) to a supported
// language, falling back to the default when unsupported.
export function resolveLang(value: unknown): Lang {
  if (isLang(value)) return value;
  if (typeof value === "string") {
    const base = value.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}
