import { describe, expect, it } from "vitest";
import { LOCAL_SHOP_STATEMENTS } from "@/lib/local-db/schema";
import { applyLocalShopSchema, createSqlAdapter } from "@/lib/local-db/sql-adapter";
import { createSqlJsRunner } from "@/lib/local-db/sqljs-engine";
import { shouldHandleLocally } from "@/lib/sync/local-api";
import { SYNC_KINDS } from "@/lib/sync/kinds";

describe("local SQLite schema", () => {
  it("creates meta, kv and outbox", () => {
    const sql = LOCAL_SHOP_STATEMENTS.join("\n");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS meta");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS kv");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS outbox");
  });

  it("round-trips a sale and pending outbox through sql.js", async () => {
    const engine = await createSqlJsRunner();
    await applyLocalShopSchema(engine.runner);
    const db = createSqlAdapter(engine.runner, "tauri-sql");
    await db.putOne("sales", {
      id: "sale-1",
      orgId: "org-1",
      data: { id: "sale-1", billNumber: "INV-4-26-27-00018" },
    });
    const sales = await db.getAll<{ billNumber: string }>("sales", "org-1");
    expect(sales[0]?.billNumber).toBe("INV-4-26-27-00018");

    await db.enqueue({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "org-1",
      kind: "sale.create",
      payload: { clientId: "sale-1" },
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    expect(await db.pendingCount("org-1")).toBe(1);
    const bytes = engine.exportBytes();
    expect(bytes.byteLength).toBeGreaterThan(100);
  });

  it("stops retrying outbox rows after 8 application failures", async () => {
    const engine = await createSqlJsRunner();
    await applyLocalShopSchema(engine.runner);
    const db = createSqlAdapter(engine.runner, "tauri-sql");
    await db.enqueue({
      id: "22222222-2222-4222-8222-222222222222",
      orgId: "org-1",
      kind: "sale.create",
      payload: {},
      status: "PENDING",
      createdAt: new Date().toISOString(),
      attempts: 7,
    });
    expect(await db.pendingCount("org-1")).toBe(1);
    await db.markOutbox("22222222-2222-4222-8222-222222222222", "DEAD", "failed", 8);
    expect(await db.pendingCount("org-1")).toBe(0);
  });
});

describe("local-first intercept", () => {
  it("sends new sales through the outbox even when online", () => {
    expect(shouldHandleLocally("/api/v1/shop/sales", "POST")).toBe(true);
    expect(shouldHandleLocally("/api/v1/shop/returns", "POST")).toBe(true);
  });

  it("does not intercept unrelated POSTs while online", () => {
    expect(shouldHandleLocally("/api/v1/auth/logout", "POST")).toBe(false);
  });
});

describe("sync kinds", () => {
  it("covers the shop write set", () => {
    expect(SYNC_KINDS).toEqual(
      expect.arrayContaining([
        "sale.create",
        "return.create",
        "stock.adjust",
        "udhaar.payment",
        "purchase.create",
        "expense.create",
      ])
    );
  });
});
