import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { wrapLibSqlAdapter } from "@/lib/db/libsql-int64";
import { recordQueryDuration } from "@/lib/db/query-metrics";
import { DEFAULT_INTERACTIVE_TX_OPTIONS } from "@/lib/db/transaction-options";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInt64Coerce?: boolean;
  prismaInt64CoerceV2?: boolean;
  prismaInteractiveTxV1?: boolean;
};

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  const log: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  let base: PrismaClient;
  if (tursoUrl && tursoToken) {
    const factory = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
    const connect = factory.connect.bind(factory);
    factory.connect = async () => wrapLibSqlAdapter(await connect());
    base = new PrismaClient({ adapter: factory, log });
  } else {
    base = new PrismaClient({ log });
  }

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const start = performance.now();
          try {
            return await query(args);
          } finally {
            recordQueryDuration(performance.now() - start);
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

function withInteractiveTxDefaults(client: PrismaClient): PrismaClient {
  const runTransaction = client.$transaction.bind(client);
  client.$transaction = ((arg: unknown, options?: unknown) => {
    if (typeof arg === "function") {
      return runTransaction(arg, {
        ...DEFAULT_INTERACTIVE_TX_OPTIONS,
        ...(options as Record<string, unknown> | undefined),
      });
    }
    return runTransaction(arg as never, options as never);
  }) as typeof client.$transaction;
  return client;
}

function getClient(): PrismaClient {
  if (
    !globalForPrisma.prisma ||
    !globalForPrisma.prismaInt64CoerceV2 ||
    !globalForPrisma.prismaInteractiveTxV1
  ) {
    globalForPrisma.prisma = withInteractiveTxDefaults(createPrismaClient());
    globalForPrisma.prismaInt64Coerce = true;
    globalForPrisma.prismaInt64CoerceV2 = true;
    globalForPrisma.prismaInteractiveTxV1 = true;
  }
  return globalForPrisma.prisma as PrismaClient;
}

export const prisma = getClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}
