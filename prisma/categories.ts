import { PrismaClient } from "@prisma/client";

const DEFAULT_CATEGORIES = [
  "Paint",
  "Labour",
  "Material",
  "Transport",
  "Equipment",
  "Electricity",
  "Food",
  "Accommodation",
  "Fuel",
  "Tools",
  "Contractor",
  "Miscellaneous",
];

export async function seedExpenseCategories(
  prisma: PrismaClient,
  organizationId: string
) {
  for (const name of DEFAULT_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: {
        organizationId_name: { organizationId, name },
      },
      create: {
        organizationId,
        name,
        isDefault: true,
      },
      update: {},
    });
  }
}
