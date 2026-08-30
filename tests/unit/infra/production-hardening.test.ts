import { describe, expect, it } from "vitest";
import { reservationsFromCart } from "@/lib/inventory/stock-reservation";
import { getPublicAppHost, getPublicAppUrl } from "@/lib/app/public-url";
import { hasDatabaseRateLimit } from "@/lib/rate-limit";

describe("stock reservations", () => {
  it("aggregates cart lines by inventory item", () => {
    const map = reservationsFromCart([
      { inventoryItemId: "a", qty: 2 },
      { inventoryItemId: "a", qty: 1 },
      { inventoryItemId: "b", qty: 4 },
      { name: "no id", qty: 1 },
    ]);
    expect(map.get("a")).toBe(3);
    expect(map.get("b")).toBe(4);
    expect(map.size).toBe(2);
  });
});

describe("rate limit backends", () => {
  it("detects Postgres when DATABASE_URL is set", () => {
    const prevUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://projectz:projectz@localhost:5432/projectz";
    expect(hasDatabaseRateLimit()).toBe(true);
    process.env.DATABASE_URL = "file:./dev.db";
    expect(hasDatabaseRateLimit()).toBe(false);
    process.env.DATABASE_URL = prevUrl;
  });
});

describe("public app host", () => {
  it("parses hostname from url env", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://my-shop.vercel.app";
    expect(getPublicAppHost()).toBe("my-shop.vercel.app");
    expect(getPublicAppUrl()).toBe("https://my-shop.vercel.app");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});
