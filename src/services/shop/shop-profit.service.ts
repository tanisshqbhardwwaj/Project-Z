import { prisma } from "@/lib/db/prisma";
import { parseSaleItemsJson } from "@/lib/shop/inventory/inventory-analytics";
import { branchWhere, type BranchScope } from "@/lib/shop/branch/branch-context";
import { ensureShopExtendedSchema } from "@/lib/shop/schema/ensure-shop-extended-schema";
import { ensureShopFeaturesSchema } from "@/lib/shop/schema/ensure-shop-features-schema";
import { getExpenseSummary } from "./shop-expense.service";
import { getPurchaseSummary } from "./shop-purchase.service";

export type ProfitPeriod = "today" | "week" | "month" | "custom";

function periodBounds(period: ProfitPeriod, from?: Date, to?: Date) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (period === "custom" && from && to) {
    start.setTime(from.getTime());
    end.setTime(to.getTime());
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export async function getShopProfitAnalytics(input: {
  organizationId: string;
  period?: ProfitPeriod;
  from?: Date;
  to?: Date;
  branchScope?: BranchScope;
}) {
  await ensureShopExtendedSchema();
  await ensureShopFeaturesSchema();
  const period = input.period ?? "today";
  const { start, end } = periodBounds(period, input.from, input.to);
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
      totalPaise: true,
      totalCostPaise: true,
      pricingJson: true,
      itemsJson: true,
    },
  });

  const returns = await prisma.shopSaleReturn.findMany({
    where: {
      organizationId: input.organizationId,
      createdAt: { gte: start, lte: end },
      ...(branchFilter.branchId
        ? { shopSale: { branchId: branchFilter.branchId } }
        : {}),
    },
    select: { refundAmountPaise: true, lines: { select: { returnQty: true, unitPricePaise: true } } },
  }).catch(() => []);

  let returnRefundPaise = BigInt(0);
  for (const r of returns) {
    returnRefundPaise += r.refundAmountPaise;
  }

  let revenuePaise = BigInt(0);
  let cogsPaise = BigInt(0);
  let discountPaise = BigInt(0);

  for (const sale of sales) {
    revenuePaise += sale.totalPaise;
    if (sale.totalCostPaise > BigInt(0)) {
      cogsPaise += sale.totalCostPaise;
    } else {
      const items = parseSaleItemsJson(sale.itemsJson);
      for (const item of items) {
        const cost = item.costPaisePerUnit
          ? BigInt(Math.round(item.costPaisePerUnit * 100))
          : BigInt(0);
        cogsPaise += cost * BigInt(Math.round(item.qty));
      }
    }
    const pricing = sale.pricingJson as { discountRupees?: number } | null;
    if (pricing?.discountRupees) {
      discountPaise += BigInt(Math.round(pricing.discountRupees * 100));
    }
  }

  const grossProfitPaise = revenuePaise - cogsPaise - returnRefundPaise;

  const [expenseSummary, purchaseSummary] = await Promise.all([
    getExpenseSummary(input.organizationId, start, end),
    getPurchaseSummary(input.organizationId, start, end),
  ]);

  const expensePaise = BigInt(expenseSummary.totalPaise);
  const netProfitPaise = grossProfitPaise - expensePaise;

  return {
    period,
    from: start.toISOString(),
    to: end.toISOString(),
    salesCount: sales.length,
    revenuePaise: (revenuePaise - returnRefundPaise).toString(),
    cogsPaise: cogsPaise.toString(),
    discountPaise: discountPaise.toString(),
    grossProfitPaise: grossProfitPaise.toString(),
    expensePaise: expensePaise.toString(),
    netProfitPaise: netProfitPaise.toString(),
    expenseCount: expenseSummary.expenseCount,
    purchaseTotalPaise: purchaseSummary.totalPaise,
    purchaseCount: purchaseSummary.purchaseCount,
    expensesByCategory: expenseSummary.byCategory,
    monthlyFixedExpensesPaise: expenseSummary.monthlyFixedPaise,
  };
}

export async function getShopProfitReport(input: {
  organizationId: string;
  from: Date;
  to: Date;
  branchScope?: BranchScope;
}) {
  return getShopProfitAnalytics({
    organizationId: input.organizationId,
    period: "custom",
    from: input.from,
    to: input.to,
    branchScope: input.branchScope,
  });
}
