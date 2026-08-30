import { prisma } from "@/lib/db/prisma";
import { parseSaleItems } from "@/lib/shop/sale-line-key";
import { branchWhere, type BranchScope } from "@/lib/shop/branch-context";
import { requireModule } from "@/lib/org/require-module";
import { ensureShopFeaturesSchema } from "@/lib/shop/ensure-shop-features-schema";

export type TopCustomerSort = "amount" | "orders" | "items";
export type TopCustomerPeriod = "7d" | "30d" | "90d" | "custom";

function periodStart(period: TopCustomerPeriod, from?: Date, to?: Date) {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = from ? new Date(from) : new Date();
  if (!from) {
    start.setHours(0, 0, 0, 0);
    if (period === "7d") start.setDate(start.getDate() - 6);
    else if (period === "30d") start.setDate(start.getDate() - 29);
    else if (period === "90d") start.setDate(start.getDate() - 89);
  } else {
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

export async function getTopCustomers(input: {
  organizationId: string;
  period?: TopCustomerPeriod;
  from?: Date;
  to?: Date;
  sort?: TopCustomerSort;
  limit?: number;
  branchScope?: BranchScope;
}) {
  await requireModule(input.organizationId, "shop_sales");
  await ensureShopFeaturesSchema();
  const period = input.period ?? "30d";
  const { start, end } = periodStart(period, input.from, input.to);
  const limit = Math.min(input.limit ?? 20, 100);
  const branchFilter = branchWhere(input.branchScope ?? "all");

  const sales = await prisma.shopSale.findMany({
    where: {
      organizationId: input.organizationId,
      ...branchFilter,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerPhone: true,
      totalPaise: true,
      itemsJson: true,
      createdAt: true,
    },
  });

  const returns = await prisma.shopSaleReturn.findMany({
    where: {
      organizationId: input.organizationId,
      createdAt: { gte: start, lte: end },
    },
    select: { shopSaleId: true, refundAmountPaise: true },
  });

  const returnBySale = new Map<string, bigint>();
  for (const r of returns) {
    returnBySale.set(
      r.shopSaleId,
      (returnBySale.get(r.shopSaleId) ?? BigInt(0)) + r.refundAmountPaise
    );
  }

  type Agg = {
    customerKey: string;
    name: string;
    phone: string | null;
    orderCount: number;
    itemCount: number;
    totalPaise: bigint;
    lastPurchaseAt: Date | null;
  };

  const byCustomer = new Map<string, Agg>();

  for (const sale of sales) {
    const key =
      sale.customerId ??
      (sale.customerPhone?.trim() || sale.customerName?.trim() || "walk-in");
    const name = sale.customerName?.trim() || "Walk-in";
    const phone = sale.customerPhone?.trim() || null;
    const refund = returnBySale.get(sale.id) ?? BigInt(0);
    const netPaise =
      sale.totalPaise > refund ? sale.totalPaise - refund : BigInt(0);
    const items = parseSaleItems(sale.itemsJson);
    const qty = items.reduce((s, i) => s + i.qty, 0);

    const existing = byCustomer.get(key) ?? {
      customerKey: key,
      name,
      phone,
      orderCount: 0,
      itemCount: 0,
      totalPaise: BigInt(0),
      lastPurchaseAt: null,
    };
    existing.orderCount += 1;
    existing.itemCount += qty;
    existing.totalPaise += netPaise;
    if (!existing.lastPurchaseAt || sale.createdAt > existing.lastPurchaseAt) {
      existing.lastPurchaseAt = sale.createdAt;
    }
    if (name !== "Walk-in") existing.name = name;
    if (phone) existing.phone = phone;
    byCustomer.set(key, existing);
  }

  const phones = [...byCustomer.values()]
    .map((c) => c.phone)
    .filter((p): p is string => Boolean(p));

  const credits =
    phones.length > 0
      ? await prisma.customerCredit.findMany({
          where: { organizationId: input.organizationId, phone: { in: phones } },
          select: { phone: true, balancePaise: true },
        })
      : [];
  const balanceByPhone = new Map(credits.map((c) => [c.phone!, c.balancePaise]));

  let rows = [...byCustomer.values()].map((c) => ({
    customerKey: c.customerKey,
    name: c.name,
    phone: c.phone,
    orderCount: c.orderCount,
    itemCount: Math.round(c.itemCount * 100) / 100,
    totalPaise: c.totalPaise.toString(),
    averageOrderPaise:
      c.orderCount > 0
        ? (c.totalPaise / BigInt(c.orderCount)).toString()
        : "0",
    outstandingPaise: c.phone
      ? (balanceByPhone.get(c.phone)?.toString() ?? "0")
      : "0",
    lastPurchaseDate: c.lastPurchaseAt?.toISOString() ?? null,
  }));

  const sort = input.sort ?? "amount";
  rows.sort((a, b) => {
    if (sort === "orders") return b.orderCount - a.orderCount;
    if (sort === "items") return b.itemCount - a.itemCount;
    return Number(BigInt(b.totalPaise) - BigInt(a.totalPaise));
  });

  rows = rows.slice(0, limit);

  return { period, from: start.toISOString(), to: end.toISOString(), customers: rows };
}

export async function getTopCustomerSummary(
  organizationId: string,
  branchScope?: BranchScope
) {
  const result = await getTopCustomers({
    organizationId,
    period: "30d",
    sort: "amount",
    limit: 1,
    branchScope,
  });
  return result.customers[0] ?? null;
}
