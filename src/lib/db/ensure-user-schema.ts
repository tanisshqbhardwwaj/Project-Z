import { prisma } from "@/lib/db/prisma";

let schemaReady: Promise<void> | null = null;

/** Idempotent — adds lastLoginAt if missing (Turso/local drift). */
export async function ensureUserSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const cols = (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("User")`
      )) as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "lastLoginAt")) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME`
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}
