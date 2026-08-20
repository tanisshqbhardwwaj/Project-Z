-- AlterTable ShopSale
ALTER TABLE "ShopSale" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "customerGstin" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "issueInvoice" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_organizationId_barcode_key" ON "InventoryItem"("organizationId", "barcode");
