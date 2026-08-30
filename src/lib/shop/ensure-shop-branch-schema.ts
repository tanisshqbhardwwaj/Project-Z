import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

function deriveDefaultCode(orgName: string | null): string {
  const words = (orgName ?? "MAIN")
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, 6);
  }
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 6);
  return "MAIN";
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("${table}")`
  )) as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

async function ensureDefaultBranchForOrg(organizationId: string): Promise<string> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM "ShopBranch" WHERE "organizationId" = ? AND "isActive" = 1 ORDER BY "isDefault" DESC, "createdAt" ASC LIMIT 1`,
    organizationId
  )) as Array<{ id: string }>;
  if (rows[0]?.id) return rows[0].id;

  const orgRows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM "Organization" WHERE id = ?`,
    organizationId
  )) as Array<{ name: string }>;
  const orgName = orgRows[0]?.name ?? null;
  const id = randomUUID();
  const now = new Date().toISOString();
  const code = deriveDefaultCode(orgName);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ShopBranch" ("id", "organizationId", "name", "code", "isDefault", "isActive", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
    id,
    organizationId,
    "Main store",
    code,
    now,
    now
  );
  return id;
}

async function backfillBranchIds(organizationId: string, branchId: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE "ShopSale" SET "branchId" = ? WHERE "organizationId" = ? AND "branchId" IS NULL`,
    branchId,
    organizationId
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "ShopHeldBill" SET "branchId" = ? WHERE "organizationId" = ? AND "branchId" IS NULL`,
    branchId,
    organizationId
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "ShopBillCounter" SET "branchId" = ? WHERE "organizationId" = ? AND "branchId" IS NULL`,
    branchId,
    organizationId
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "InventoryItem" SET "branchId" = ? WHERE "organizationId" = ? AND "branchId" IS NULL`,
    branchId,
    organizationId
  );
}

/** Assign null branchId rows to the org default branch — safe to call on every billing request. */
export async function backfillOrgBranchIds(organizationId: string) {
  await ensureShopBranchSchema(organizationId);
  const branchId = await ensureDefaultBranchForOrg(organizationId);
  await backfillBranchIds(organizationId, branchId);
  return branchId;
}

/** Idempotent — creates ShopBranch table, backfills branchId, rebuilds indexes. */
export async function ensureShopBranchSchema(organizationId?: string) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "ShopBranch" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "isDefault" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "address" TEXT,
          "phone" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "ShopBranch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopBranch_organizationId_code_key" ON "ShopBranch"("organizationId", "code")`
      );

      for (const table of [
        "ShopSale",
        "ShopHeldBill",
        "ShopBillCounter",
        "ShopCustomer",
        "InventoryItem",
      ]) {
        if (!(await columnExists(table, "branchId"))) {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "${table}" ADD COLUMN "branchId" TEXT`
          );
        }
      }

      const orgIds = organizationId
        ? [organizationId]
        : (
            (await prisma.$queryRawUnsafe(
              `SELECT DISTINCT "organizationId" AS id FROM "Organization"`
            )) as Array<{ id: string }>
          ).map((r) => r.id);

      for (const orgId of orgIds) {
        const branchId = await ensureDefaultBranchForOrg(orgId);
        await backfillBranchIds(orgId, branchId);
      }

      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ShopSale_organizationId_branchId_createdAt_idx" ON "ShopSale"("organizationId", "branchId", "createdAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "InventoryItem_organizationId_branchId_idx" ON "InventoryItem"("organizationId", "branchId")`
      );

      await prisma.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "ShopBillCounter_organizationId_fiscalYear_key"`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopBillCounter_organizationId_branchId_fiscalYear_key" ON "ShopBillCounter"("organizationId", "branchId", "fiscalYear")`
      );

      await prisma.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "ShopHeldBill_organizationId_holdNumber_key"`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopHeldBill_organizationId_branchId_holdNumber_key" ON "ShopHeldBill"("organizationId", "branchId", "holdNumber")`
      );

      await prisma.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "ShopCustomer_organizationId_phone_key"`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopCustomer_org_phone_shared_key" ON "ShopCustomer"("organizationId", "phone") WHERE "branchId" IS NULL AND "phone" IS NOT NULL`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ShopCustomer_org_branch_phone_key" ON "ShopCustomer"("organizationId", "branchId", "phone") WHERE "branchId" IS NOT NULL AND "phone" IS NOT NULL`
      );
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
