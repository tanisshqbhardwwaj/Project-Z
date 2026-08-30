-- Add SERVICE business type support, founder access expiry, per-branch inventory

-- Organization: founder-set hard stop date
ALTER TABLE "Organization" ADD COLUMN "accessExpiresAt" DATETIME;

-- InventoryItem: per-branch stock
ALTER TABLE "InventoryItem" ADD COLUMN "branchId" TEXT;

CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_branchId_idx"
  ON "InventoryItem"("organizationId", "branchId");

-- Backfill existing SERVICES-sector shopkeepers to SERVICE business type
UPDATE "Organization"
SET "businessType" = 'SERVICE'
WHERE "businessType" = 'SHOPKEEPER' AND "shopSector" = 'SERVICES';

-- Backfill inventory stock to default branch per org
UPDATE "InventoryItem"
SET "branchId" = (
  SELECT b.id FROM "ShopBranch" b
  WHERE b."organizationId" = "InventoryItem"."organizationId"
  ORDER BY b."isDefault" DESC, b."createdAt" ASC
  LIMIT 1
)
WHERE "branchId" IS NULL;
