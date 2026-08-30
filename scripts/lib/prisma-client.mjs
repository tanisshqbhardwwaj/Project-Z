import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Same connection logic as src/lib/db/prisma.ts */
export function createPrismaClient() {
  return new PrismaClient();
}
