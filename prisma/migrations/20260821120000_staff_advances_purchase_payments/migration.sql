ALTER TABLE "StaffAdvance" ADD COLUMN "shopExpenseId" TEXT;
ALTER TABLE "StaffPayroll" ADD COLUMN "shopExpenseId" TEXT;

ALTER TABLE "ShopExpense" ADD COLUMN "staffId" TEXT;
ALTER TABLE "ShopExpense" ADD COLUMN "staffAdvanceId" TEXT;
ALTER TABLE "ShopExpense" ADD COLUMN "payrollId" TEXT;

CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_staffId_idx"
  ON "ShopExpense"("organizationId", "staffId");
CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_payrollId_idx"
  ON "ShopExpense"("organizationId", "payrollId");

CREATE TABLE IF NOT EXISTS "ShopPurchasePayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "amountPaise" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShopPurchasePayment_organizationId_purchaseId_createdAt_idx"
  ON "ShopPurchasePayment"("organizationId", "purchaseId", "createdAt" DESC);
