import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe to call before any ShopCustomer raw SQL. */
export async function ensureShopCustomerSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ShopCustomer" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "phone" TEXT,
          "gstin" TEXT,
          "email" TEXT,
          "notes" TEXT,
          "lastSaleAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      const cols = (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("ShopSale")`
      )) as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "customerId")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "ShopSale" ADD COLUMN "customerId" TEXT
            REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE
        `);
      }

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ShopCustomer_organizationId_phone_key"
          ON "ShopCustomer"("organizationId", "phone")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ShopCustomer_organizationId_name_idx"
          ON "ShopCustomer"("organizationId", "name")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_customerId_idx"
          ON "ShopSale"("organizationId", "customerId")
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
