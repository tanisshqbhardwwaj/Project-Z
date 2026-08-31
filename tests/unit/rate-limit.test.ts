import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  enforceResendEmailRateLimitByIp,
  RATE_LIMITS,
  RateLimitError,
  resetRateLimitStoreForTests,
} from "@/lib/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  it("allows requests under the limit", () => {
    const key = "test:127.0.0.1";
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const key = "test:block";
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("allows up to 5 Resend emails per IP per day", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < RATE_LIMITS.resendEmail.limit; i++) {
      await expect(enforceResendEmailRateLimitByIp(ip)).resolves.toBeUndefined();
    }
    await expect(enforceResendEmailRateLimitByIp(ip)).rejects.toBeInstanceOf(RateLimitError);
  });
});
