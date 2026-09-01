import { prisma } from "@/lib/db/prisma";

let ensured = false;

const FEATURE_MODELS = ["shopHeldBill", "shopOffer", "shopSaleReturn"] as const;

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertShopFeaturesPrismaClient() {
  const p = prisma as unknown as Record<string, { findMany?: unknown } | undefined>;
  const missing = FEATURE_MODELS.filter((m) => typeof p[m]?.findMany !== "function");
  if (missing.length > 0) {
    throw new Error(
      `Prisma client is out of date (${missing.join(", ")} missing). Stop the dev server, run \`npx prisma generate\`, then restart \`npm run dev\`.`
    );
  }
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return rows.length > 0;
}

export async function ensureShopFeaturesSchema() {
  assertShopFeaturesPrismaClient();
  if (ensured) return;

  if (!(await tableExists("ShopHeldBill"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopHeldBill" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "holdNumber" INTEGER NOT NULL,
        "customerId" TEXT,
        "customerName" TEXT,
        "customerPhone" TEXT,
        "customerGstin" TEXT,
        "salesBoyName" TEXT,
        "cartJson" TEXT NOT NULL,
        "pricingJson" TEXT NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "expiresAt" DATETIME NOT NULL,
        "createdById" TEXT NOT NULL,
        "resumedAt" DATETIME,
        "cancelledAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("customerId") REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopOffer"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopOffer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "discountType" TEXT NOT NULL,
        "discountValue" REAL NOT NULL,
        "productIdsJson" TEXT,
        "categoryKeysJson" TEXT,
        "minQuantity" INTEGER,
        "minPurchasePaise" INTEGER,
        "buyQuantity" INTEGER,
        "getQuantity" INTEGER,
        "startDate" DATETIME NOT NULL,
        "endDate" DATETIME NOT NULL,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "totalDiscountPaise" INTEGER NOT NULL DEFAULT 0,
        "createdById" TEXT NOT NULL,
        "deletedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopSaleReturn"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopSaleReturn" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "shopSaleId" TEXT NOT NULL,
        "returnNumber" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'RETURN',
        "refundAmountPaise" INTEGER NOT NULL,
        "refundMethod" TEXT NOT NULL DEFAULT 'CASH',
        "reason" TEXT NOT NULL,
        "notes" TEXT,
        "exchangeSaleId" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopSaleReturnLine"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopSaleReturnLine" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "returnId" TEXT NOT NULL,
        "lineKey" TEXT NOT NULL,
        "inventoryItemId" TEXT,
        "productName" TEXT NOT NULL,
        "barcode" TEXT,
        "originalQty" REAL NOT NULL,
        "returnQty" REAL NOT NULL,
        "unitPricePaise" INTEGER NOT NULL,
        "lineRefundPaise" INTEGER NOT NULL,
        "isExchangeOut" INTEGER NOT NULL DEFAULT 1,
        "isExchangeIn" INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY ("returnId") REFERENCES "ShopSaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  ensured = true;
}
