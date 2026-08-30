/**
 * One-time fix: assign new bill numbers to duplicate ShopSale rows (keeps oldest per org+bill).
 * Run: node --env-file=.env scripts/dedupe-shop-bill-numbers.mjs
 */
import "dotenv/config";
import { prisma } from "../src/lib/db/prisma.ts";
import { nextShopBillNumber } from "../src/lib/shop/bill-number.ts";

const sales = await prisma.shopSale.findMany({
  where: { billNumber: { not: null } },
  select: { id: true, organizationId: true, billNumber: true },
});

/** @type {Map<string, string[]>} */
const groups = new Map();
for (const sale of sales) {
  const bill = sale.billNumber?.trim();
  if (!bill) continue;
  const key = `${sale.organizationId}\0${bill}`;
  const ids = groups.get(key);
  if (ids) ids.push(sale.id);
  else groups.set(key, [sale.id]);
}

const dupes = [...groups.entries()].filter(([, ids]) => ids.length > 1);

if (dupes.length === 0) {
  console.log("No duplicate bill numbers.");
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`Found ${dupes.length} duplicate bill number group(s).`);

for (const [key, ids] of dupes) {
  const organizationId = key.split("\0")[0];
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
        organizationId,
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
