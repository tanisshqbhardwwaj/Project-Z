import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

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
