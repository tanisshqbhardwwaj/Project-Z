import { prisma } from "@/lib/db/prisma";

let ensured = false;

const REQUIRED_MODELS = [
  "shopProduct",
  "shopCategory",
  "shopRecurringExpenseOccurrence",
] as const;

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertCatalogPrismaClient() {
  const client = prisma as unknown as Record<
    string,
    { findMany?: unknown } | undefined
  >;
  const missing = REQUIRED_MODELS.filter(
    (m) => typeof client[m]?.findMany !== "function"
  );
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

async function columnExists(table: string, column: string): Promise<boolean> {
  const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${table}")`
  );
  return cols.some((c) => c.name === column);
}

async function addColumn(table: string, column: string, definition: string) {
  if (await columnExists(table, column)) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`
  );
}

/**
 * Brings a deployed SQLite/Turso database up to the product-variant, category,
 * return-receipt, recurring-occurrence and staff-commission shape. Mirrors
 * migration 20260823000000 so hosted databases that were provisioned with
 * `db push` rather than `migrate deploy` still work.
 */
export async function ensureCatalogSchema() {
  assertCatalogPrismaClient();
  if (ensured) return;

  if (!(await tableExists("ShopProduct"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopProduct" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "brand" TEXT,
        "categoryKey" TEXT,
        "subCategoryKey" TEXT,
        "unit" TEXT NOT NULL DEFAULT 'pcs',
        "hasVariants" INTEGER NOT NULL DEFAULT 0,
        "variantAxis" TEXT,
        "supplierName" TEXT,
        "batchNo" TEXT,
        "attributes" TEXT NOT NULL DEFAULT '{}',
        "notes" TEXT,
        "createdById" TEXT NOT NULL,
        "deletedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_name_idx" ON "ShopProduct"("organizationId", "name")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_categoryKey_idx" ON "ShopProduct"("organizationId", "categoryKey")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_deletedAt_idx" ON "ShopProduct"("organizationId", "deletedAt")`
    );
  }

  if (!(await tableExists("ShopCategory"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopCategory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "parentKey" TEXT,
        "sectorKey" TEXT,
        "isCustom" INTEGER NOT NULL DEFAULT 0,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "ShopCategory_organizationId_key_key" ON "ShopCategory"("organizationId", "key")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopCategory_organizationId_parentKey_idx" ON "ShopCategory"("organizationId", "parentKey")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopCategory_organizationId_isActive_idx" ON "ShopCategory"("organizationId", "isActive")`
    );
  }

  await addColumn("InventoryItem", "productId", "TEXT");
  await addColumn("InventoryItem", "color", "TEXT");
  await addColumn("InventoryItem", "variantLabel", "TEXT");
  await addColumn("InventoryItem", "supplierName", "TEXT");
  await addColumn("InventoryItem", "batchNo", "TEXT");
  await addColumn("InventoryItem", "attributes", "TEXT NOT NULL DEFAULT '{}'");
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_productId_idx" ON "InventoryItem"("organizationId", "productId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_sku_idx" ON "InventoryItem"("organizationId", "sku")`
  );

  await addColumn("ShopSaleReturn", "returnValuePaise", "INTEGER NOT NULL DEFAULT 0");
  await addColumn("ShopSaleReturn", "exchangeValuePaise", "INTEGER NOT NULL DEFAULT 0");
  await addColumn("ShopSaleReturn", "additionalPaidPaise", "INTEGER NOT NULL DEFAULT 0");
  await addColumn("ShopSaleReturn", "customerId", "TEXT");
  await addColumn("ShopSaleReturn", "customerName", "TEXT");
  await addColumn("ShopSaleReturn", "customerPhone", "TEXT");
  await addColumn("ShopSaleReturn", "staffId", "TEXT");
  await addColumn("ShopSaleReturn", "staffName", "TEXT");

  await addColumn("ShopSaleReturnLine", "productId", "TEXT");
  await addColumn("ShopSaleReturnLine", "size", "TEXT");
  await addColumn("ShopSaleReturnLine", "variantLabel", "TEXT");
  await addColumn("ShopSaleReturnLine", "sku", "TEXT");
  await addColumn("ShopSaleReturnLine", "unitLabel", "TEXT");

  await addColumn(
    "ShopRecurringExpense",
    "reminderDaysBefore",
    "INTEGER NOT NULL DEFAULT 3"
  );
  await addColumn("ShopRecurringExpense", "paymentMethod", "TEXT");
  await addColumn("ShopRecurringExpense", "notes", "TEXT");
  await addColumn("ShopRecurringExpense", "deletedAt", "DATETIME");

  if (!(await tableExists("ShopRecurringExpenseOccurrence"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopRecurringExpenseOccurrence" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "recurringId" TEXT NOT NULL,
        "periodYear" INTEGER NOT NULL,
        "periodMonth" INTEGER NOT NULL,
        "dueDate" DATETIME NOT NULL,
        "amountPaise" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'UPCOMING',
        "paidAt" DATETIME,
        "paidAmountPaise" INTEGER,
        "paymentMethod" TEXT,
        "shopExpenseId" TEXT,
        "notes" TEXT,
        "remindedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("recurringId") REFERENCES "ShopRecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_recurringId_periodYear_periodMonth_key" ON "ShopRecurringExpenseOccurrence"("recurringId", "periodYear", "periodMonth")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_organizationId_status_dueDate_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "status", "dueDate")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_organizationId_dueDate_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "dueDate")`
    );
  }

  await addColumn("StaffMember", "email", "TEXT");
  await addColumn("StaffMember", "roleKey", "TEXT");
  await addColumn("StaffMember", "paymentFrequency", "TEXT");
  await addColumn("StaffMember", "commissionType", "TEXT NOT NULL DEFAULT 'NONE'");
  await addColumn("StaffMember", "commissionPercent", "REAL");
  await addColumn("StaffMember", "commissionAmountPaise", "INTEGER");
  await addColumn("StaffMember", "accessJson", "TEXT NOT NULL DEFAULT '{}'");
  await addColumn("StaffMember", "cashierCode", "TEXT");
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "StaffMember_organizationId_cashierCode_key" ON "StaffMember"("organizationId", "cashierCode")`
  );

  await addColumn("ShopSale", "staffId", "TEXT");
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_staffId_createdAt_idx" ON "ShopSale"("organizationId", "staffId", "createdAt")`
  );

  await addColumn("StaffPayroll", "basePaise", "INTEGER NOT NULL DEFAULT 0");
  await addColumn("StaffPayroll", "commissionPaise", "INTEGER NOT NULL DEFAULT 0");
  await addColumn(
    "StaffPayroll",
    "commissionSalesPaise",
    "INTEGER NOT NULL DEFAULT 0"
  );

  ensured = true;
}
