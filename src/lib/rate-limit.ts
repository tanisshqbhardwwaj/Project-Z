import { prisma } from "@/lib/db/prisma";

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

export function hasUpstashRateLimit(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export function hasTursoRateLimit(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim()
  );
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

type PipelineResult = { result?: unknown };

async function checkUpstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `rl:${key}`;

  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PTTL", redisKey],
    ]),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash rate limit HTTP ${res.status}`);
  }

  const json = (await res.json()) as PipelineResult[];
  const count = Number(json[0]?.result);
  const ttlMs = Number(json[1]?.result);

  if (!Number.isFinite(count)) {
    throw new Error("Upstash rate limit returned no count");
  }

  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    await fetch(`${base}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }

  if (count > limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000)
    );
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}

async function checkTursoRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  return prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket || bucket.resetAt <= now) {
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true as const };
    }

    if (bucket.count >= limit) {
      return {
        ok: false as const,
        retryAfterSec: Math.max(
          1,
          Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)
        ),
      };
    }

    await tx.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { ok: true as const };
  });
}

async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  if (hasUpstashRateLimit()) {
    try {
      return await checkUpstashRateLimit(key, limit, windowMs);
    } catch {
      /* fall through to Turso or memory */
    }
  }

  if (hasTursoRateLimit()) {
    try {
      return await checkTursoRateLimit(key, limit, windowMs);
    } catch {
      /* fall through to memory */
    }
  }

  return checkRateLimit(key, limit, windowMs);
}

export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  return checkDistributedRateLimit(key, limit, windowMs);
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): Promise<void> {
  const ip = getClientIp(request);
  const result = await checkRateLimitAsync(`${scope}:${ip}`, limit, windowMs);
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
