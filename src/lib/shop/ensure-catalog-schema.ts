import { prisma } from "@/lib/db/prisma";

const REQUIRED_MODELS = [
  "shopProduct",
  "shopCategory",
  "shopRecurringExpenseOccurrence",
] as const;

/** Prisma Client must be regenerated after schema changes (npx prisma generate). */
export function assertCatalogPrismaClient() {
  const client = prisma as unknown as Record<
    string,
    { findMany?: unknown } | undefined
  >;
  const missing = REQUIRED_MODELS.filter(
    (m) => typeof client[m]?.findMany !== "function"
  );
  if (missing.length > 0) {
    throw new Error(
      `Prisma client is out of date (${missing.join(", ")} missing). Stop the dev server, run \`npx prisma generate\`, then restart \`npm run dev\`.`
    );
  }
}

/** Schema is applied with `prisma migrate deploy`. Kept as a client-generation guard. */
export async function ensureCatalogSchema() {
  assertCatalogPrismaClient();
}
