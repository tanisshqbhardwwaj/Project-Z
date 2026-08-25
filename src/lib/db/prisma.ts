import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { wrapLibSqlAdapter } from "@/lib/db/libsql-int64";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInt64Coerce?: boolean;
  prismaInt64CoerceV2?: boolean;
};

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  const log: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  if (tursoUrl && tursoToken) {
    const factory = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
    const connect = factory.connect.bind(factory);
    factory.connect = async () => wrapLibSqlAdapter(await connect());
    return new PrismaClient({ adapter: factory, log });
  }

  return new PrismaClient({ log });
}

function getClient() {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaInt64CoerceV2) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaInt64Coerce = true;
    globalForPrisma.prismaInt64CoerceV2 = true;
  }
  return globalForPrisma.prisma;
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
