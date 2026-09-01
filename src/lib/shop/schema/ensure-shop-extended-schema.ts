import { prisma } from "@/lib/db/prisma";

let ensured = false;

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertShopPrismaClient() {
  const delegate = (
    prisma as unknown as { shopPurchase?: { findMany?: unknown } }
  ).shopPurchase;
  if (typeof delegate?.findMany !== "function") {
    throw new Error(
      "Prisma client is out of date (shop models missing). Stop the dev server, run `npx prisma generate`, then restart `npm run dev`."
    );
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${table}")`
  );
  return cols.some((c) => c.name === column);
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return rows.length > 0;
}

export async function ensureShopExtendedSchema() {
  assertShopPrismaClient();
  if (ensured) return;

  if (!(await columnExists("ShopSale", "paidAmountPaise"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShopSale" ADD COLUMN "paidAmountPaise" INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!(await columnExists("ShopSale", "totalCostPaise"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShopSale" ADD COLUMN "totalCostPaise" INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!(await columnExists("ShopSale", "paymentStatus"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShopSale" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PAID'`
    );
  }

  if (!(await columnExists("CustomerCredit", "shopCustomerId"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerCredit" ADD COLUMN "shopCustomerId" TEXT`
    );
  }
  if (!(await columnExists("CustomerCredit", "creditLimitPaise"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerCredit" ADD COLUMN "creditLimitPaise" INTEGER`
    );
  }
  if (!(await columnExists("CustomerCredit", "totalPurchasesPaise"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerCredit" ADD COLUMN "totalPurchasesPaise" INTEGER NOT NULL DEFAULT 0`
    );
  }

  if (!(await tableExists("ShopSupplier"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopSupplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "email" TEXT,
        "address" TEXT,
        "gstNumber" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ShopSupplier_organizationId_name_key"
        ON "ShopSupplier"("organizationId", "name")
    `);
  }

  if (!(await tableExists("ShopPurchase"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopPurchase" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "purchaseDate" DATETIME NOT NULL,
        "billNumber" TEXT,
        "subtotalPaise" INTEGER NOT NULL,
        "discountPaise" INTEGER NOT NULL DEFAULT 0,
        "taxPaise" INTEGER NOT NULL DEFAULT 0,
        "extraChargesPaise" INTEGER NOT NULL DEFAULT 0,
        "totalPaise" INTEGER NOT NULL,
        "paidAmountPaise" INTEGER NOT NULL DEFAULT 0,
        "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "notes" TEXT,
        "idempotencyKey" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("supplierId") REFERENCES "ShopSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopPurchaseItem"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopPurchaseItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "purchaseId" TEXT NOT NULL,
        "inventoryItemId" TEXT,
        "productName" TEXT NOT NULL,
        "quantity" REAL NOT NULL,
        "ratePaise" INTEGER NOT NULL,
        "lineTotalPaise" INTEGER NOT NULL,
        FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("CustomerCreditEntry"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CustomerCreditEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "creditId" TEXT NOT NULL,
        "shopSaleId" TEXT,
        "type" TEXT NOT NULL,
        "amountPaise" INTEGER NOT NULL,
        "balanceAfterPaise" INTEGER NOT NULL,
        "paymentMethod" TEXT,
        "notes" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("creditId") REFERENCES "CustomerCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopExpenseCategory"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopExpenseCategory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isDefault" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopExpense"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopExpense" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        "expenseDate" DATETIME NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "amountPaise" INTEGER NOT NULL,
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        "paidBy" TEXT,
        "expenseType" TEXT NOT NULL DEFAULT 'DAILY',
        "notes" TEXT,
        "receiptHash" TEXT,
        "createdById" TEXT NOT NULL,
        "deletedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("categoryId") REFERENCES "ShopExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await tableExists("ShopRecurringExpense"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopRecurringExpense" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "monthlyAmountPaise" INTEGER NOT NULL,
        "dueDay" INTEGER NOT NULL DEFAULT 1,
        "startDate" DATETIME NOT NULL,
        "endDate" DATETIME,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("categoryId") REFERENCES "ShopExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
  }

  if (!(await columnExists("ShopExpense", "staffId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ShopExpense" ADD COLUMN "staffId" TEXT`);
  }
  if (!(await columnExists("ShopExpense", "staffAdvanceId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ShopExpense" ADD COLUMN "staffAdvanceId" TEXT`);
  }
  if (!(await columnExists("ShopExpense", "payrollId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ShopExpense" ADD COLUMN "payrollId" TEXT`);
  }

  if (!(await columnExists("StaffAdvance", "shopExpenseId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StaffAdvance" ADD COLUMN "shopExpenseId" TEXT`);
  }
  if (!(await columnExists("StaffPayroll", "shopExpenseId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StaffPayroll" ADD COLUMN "shopExpenseId" TEXT`);
  }

  if (!(await tableExists("ShopPurchasePayment"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopPurchasePayment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "purchaseId" TEXT NOT NULL,
        "amountPaise" INTEGER NOT NULL,
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        "notes" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ShopPurchasePayment_organizationId_purchaseId_createdAt_idx"
        ON "ShopPurchasePayment"("organizationId", "purchaseId", "createdAt" DESC)
    `);
  }

  ensured = true;
}
