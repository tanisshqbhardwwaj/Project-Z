-- Product → variant architecture, org-scoped categories, return/exchange receipts,
-- recurring expense occurrences and staff sales commission.

-- ── Parent product ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ShopProduct" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "brand" TEXT,
  "categoryKey" TEXT,
  "subCategoryKey" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "hasVariants" BOOLEAN NOT NULL DEFAULT false,
  "variantAxis" TEXT,
  "supplierName" TEXT,
  "batchNo" TEXT,
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_name_idx" ON "ShopProduct"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_categoryKey_idx" ON "ShopProduct"("organizationId", "categoryKey");
CREATE INDEX IF NOT EXISTS "ShopProduct_organizationId_deletedAt_idx" ON "ShopProduct"("organizationId", "deletedAt");

-- ── Org-scoped product categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ShopCategory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "parentKey" TEXT,
  "sectorKey" TEXT,
  "isCustom" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopCategory_organizationId_key_key" ON "ShopCategory"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "ShopCategory_organizationId_parentKey_idx" ON "ShopCategory"("organizationId", "parentKey");
CREATE INDEX IF NOT EXISTS "ShopCategory_organizationId_isActive_idx" ON "ShopCategory"("organizationId", "isActive");

-- ── InventoryItem becomes the variant / SKU row ──────────────────────────────
ALTER TABLE "InventoryItem" ADD COLUMN "productId" TEXT REFERENCES "ShopProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD COLUMN "color" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "variantLabel" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "supplierName" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "batchNo" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_productId_idx" ON "InventoryItem"("organizationId", "productId");
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_sku_idx" ON "InventoryItem"("organizationId", "sku");

-- ── Return / exchange receipts ──────────────────────────────────────────────
ALTER TABLE "ShopSaleReturn" ADD COLUMN "returnValuePaise" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "exchangeValuePaise" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "additionalPaidPaise" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "customerId" TEXT;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "customerName" TEXT;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "staffId" TEXT REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopSaleReturn" ADD COLUMN "staffName" TEXT;
CREATE INDEX IF NOT EXISTS "ShopSaleReturn_organizationId_staffId_idx" ON "ShopSaleReturn"("organizationId", "staffId");

-- Existing rows stored only the net refund; treat it as the returned goods value.
UPDATE "ShopSaleReturn" SET "returnValuePaise" = "refundAmountPaise" WHERE "returnValuePaise" = 0;

ALTER TABLE "ShopSaleReturnLine" ADD COLUMN "productId" TEXT;
ALTER TABLE "ShopSaleReturnLine" ADD COLUMN "size" TEXT;
ALTER TABLE "ShopSaleReturnLine" ADD COLUMN "variantLabel" TEXT;
ALTER TABLE "ShopSaleReturnLine" ADD COLUMN "sku" TEXT;
ALTER TABLE "ShopSaleReturnLine" ADD COLUMN "unitLabel" TEXT;

-- ── Recurring expense lifecycle ─────────────────────────────────────────────
ALTER TABLE "ShopRecurringExpense" ADD COLUMN "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ShopRecurringExpense" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "ShopRecurringExpense" ADD COLUMN "notes" TEXT;
ALTER TABLE "ShopRecurringExpense" ADD COLUMN "deletedAt" DATETIME;
CREATE INDEX IF NOT EXISTS "ShopRecurringExpense_organizationId_deletedAt_idx" ON "ShopRecurringExpense"("organizationId", "deletedAt");

CREATE TABLE IF NOT EXISTS "ShopRecurringExpenseOccurrence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "recurringId" TEXT NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "dueDate" DATETIME NOT NULL,
  "amountPaise" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPCOMING',
  "paidAt" DATETIME,
  "paidAmountPaise" BIGINT,
  "paymentMethod" TEXT,
  "shopExpenseId" TEXT,
  "notes" TEXT,
  "remindedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("recurringId") REFERENCES "ShopRecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_recurringId_periodYear_periodMonth_key" ON "ShopRecurringExpenseOccurrence"("recurringId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_organizationId_status_dueDate_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "ShopRecurringExpenseOccurrence_organizationId_dueDate_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "dueDate");

-- ── Staff profile + sales commission ────────────────────────────────────────
ALTER TABLE "StaffMember" ADD COLUMN "email" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "roleKey" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "paymentFrequency" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "commissionType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "StaffMember" ADD COLUMN "commissionPercent" REAL;
ALTER TABLE "StaffMember" ADD COLUMN "commissionAmountPaise" BIGINT;

ALTER TABLE "ShopSale" ADD COLUMN "staffId" TEXT REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_staffId_createdAt_idx" ON "ShopSale"("organizationId", "staffId", "createdAt");

ALTER TABLE "StaffPayroll" ADD COLUMN "basePaise" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "StaffPayroll" ADD COLUMN "commissionPaise" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "StaffPayroll" ADD COLUMN "commissionSalesPaise" BIGINT NOT NULL DEFAULT 0;
