import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

/** Idempotent — adds accessExpiresAt on Organization when migrations lag behind code. */
export async function ensureOrgBillingSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const cols = (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("Organization")`
      )) as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "accessExpiresAt")) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Organization" ADD COLUMN "accessExpiresAt" DATETIME`
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
