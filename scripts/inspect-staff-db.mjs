import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 8`
  );
  console.log("Recent migrations:", migrations);

  const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info(StaffMember)`);
  console.log(
    "StaffMember columns:",
    cols.map((c) => c.name)
  );
  console.log(
    "Has attendanceBarcode:",
    cols.some((c) => c.name === "attendanceBarcode")
  );
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
