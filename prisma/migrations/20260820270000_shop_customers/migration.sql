-- Shop customer registry linked to invoices

CREATE TABLE IF NOT EXISTS "ShopCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "gstin" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "lastSaleAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopCustomer_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

-- Added in a follow-up step if missing on existing DBs (see scripts/apply-shop-customers.mjs)
ALTER TABLE "ShopSale" ADD COLUMN "customerId" TEXT
  REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "ShopCustomer_organizationId_phone_key"
  ON "ShopCustomer"("organizationId", "phone");

CREATE INDEX IF NOT EXISTS "ShopCustomer_organizationId_name_idx"
  ON "ShopCustomer"("organizationId", "name");

CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_customerId_idx"
  ON "ShopSale"("organizationId", "customerId");
