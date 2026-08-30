-- CreateTable
CREATE TABLE "ShopCashCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "countDate" DATETIME NOT NULL,
    "countType" TEXT NOT NULL DEFAULT 'CLOSING',
    "denominations" JSONB NOT NULL,
    "totalPaise" BIGINT NOT NULL,
    "openingFloatPaise" BIGINT NOT NULL DEFAULT 0,
    "expectedPaise" BIGINT,
    "variancePaise" BIGINT,
    "cashSalesPaise" BIGINT NOT NULL DEFAULT 0,
    "cashExpensesPaise" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopCashCount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopCashCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ShopCashCount_organizationId_countDate_countType_key" ON "ShopCashCount"("organizationId", "countDate", "countType");
CREATE INDEX "ShopCashCount_organizationId_countDate_idx" ON "ShopCashCount"("organizationId", "countDate" DESC);
