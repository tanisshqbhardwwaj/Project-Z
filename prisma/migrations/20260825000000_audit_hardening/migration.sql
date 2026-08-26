-- Audit hardening: lastLoginAt tracking + bill-number uniqueness + SyncMutation table.

-- P1-3: track last login (idempotent via turso-migrate skip on duplicate column)
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;

-- Desktop/Android sync idempotency ledger (runtime ensure-sync-schema also creates this)
CREATE TABLE IF NOT EXISTS "SyncMutation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "deviceId" TEXT,
  "kind" TEXT NOT NULL,
  "entityId" TEXT,
  "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SyncMutation_organizationId_appliedAt_idx" ON "SyncMutation"("organizationId", "appliedAt");
CREATE INDEX IF NOT EXISTS "SyncMutation_organizationId_kind_idx" ON "SyncMutation"("organizationId", "kind");

-- P0-5: per-org bill numbers must be unique when set
DROP INDEX IF EXISTS "ShopSale_organizationId_billNumber_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "ShopSale_organizationId_billNumber_key" ON "ShopSale"("organizationId", "billNumber");
