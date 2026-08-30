-- Performance indexes, attendance extensions, org add-ons

-- OrgAddon
CREATE TABLE IF NOT EXISTS "OrgAddon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "addonKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OrgAddon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrgAddon_organizationId_addonKey_key" ON "OrgAddon"("organizationId", "addonKey");
CREATE INDEX IF NOT EXISTS "OrgAddon_organizationId_idx" ON "OrgAddon"("organizationId");

-- Staff attendance extensions
ALTER TABLE "StaffMember" ADD COLUMN "attendancePinHash" TEXT;
ALTER TABLE "StaffAttendance" ADD COLUMN "checkInAt" DATETIME;
ALTER TABLE "StaffAttendance" ADD COLUMN "checkOutAt" DATETIME;
ALTER TABLE "StaffAttendance" ADD COLUMN "checkInMethod" TEXT;
ALTER TABLE "StaffAttendance" ADD COLUMN "checkOutMethod" TEXT;
ALTER TABLE "StaffAttendance" ADD COLUMN "geoVerified" BOOLEAN;
ALTER TABLE "StaffAttendance" ADD COLUMN "geoDistanceMeters" REAL;
ALTER TABLE "StaffAttendance" ADD COLUMN "deviceFingerprint" TEXT;

-- New indexes
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_barcode_idx" ON "InventoryItem"("organizationId", "barcode");
CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_updatedAt_idx" ON "InventoryItem"("organizationId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ShopCustomer_organizationId_phone_idx" ON "ShopCustomer"("organizationId", "phone");
CREATE INDEX IF NOT EXISTS "ShopCustomer_organizationId_lastSaleAt_idx" ON "ShopCustomer"("organizationId", "lastSaleAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomerCredit_organizationId_phone_idx" ON "CustomerCredit"("organizationId", "phone");
CREATE INDEX IF NOT EXISTS "CustomerCredit_organizationId_balancePaise_idx" ON "CustomerCredit"("organizationId", "balancePaise");
CREATE INDEX IF NOT EXISTS "CustomerCreditEntry_organizationId_createdAt_idx" ON "CustomerCreditEntry"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_status_createdAt_idx" ON "ShopSale"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_createdAt_idx" ON "ShopPurchase"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ShopPurchase_organizationId_status_purchaseDate_idx" ON "ShopPurchase"("organizationId", "status", "purchaseDate");
CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_deletedAt_expenseDate_idx" ON "ShopExpense"("organizationId", "deletedAt", "expenseDate");
CREATE INDEX IF NOT EXISTS "Notification_userId_organizationId_readAt_idx" ON "Notification"("userId", "organizationId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_organizationId_createdAt_idx" ON "Notification"("userId", "organizationId", "createdAt" DESC);

-- Redundant indexes (unique constraint already covers lookup)
DROP INDEX IF EXISTS "ShopSale_organizationId_billNumber_idx";
