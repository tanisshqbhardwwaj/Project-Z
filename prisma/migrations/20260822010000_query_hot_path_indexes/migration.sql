-- Hot-path indexes only. No table/column changes.
-- SQLite CREATE INDEX is online and safe to re-run (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_status_idx" ON "OrganizationMember"("userId", "status");
CREATE INDEX IF NOT EXISTS "StaffMember_userId_idx" ON "StaffMember"("userId");

CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_billNumber_idx" ON "ShopSale"("organizationId", "billNumber");
CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_salesBoyName_createdAt_idx" ON "ShopSale"("organizationId", "salesBoyName", "createdAt");
CREATE INDEX IF NOT EXISTS "ShopExpense_organizationId_deletedAt_idx" ON "ShopExpense"("organizationId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Project_organizationId_deletedAt_idx" ON "Project"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_deletedAt_idx" ON "Expense"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_deletedAt_idx" ON "Payment"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Vendor_organizationId_deletedAt_idx" ON "Vendor"("organizationId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Document_projectId_idx" ON "Document"("projectId");
CREATE INDEX IF NOT EXISTS "Document_expenseId_idx" ON "Document"("expenseId");
