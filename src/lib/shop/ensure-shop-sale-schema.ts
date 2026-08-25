import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

/** Idempotent — adds pricingJson if missing (Turso/local drift). */
export async function ensureShopSaleSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const cols = (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("ShopSale")`
      )) as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "pricingJson")) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "ShopSale" ADD COLUMN "pricingJson" TEXT NOT NULL DEFAULT '{}'`
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
