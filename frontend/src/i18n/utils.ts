import { DEFAULT_LANG, type Lang, resolveLang } from "./config";
import { ui, type UIKey } from "./ui";

export { DEFAULT_LANG, resolveLang };
export type { Lang, UIKey };

// Read the language resolved by the middleware (Astro.locals.lang), falling back
// to the default when it's missing (e.g. statically prerendered pages).
export function getLangFromLocals(locals: App.Locals): Lang {
  return resolveLang(locals?.lang);
}

// Returns a `t(key)` function for the given language. Any key missing in the
// target language falls back to the default language, so partial translations
// never render an empty string.
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang]?.[key] ?? ui[DEFAULT_LANG][key];
  };
}
