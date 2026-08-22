import { createPrismaClient } from "./lib/prisma-client.mjs";

const prisma = createPrismaClient();

async function ensurePricingJson() {
  const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("ShopSale")`);
  const has = cols.some((c) => c.name === "pricingJson");
  if (!has) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShopSale" ADD COLUMN "pricingJson" TEXT NOT NULL DEFAULT '{}'`
    );
    console.log("Added ShopSale.pricingJson");
  } else {
    console.log("ShopSale.pricingJson OK");
  }
}

async function ensureShopCustomer() {
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

  const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("ShopSale")`);
  if (!cols.some((c) => c.name === "customerId")) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ShopSale" ADD COLUMN "customerId" TEXT
        REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log("Added ShopSale.customerId");
  } else {
    console.log("ShopSale.customerId OK");
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
  console.log("ShopCustomer schema OK");
}

async function main() {
  const target = process.env.TURSO_DATABASE_URL ? "Turso" : "local SQLite";
  console.log(`Applying shop schema to ${target}…`);
  await ensurePricingJson();
  await ensureShopCustomer();
  await ensureExtendedTables();
  console.log("Done.");
}

async function ensureExtendedTables() {
  const statements = [
    `ALTER TABLE "ShopSale" ADD COLUMN "paidAmountPaise" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "ShopSale" ADD COLUMN "totalCostPaise" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "ShopSale" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PAID'`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* column exists */
    }
  }
  console.log("Extended shop schema OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
