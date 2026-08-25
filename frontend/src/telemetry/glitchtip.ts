import * as Sentry from "@sentry/browser";

import { getRuntimeConfig } from "../store/runtime-config";

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
];

let initialized = false;

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEYS.some((sensitiveKey) =>
    key.toLowerCase().includes(sensitiveKey),
  );

const scrubValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[Filtered]" : scrubValue(item),
    ]),
  );
};

const removeQuery = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url.split("?", 1)[0];
  }
};

const beforeSend = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  if (event.request) {
    event.request.data = undefined;
    event.request.cookies = undefined;
    event.request.query_string = undefined;
    event.request.headers = scrubValue(event.request.headers) as Record<
      string,
      string
    >;
    if (event.request.url) {
      event.request.url = removeQuery(event.request.url);
    }
  }

  event.extra = scrubValue(event.extra) as Record<string, unknown>;
  event.contexts = scrubValue(event.contexts) as Sentry.Contexts;
  event.breadcrumbs = scrubValue(event.breadcrumbs) as Sentry.Breadcrumb[];
  return event;
};

export const initializeGlitchTip = async (): Promise<void> => {
  if (initialized || typeof window === "undefined") {
    return;
  }

  const { glitchtipDsn, glitchtipEnvironment, glitchtipRelease } =
    await getRuntimeConfig();
  if (!glitchtipDsn) {
    return;
  }

  Sentry.init({
    dsn: glitchtipDsn,
    environment: glitchtipEnvironment || undefined,
    release: glitchtipRelease || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend,
  });
  initialized = true;
};

export const captureGlitchTipException = (
  error: Error,
  component: string | undefined,
): void => {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error, {
    tags: component ? { component } : undefined,
  });
};
