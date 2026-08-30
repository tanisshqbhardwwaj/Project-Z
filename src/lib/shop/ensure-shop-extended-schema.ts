import { prisma } from "@/lib/db/prisma";

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertShopPrismaClient() {
  const delegate = (
    prisma as unknown as { shopPurchase?: { findMany?: unknown } }
  ).shopPurchase;
  if (typeof delegate?.findMany !== "function") {
    throw new Error(
      "Prisma client is out of date (shop models missing). Stop the dev server, run `npx prisma generate`, then restart `npm run dev`."
    );
  }
}

/** Schema is applied with `prisma migrate deploy`. Kept as a client-generation guard. */
export async function ensureShopExtendedSchema() {
  assertShopPrismaClient();
}
