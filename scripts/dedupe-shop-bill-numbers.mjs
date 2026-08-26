/**
 * One-time fix: assign new bill numbers to duplicate ShopSale rows (keeps oldest per org+bill).
 * Run: node --env-file=.env scripts/dedupe-shop-bill-numbers.mjs
 */
import "dotenv/config";
import { prisma } from "../src/lib/db/prisma.ts";
import { nextShopBillNumber } from "../src/lib/shop/bill-number.ts";

const dupes = await prisma.$queryRawUnsafe(`
  SELECT "organizationId", "billNumber", GROUP_CONCAT(id) as ids
  FROM "ShopSale"
  WHERE "billNumber" IS NOT NULL AND TRIM("billNumber") != ''
  GROUP BY 1, 2
  HAVING COUNT(*) > 1
`);

if (dupes.length === 0) {
  console.log("No duplicate bill numbers.");
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`Found ${dupes.length} duplicate bill number group(s).`);

for (const group of dupes) {
  const ids = String(group.ids).split(",");
  const rows = await prisma.shopSale.findMany({
    where: { id: { in: ids } },
    select: { id: true, createdAt: true, billNumber: true, staffId: true },
    orderBy: { createdAt: "asc" },
  });
  const [, ...renumber] = rows;
  for (const sale of renumber) {
    await prisma.$transaction(async (tx) => {
      const staff = sale.staffId
        ? await tx.staffMember.findUnique({
            where: { id: sale.staffId },
            select: { cashierCode: true },
          })
        : null;
      const newBill = await nextShopBillNumber(
        tx,
        group.organizationId,
        staff?.cashierCode ?? null
      );
      await tx.shopSale.update({
        where: { id: sale.id },
        data: { billNumber: newBill },
      });
      console.log(
        `  ${sale.billNumber} → ${newBill} (sale ${sale.id.slice(0, 8)}…)`
      );
    });
  }
}

console.log("Done.");
await prisma.$disconnect();
