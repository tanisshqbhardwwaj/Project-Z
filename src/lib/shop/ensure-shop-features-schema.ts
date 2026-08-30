import { prisma } from "@/lib/db/prisma";

const FEATURE_MODELS = ["shopHeldBill", "shopOffer", "shopSaleReturn"] as const;

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertShopFeaturesPrismaClient() {
  const p = prisma as unknown as Record<string, { findMany?: unknown } | undefined>;
  const missing = FEATURE_MODELS.filter((m) => typeof p[m]?.findMany !== "function");
  if (missing.length > 0) {
    throw new Error(
      `Prisma client is out of date (${missing.join(", ")} missing). Stop the dev server, run \`npx prisma generate\`, then restart \`npm run dev\`.`
    );
  }
}

/** Schema is applied with `prisma migrate deploy`. Kept as a client-generation guard. */
export async function ensureShopFeaturesSchema() {
  assertShopFeaturesPrismaClient();
}
