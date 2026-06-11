import astroFormsMiddleware from "@astro-utils/forms";
import { defineMiddleware, sequence } from "astro/middleware";
import { DEFAULT_LANG, LANG_COOKIE, isLang, resolveLang } from "./i18n/config";

// Resolves the active language for every request and exposes it as
// `Astro.locals.lang`. Priority:
//   1. The `respira-lang` cookie (set by the language selector).
//   2. The browser's Accept-Language header (first visit, before any selection).
//   3. The default language (es).
const localeMiddleware = defineMiddleware((context, next) => {
  const cookieLang = context.cookies.get(LANG_COOKIE)?.value;

  if (isLang(cookieLang)) {
    context.locals.lang = cookieLang;
  } else {
    const acceptLanguage = context.request.headers.get("accept-language");
    const preferred = acceptLanguage?.split(",")[0];
    context.locals.lang = preferred ? resolveLang(preferred) : DEFAULT_LANG;
  }

  return next();
});

export const onRequest = sequence(localeMiddleware, astroFormsMiddleware());
