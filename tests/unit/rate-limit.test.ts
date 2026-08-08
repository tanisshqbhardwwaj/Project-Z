import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
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
});
