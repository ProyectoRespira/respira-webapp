// Shared bot-mitigation for public form actions (contact + join network).
// Two cheap layers, no external service: a honeypot field bots tend to fill,
// and a per-IP submission rate limit. Both run before any email is sent.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

// How often the whole map is swept for addresses that have gone quiet. Per-IP
// cleanup alone only ever touches the address currently submitting, so every
// other entry stays for ever — and an attacker rotating addresses (a single
// IPv6 /64 offers effectively unlimited ones) would grow this until the
// process ran out of memory.
const SWEEP_INTERVAL_MS = WINDOW_MS;

// A hard ceiling for the case where the sweep has nothing to drop because the
// addresses really are all active. Well past any plausible legitimate load for
// two contact forms, so reaching it means an attack is under way.
const MAX_TRACKED_IPS = 10_000;

// In-memory: fine for a single standalone Node process (see astro.config.mjs
// adapter: node({ mode: "standalone" })). Would need a shared store (Redis)
// behind multiple instances.
const submissionsByIp = new Map<string, number[]>();

let lastSweepAt = Date.now();

const sweep = (now: number): void => {
  for (const [ip, timestamps] of submissionsByIp) {
    const live = timestamps.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) {
      submissionsByIp.delete(ip);
    } else {
      submissionsByIp.set(ip, live);
    }
  }
  lastSweepAt = now;
};

export const isHoneypotFilled = (value: string | undefined | null): boolean =>
  Boolean(value && value.trim().length > 0);

export const isRateLimited = (ip: string): boolean => {
  const now = Date.now();

  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) sweep(now);

  const tracked = submissionsByIp.get(ip);

  // At the ceiling, an address we are not already tracking is turned away
  // rather than admitted: adding it is what would push memory past the bound,
  // and evicting somebody else to make room would let an attacker clear their
  // own record on demand. Addresses already tracked carry on as normal, so a
  // flood of new ones cannot silently lift anyone's limit.
  if (tracked === undefined && submissionsByIp.size >= MAX_TRACKED_IPS) {
    return true;
  }

  const timestamps = (tracked ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    submissionsByIp.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return false;
};
