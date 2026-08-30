import type { BusinessType, PrismaClient, ShopSector } from "@prisma/client";
import { getBusinessTypeConfig, isShopVertical } from "@/lib/org/business-type";
import { getShopSectorConfig } from "@/lib/org/shop-sector";

export async function seedExpenseCategories(
  prisma: PrismaClient,
  organizationId: string,
  businessType: BusinessType = "CONTRACTOR",
  shopSector?: ShopSector | null
) {
  const categories =
    businessType === "SERVICE"
      ? getBusinessTypeConfig("SERVICE").expenseCategories
      : businessType === "SHOPKEEPER"
        ? getShopSectorConfig(shopSector).expenseCategories
        : getBusinessTypeConfig(businessType).expenseCategories;

  for (const name of categories) {
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
