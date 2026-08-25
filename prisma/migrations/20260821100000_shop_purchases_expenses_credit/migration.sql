-- Shop purchases, expenses, credit ledger, sale payment fields

-- New enums handled as TEXT in SQLite

ALTER TABLE "ShopSale" ADD COLUMN "paidAmountPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopSale" ADD COLUMN "totalCostPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopSale" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PAID';

CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_paymentStatus_idx"
  ON "ShopSale"("organizationId", "paymentStatus");

ALTER TABLE "CustomerCredit" ADD COLUMN "shopCustomerId" TEXT;
ALTER TABLE "CustomerCredit" ADD COLUMN "creditLimitPaise" INTEGER;
ALTER TABLE "CustomerCredit" ADD COLUMN "totalPurchasesPaise" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "CustomerCredit_organizationId_shopCustomerId_idx"
  ON "CustomerCredit"("organizationId", "shopCustomerId");

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
);

CREATE INDEX IF NOT EXISTS "CustomerCreditEntry_organizationId_creditId_createdAt_idx"
  ON "CustomerCreditEntry"("organizationId", "creditId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomerCreditEntry_shopSaleId_idx"
  ON "CustomerCreditEntry"("shopSaleId");

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopSupplier_organizationId_name_key"
  ON "ShopSupplier"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "ShopSupplier_organizationId_idx"
  ON "ShopSupplier"("organizationId");

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopPurchase_organizationId_idempotencyKey_key"
  ON "ShopPurchase"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_purchaseDate_idx"
  ON "ShopPurchase"("organizationId", "purchaseDate" DESC);
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_supplierId_idx"
  ON "ShopPurchase"("organizationId", "supplierId");
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_paymentStatus_idx"
  ON "ShopPurchase"("organizationId", "paymentStatus");
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_status_idx"
  ON "ShopPurchase"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "ShopPurchaseItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "purchaseId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "productName" TEXT NOT NULL,
  "quantity" REAL NOT NULL,
  "ratePaise" INTEGER NOT NULL,
  "lineTotalPaise" INTEGER NOT NULL,
  FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShopPurchaseItem_purchaseId_idx"
  ON "ShopPurchaseItem"("purchaseId");
CREATE INDEX IF NOT EXISTS "ShopPurchaseItem_inventoryItemId_idx"
  ON "ShopPurchaseItem"("inventoryItemId");

CREATE TABLE IF NOT EXISTS "ShopExpenseCategory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopExpenseCategory_organizationId_name_key"
  ON "ShopExpenseCategory"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "ShopExpenseCategory_organizationId_idx"
  ON "ShopExpenseCategory"("organizationId");

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
);

CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_expenseDate_idx"
  ON "ShopExpense"("organizationId", "expenseDate" DESC);
CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_categoryId_idx"
  ON "ShopExpense"("organizationId", "categoryId");
CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_expenseType_idx"
  ON "ShopExpense"("organizationId", "expenseType");

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
);

CREATE INDEX IF NOT EXISTS "ShopRecurringExpense_organizationId_isActive_idx"
  ON "ShopRecurringExpense"("organizationId", "isActive");
