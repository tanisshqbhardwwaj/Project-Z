-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "size" TEXT;

-- Copy legacy SKU values into size for existing products
UPDATE "InventoryItem" SET "size" = "sku" WHERE "sku" IS NOT NULL AND "size" IS NULL;
