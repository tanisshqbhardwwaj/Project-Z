import { describe, expect, it } from "vitest";
import { reservationsFromCart } from "@/lib/inventory/stock-reservation";
import { getPublicAppHost, getPublicAppUrl } from "@/lib/app/public-url";
import { hasTursoRateLimit } from "@/lib/rate-limit";

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
  it("detects Turso when env is set", () => {
    const prevUrl = process.env.TURSO_DATABASE_URL;
    const prevToken = process.env.TURSO_AUTH_TOKEN;
    process.env.TURSO_DATABASE_URL = "libsql://test.turso.io";
    process.env.TURSO_AUTH_TOKEN = "token";
    expect(hasTursoRateLimit()).toBe(true);
    process.env.TURSO_DATABASE_URL = prevUrl;
    process.env.TURSO_AUTH_TOKEN = prevToken;
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
