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
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopHeldBill_organizationId_holdNumber_key" ON "ShopHeldBill"("organizationId", "holdNumber");
CREATE INDEX IF NOT EXISTS "ShopHeldBill_organizationId_status_expiresAt_idx" ON "ShopHeldBill"("organizationId", "status", "expiresAt");

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
);
CREATE INDEX IF NOT EXISTS "ShopOffer_organizationId_isActive_startDate_endDate_idx" ON "ShopOffer"("organizationId", "isActive", "startDate", "endDate");

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
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopSaleReturn_organizationId_returnNumber_key" ON "ShopSaleReturn"("organizationId", "returnNumber");
CREATE INDEX IF NOT EXISTS "ShopSaleReturn_organizationId_shopSaleId_idx" ON "ShopSaleReturn"("organizationId", "shopSaleId");
CREATE INDEX IF NOT EXISTS "ShopSaleReturn_organizationId_createdAt_idx" ON "ShopSaleReturn"("organizationId", "createdAt" DESC);

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
);
CREATE INDEX IF NOT EXISTS "ShopSaleReturnLine_returnId_idx" ON "ShopSaleReturnLine"("returnId");
