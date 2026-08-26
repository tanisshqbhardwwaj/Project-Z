-- Atomic per-org per-fiscal-year bill sequence counter.
CREATE TABLE "ShopBillCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShopBillCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ShopBillCounter_organizationId_fiscalYear_key" ON "ShopBillCounter"("organizationId", "fiscalYear");
