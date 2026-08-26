import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

/** Idempotent — adds lastActiveAt if missing (Turso/local drift). */
export async function ensureOrgSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const cols = (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("Organization")`
      )) as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "lastActiveAt")) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Organization" ADD COLUMN "lastActiveAt" DATETIME`
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

const touchCache = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** Throttled org activity ping — at most once per hour per org. */
export async function touchOrganizationActivity(organizationId: string) {
  const now = Date.now();
  const last = touchCache.get(organizationId) ?? 0;
  if (now - last < TOUCH_INTERVAL_MS) return;
  touchCache.set(organizationId, now);
  try {
    await ensureOrgSchema();
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET "lastActiveAt" = ? WHERE "id" = ?`,
      new Date().toISOString(),
      organizationId
    );
  } catch {
    touchCache.delete(organizationId);
  }
}
