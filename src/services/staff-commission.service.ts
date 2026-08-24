import type { StaffCommissionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import { parseSaleItems } from "@/lib/shop/sale-line-key";
import { monthRangeUtc } from "@/lib/date/org-day";

export type CommissionConfig = {
  commissionType: StaffCommissionType;
  commissionPercent: number | null;
  commissionAmountPaise: bigint | null;
};

export type CommissionSaleBreakdown = {
  saleId: string;
  billNumber: string | null;
  createdAt: Date;
  /** Invoice total as billed. */
  saleTotalPaise: bigint;
  /** Value of goods the customer brought back against this invoice. */
  returnedValuePaise: bigint;
  /** Value of replacement goods issued against this invoice. */
  exchangeValuePaise: bigint;
  /** Invoice total after returns and exchanges — commission is paid on this. */
  eligiblePaise: bigint;
  itemCount: number;
  returnedItemCount: number;
  eligibleItemCount: number;
  commissionPaise: bigint;
};

export type CommissionResult = {
  staffId: string;
  staffName: string;
  year: number;
  month: number;
  config: CommissionConfig;
  invoiceCount: number;
  grossSalesPaise: bigint;
  returnedValuePaise: bigint;
  exchangeValuePaise: bigint;
  eligibleSalesPaise: bigint;
  eligibleItemCount: number;
  commissionPaise: bigint;
  /** Commission that was reversed because goods came back. */
  returnAdjustmentPaise: bigint;
  sales: CommissionSaleBreakdown[];
};

function isNoCommission(config: CommissionConfig): boolean {
  if (config.commissionType === "NONE") return true;
  if (config.commissionType === "PERCENT") {
    return !config.commissionPercent || config.commissionPercent <= 0;
  }
  return !config.commissionAmountPaise || config.commissionAmountPaise <= BigInt(0);
}

/**
 * Commission on one invoice's eligible value.
 *
 * - PERCENT: a share of the invoice value that stuck.
 * - FIXED_PER_SALE: a flat amount, but only while the invoice still has value
 *   left after returns. A fully returned bill earns nothing.
 * - FIXED_PER_ITEM: a flat amount per item that was not returned.
 */
export function commissionForSale(
  config: CommissionConfig,
  sale: {
    eligiblePaise: bigint;
    saleTotalPaise: bigint;
    eligibleItemCount: number;
  }
): bigint {
  if (isNoCommission(config)) return BigInt(0);
  if (sale.eligiblePaise <= BigInt(0)) return BigInt(0);

  switch (config.commissionType) {
    case "PERCENT": {
      const basisPoints = BigInt(Math.round((config.commissionPercent ?? 0) * 100));
      return (sale.eligiblePaise * basisPoints) / BigInt(10_000);
    }
    case "FIXED_PER_SALE": {
      const flat = config.commissionAmountPaise ?? BigInt(0);
      // Partial return → pay the flat fee pro-rata on what the customer kept.
      if (sale.saleTotalPaise <= BigInt(0)) return BigInt(0);
      if (sale.eligiblePaise >= sale.saleTotalPaise) return flat;
      return (flat * sale.eligiblePaise) / sale.saleTotalPaise;
    }
    case "FIXED_PER_ITEM": {
      const perItem = config.commissionAmountPaise ?? BigInt(0);
      return perItem * BigInt(Math.max(0, Math.round(sale.eligibleItemCount)));
    }
    default:
      return BigInt(0);
  }
}

/** Commission a full-value invoice would have earned, before any returns. */
function commissionBeforeReturns(
  config: CommissionConfig,
  sale: { saleTotalPaise: bigint; itemCount: number }
): bigint {
  return commissionForSale(config, {
    eligiblePaise: sale.saleTotalPaise,
    saleTotalPaise: sale.saleTotalPaise,
    eligibleItemCount: sale.itemCount,
  });
}

/**
 * Commission earned by one staff member in a calendar month, computed from the
 * actual invoices they billed.
 *
 * Returns and exchanges are netted off, so a returned sale stops earning
 * commission and a partial return only reduces the affected share. Replacement
 * goods issued in an exchange count back towards eligible sales, because the
 * customer did keep merchandise of that value.
 */
export async function computeStaffCommission(input: {
  organizationId: string;
  staffId: string;
  year: number;
  month: number;
  timezone?: string;
}): Promise<CommissionResult> {
  await ensureCatalogSchema();

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
    select: {
      id: true,
      name: true,
      commissionType: true,
      commissionPercent: true,
      commissionAmountPaise: true,
    },
  });
  if (!staff) throw new Error("Staff member not found");

  const config: CommissionConfig = {
    commissionType: staff.commissionType,
    commissionPercent: staff.commissionPercent,
    commissionAmountPaise: staff.commissionAmountPaise,
  };

  const empty: CommissionResult = {
    staffId: staff.id,
    staffName: staff.name,
    year: input.year,
    month: input.month,
    config,
    invoiceCount: 0,
    grossSalesPaise: BigInt(0),
    returnedValuePaise: BigInt(0),
    exchangeValuePaise: BigInt(0),
    eligibleSalesPaise: BigInt(0),
    eligibleItemCount: 0,
    commissionPaise: BigInt(0),
    returnAdjustmentPaise: BigInt(0),
    sales: [],
  };

  // `to` is the last day at midnight, so extend by a day for an exclusive bound.
  const { from, to } = monthRangeUtc(input.year, input.month);
  const start = from;
  const end = new Date(to.getTime() + 86_400_000);

  const sales = await prisma.shopSale.findMany({
    where: {
      organizationId: input.organizationId,
      status: "COMPLETED",
      createdAt: { gte: start, lt: end },
      // Older invoices only recorded a typed name; match those too so switching
      // on commission does not silently ignore history.
      OR: [{ staffId: staff.id }, { staffId: null, salesBoyName: staff.name }],
    },
    select: {
      id: true,
      billNumber: true,
      createdAt: true,
      totalPaise: true,
      itemsJson: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (sales.length === 0) return empty;

  const returns = await prisma.shopSaleReturn.findMany({
    where: {
      organizationId: input.organizationId,
      shopSaleId: { in: sales.map((s) => s.id) },
    },
    select: {
      shopSaleId: true,
      returnValuePaise: true,
      exchangeValuePaise: true,
      lines: { select: { returnQty: true, isExchangeOut: true, isExchangeIn: true } },
    },
  });

  const returnsBySale = new Map<
    string,
    { returned: bigint; exchanged: bigint; returnedQty: number; exchangedQty: number }
  >();
  for (const row of returns) {
    const current = returnsBySale.get(row.shopSaleId) ?? {
      returned: BigInt(0),
      exchanged: BigInt(0),
      returnedQty: 0,
      exchangedQty: 0,
    };
    current.returned += row.returnValuePaise;
    current.exchanged += row.exchangeValuePaise;
    for (const line of row.lines) {
      if (line.isExchangeOut) current.returnedQty += line.returnQty;
      if (line.isExchangeIn) current.exchangedQty += line.returnQty;
    }
    returnsBySale.set(row.shopSaleId, current);
  }

  let grossSalesPaise = BigInt(0);
  let returnedValuePaise = BigInt(0);
  let exchangeValuePaise = BigInt(0);
  let eligibleSalesPaise = BigInt(0);
  let eligibleItemCount = 0;
  let commissionPaise = BigInt(0);
  let fullCommissionPaise = BigInt(0);
  const breakdown: CommissionSaleBreakdown[] = [];

  for (const sale of sales) {
    const adjustments = returnsBySale.get(sale.id);
    const returned = adjustments?.returned ?? BigInt(0);
    const exchanged = adjustments?.exchanged ?? BigInt(0);
    const returnedQty = adjustments?.returnedQty ?? 0;
    const exchangedQty = adjustments?.exchangedQty ?? 0;

    const itemCount = parseSaleItems(sale.itemsJson).reduce(
      (sum, item) => sum + item.qty,
      0
    );

    // Value the customer kept: what was billed, minus goods returned, plus the
    // value of any replacement goods they walked out with.
    const rawEligible = sale.totalPaise - returned + exchanged;
    const eligible = rawEligible > BigInt(0) ? rawEligible : BigInt(0);
    const eligibleItems = Math.max(0, itemCount - returnedQty + exchangedQty);

    const saleCommission = commissionForSale(config, {
      eligiblePaise: eligible,
      saleTotalPaise: sale.totalPaise,
      eligibleItemCount: eligibleItems,
    });

    grossSalesPaise += sale.totalPaise;
    returnedValuePaise += returned;
    exchangeValuePaise += exchanged;
    eligibleSalesPaise += eligible;
    eligibleItemCount += eligibleItems;
    commissionPaise += saleCommission;
    fullCommissionPaise += commissionBeforeReturns(config, {
      saleTotalPaise: sale.totalPaise,
      itemCount,
    });

    breakdown.push({
      saleId: sale.id,
      billNumber: sale.billNumber,
      createdAt: sale.createdAt,
      saleTotalPaise: sale.totalPaise,
      returnedValuePaise: returned,
      exchangeValuePaise: exchanged,
      eligiblePaise: eligible,
      itemCount,
      returnedItemCount: returnedQty,
      eligibleItemCount: eligibleItems,
      commissionPaise: saleCommission,
    });
  }

  const returnAdjustment = fullCommissionPaise - commissionPaise;

  if (
    config.commissionType === "FIXED_MONTHLY" &&
    config.commissionAmountPaise &&
    config.commissionAmountPaise > BigInt(0)
  ) {
    commissionPaise += config.commissionAmountPaise;
  }

  return {
    ...empty,
    invoiceCount: sales.length,
    grossSalesPaise,
    returnedValuePaise,
    exchangeValuePaise,
    eligibleSalesPaise,
    eligibleItemCount,
    commissionPaise,
    returnAdjustmentPaise: returnAdjustment > BigInt(0) ? returnAdjustment : BigInt(0),
    sales: breakdown,
  };
}

/** Commission for every active staff member in a month, for the payroll screen. */
export async function listStaffCommissions(input: {
  organizationId: string;
  year: number;
  month: number;
  timezone?: string;
}) {
  await requireModule(input.organizationId, "staff");
  await ensureCatalogSchema();

  const staff = await prisma.staffMember.findMany({
    where: { organizationId: input.organizationId },
    select: { id: true, name: true, roleTitle: true, commissionType: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const results = [];
  for (const member of staff) {
    const result = await computeStaffCommission({
      organizationId: input.organizationId,
      staffId: member.id,
      year: input.year,
      month: input.month,
      timezone: input.timezone,
    });
    results.push({ ...result, roleTitle: member.roleTitle });
  }
  return results;
}

export function describeCommission(config: CommissionConfig): string {
  switch (config.commissionType) {
    case "PERCENT":
      return config.commissionPercent
        ? `${config.commissionPercent}% of eligible sales`
        : "Percentage (not set)";
    case "FIXED_PER_SALE":
      return config.commissionAmountPaise
        ? `₹${(Number(config.commissionAmountPaise) / 100).toLocaleString("en-IN")} per sale`
        : "Fixed per sale (not set)";
    case "FIXED_PER_ITEM":
      return config.commissionAmountPaise
        ? `₹${(Number(config.commissionAmountPaise) / 100).toLocaleString("en-IN")} per item`
        : "Fixed per item (not set)";
    case "FIXED_MONTHLY":
      return config.commissionAmountPaise
        ? `₹${(Number(config.commissionAmountPaise) / 100).toLocaleString("en-IN")} per month`
        : "Fixed monthly (not set)";
    default:
      return "No commission";
  }
}
