import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("ShopSale")`);
  const has = cols.some((c) => c.name === "pricingJson");
  if (!has) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShopSale" ADD COLUMN "pricingJson" TEXT NOT NULL DEFAULT '{}'`
    );
    console.log("Added pricingJson column");
  } else {
    console.log("pricingJson already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
