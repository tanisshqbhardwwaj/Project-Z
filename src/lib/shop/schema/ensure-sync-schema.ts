import { prisma } from "@/lib/db/prisma";

let ensured = false;

export async function ensureSyncSchema() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SyncMutation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "deviceId" TEXT,
      "kind" TEXT NOT NULL,
      "entityId" TEXT,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SyncMutation_organizationId_appliedAt_idx" ON "SyncMutation"("organizationId", "appliedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SyncMutation_organizationId_kind_idx" ON "SyncMutation"("organizationId", "kind")`
  );
  ensured = true;
}
