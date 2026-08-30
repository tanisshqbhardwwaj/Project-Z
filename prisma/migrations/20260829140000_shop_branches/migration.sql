-- ShopBranch + branchId columns (SQLite). Backfill runs via ensure-shop-branch-schema.ts.
CREATE TABLE "ShopBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopBranch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ShopBranch_organizationId_code_key" ON "ShopBranch"("organizationId", "code");
CREATE INDEX "ShopBranch_organizationId_isActive_idx" ON "ShopBranch"("organizationId", "isActive");

ALTER TABLE "ShopSale" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ShopHeldBill" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ShopBillCounter" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ShopCustomer" ADD COLUMN "branchId" TEXT;

CREATE INDEX "ShopSale_organizationId_branchId_createdAt_idx" ON "ShopSale"("organizationId", "branchId", "createdAt");
CREATE INDEX "ShopHeldBill_organizationId_branchId_status_expiresAt_idx" ON "ShopHeldBill"("organizationId", "branchId", "status", "expiresAt");
CREATE INDEX "ShopCustomer_organizationId_branchId_idx" ON "ShopCustomer"("organizationId", "branchId");
