import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

<<<<<<< HEAD
async function billNumberUniqueIndexExists(): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='index' AND name='ShopSale_organizationId_billNumber_key'`
  )) as Array<{ name: string }>;
  return rows.length > 0;
}

/** Idempotent — adds pricingJson if missing; ensures bill-number unique index when data allows. */
=======
/** Idempotent — adds pricingJson if missing (Turso/local drift). */
>>>>>>> origin/master
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
<<<<<<< HEAD

      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "ShopBillCounter" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "fiscalYear" TEXT NOT NULL,
          "seq" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "ShopBillCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopBillCounter_organizationId_fiscalYear_key" ON "ShopBillCounter"("organizationId", "fiscalYear")`
      );

      if (await billNumberUniqueIndexExists()) return;

      try {
        await prisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX "ShopSale_organizationId_billNumber_key" ON "ShopSale"("organizationId", "billNumber") WHERE "billNumber" IS NOT NULL`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("UNIQUE constraint failed") &&
          msg.includes("ShopSale")
        ) {
          console.warn(
            "[shop] Duplicate bill numbers block unique index — run scripts/dedupe-shop-bill-numbers.mjs then npm run turso:migrate"
          );
          return;
        }
        throw err;
      }
=======
>>>>>>> origin/master
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
