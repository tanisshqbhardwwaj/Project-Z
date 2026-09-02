import "dotenv/config";
import { createPrismaClient } from "./lib/prisma-client.mjs";

const prisma = createPrismaClient();

try {
  const row = await prisma.staffMember.findFirst({
    select: { id: true, attendanceBarcode: true },
  });
  console.log("Turso attendanceBarcode query ok:", row);
} catch (e) {
  console.error("Turso query failed:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
