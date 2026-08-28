// Shared bot-mitigation for public form actions (contact + join network).
// Two cheap layers, no external service: a honeypot field bots tend to fill,
// and a per-IP submission rate limit. Both run before any email is sent.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

// In-memory: fine for a single standalone Node process (see astro.config.mjs
// adapter: node({ mode: "standalone" })). Would need a shared store (Redis)
// behind multiple instances.
const submissionsByIp = new Map<string, number[]>();

export const isHoneypotFilled = (value: string | undefined | null): boolean =>
  Boolean(value && value.trim().length > 0);

export const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const timestamps = (submissionsByIp.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );

  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    submissionsByIp.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return false;
};
