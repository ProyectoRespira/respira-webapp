import { LANG_COOKIE, resolveLang, type Lang } from "./config";
import { useTranslations } from "./utils";

// Client-side language detection for React islands (client:only components have
// no access to Astro.locals). Reads the same `respira-lang` cookie the server
// uses, falling back to the browser language and then the default.
export function getClientLang(): Lang {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`),
    );
    if (match) return resolveLang(decodeURIComponent(match[1]));
  }
  if (typeof navigator !== "undefined") return resolveLang(navigator.language);
  return resolveLang(undefined);
}

// The language selector reloads the page on change, so reading the cookie once
// per mount is enough — no live subscription needed.
export function useClientTranslations() {
  return useTranslations(getClientLang());
}
