import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rows = await prisma.shopOffer.findMany({
  where: { deletedAt: null },
  orderBy: { createdAt: "desc" },
});

for (const r of rows) {
  console.log(
    JSON.stringify(
      {
        name: r.name,
        discountType: r.discountType,
        discountValue: r.discountValue,
        productIdsJson: r.productIdsJson,
        categoryKeysJson: r.categoryKeysJson,
        minQuantity: r.minQuantity,
        minPurchasePaise: r.minPurchasePaise?.toString() ?? null,
        buyQuantity: r.buyQuantity,
        getQuantity: r.getQuantity,
        isActive: r.isActive,
        priority: r.priority,
        start: r.startDate,
        end: r.endDate,
      },
      null,
      2
    )
  );
}

await prisma.$disconnect();
