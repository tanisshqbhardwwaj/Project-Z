type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

export class RateLimitError extends Error {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(`Too many requests. Try again in ${retryAfterSec} seconds.`);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  cleanupExpired(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  return { ok: true };
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): void {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${scope}:${ip}`, limit, windowMs);
  if (!result.ok) {
    throw new RateLimitError(result.retryAfterSec);
  }
}

/** Reset store between tests. */
export function resetRateLimitStoreForTests() {
  store.clear();
  lastCleanup = Date.now();
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  upload: { limit: 20, windowMs: 60 * 60_000 },
  aiRerun: { limit: 30, windowMs: 60 * 60_000 },
} as const;
