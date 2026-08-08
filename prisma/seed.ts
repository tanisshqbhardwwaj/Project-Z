import { PrismaClient } from "@prisma/client";
import { seedExpenseCategories } from "./categories";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed complete — categories are created per organization on org creation.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

export { seedExpenseCategories };
