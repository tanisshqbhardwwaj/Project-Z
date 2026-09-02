import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { ensureCatalogSchema } from "@/lib/shop/schema/ensure-catalog-schema";
import { parseSaleItems } from "@/lib/shop/invoices/sale-line-key";
import { monthRangeUtc } from "@/lib/date/org-day";
import {
  commissionForSale,
  describeCommission,
  type CommissionConfig,
} from "@/lib/staff/commission-math";

export { commissionForSale, describeCommission, type CommissionConfig };

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

function lineItemsAssignedToStaff(
  items: ReturnType<typeof parseSaleItems>,
  staffId: string,
  billStaffId: string | null
): number {
  return items.reduce((sum, item) => {
    const assigned = item.staffId ?? billStaffId ?? null;
    if (assigned === staffId) return sum + item.qty;
    return sum;
  }, 0);
}

function saleAssignedToBillStaff(
  sale: { staffId: string | null; salesBoyName: string | null },
  staffId: string,
  staffName: string
): boolean {
  return sale.staffId === staffId || (!sale.staffId && sale.salesBoyName === staffName);
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
    },
    select: {
      id: true,
      billNumber: true,
      createdAt: true,
      totalPaise: true,
      staffId: true,
      salesBoyName: true,
      itemsJson: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const relevantSales =
    config.commissionType === "FIXED_PER_ITEM"
      ? sales.filter((sale) => {
          const items = parseSaleItems(sale.itemsJson);
          return (
            lineItemsAssignedToStaff(items, staff.id, sale.staffId) > 0 ||
            saleAssignedToBillStaff(sale, staff.id, staff.name)
          );
        })
      : sales.filter((sale) => saleAssignedToBillStaff(sale, staff.id, staff.name));

  if (relevantSales.length === 0) return empty;

  const returns = await prisma.shopSaleReturn.findMany({
    where: {
      organizationId: input.organizationId,
      shopSaleId: { in: relevantSales.map((s) => s.id) },
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

  for (const sale of relevantSales) {
    const adjustments = returnsBySale.get(sale.id);
    const returned = adjustments?.returned ?? BigInt(0);
    const exchanged = adjustments?.exchanged ?? BigInt(0);
    const returnedQty = adjustments?.returnedQty ?? 0;
    const exchangedQty = adjustments?.exchangedQty ?? 0;

    const items = parseSaleItems(sale.itemsJson);
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    const billStaff = saleAssignedToBillStaff(sale, staff.id, staff.name);
    const eligibleItems =
      config.commissionType === "FIXED_PER_ITEM"
        ? Math.max(
            0,
            lineItemsAssignedToStaff(items, staff.id, billStaff ? sale.staffId : null) -
              returnedQty +
              exchangedQty
          )
        : Math.max(0, itemCount - returnedQty + exchangedQty);

    const rawEligible = sale.totalPaise - returned + exchanged;
    const eligible =
      config.commissionType === "FIXED_PER_ITEM" || billStaff
        ? rawEligible > BigInt(0)
          ? rawEligible
          : BigInt(0)
        : BigInt(0);

    const saleCommission =
      config.commissionType === "FIXED_PER_ITEM"
        ? commissionForSale(config, {
            eligiblePaise: eligible,
            saleTotalPaise: sale.totalPaise,
            eligibleItemCount: eligibleItems,
          })
        : billStaff
          ? commissionForSale(config, {
              eligiblePaise: eligible,
              saleTotalPaise: sale.totalPaise,
              eligibleItemCount: eligibleItems,
            })
          : BigInt(0);

    if (config.commissionType !== "FIXED_PER_ITEM" && !billStaff) continue;

    grossSalesPaise += billStaff ? sale.totalPaise : BigInt(0);
    returnedValuePaise += billStaff ? returned : BigInt(0);
    exchangeValuePaise += billStaff ? exchanged : BigInt(0);
    eligibleSalesPaise += eligible;
    eligibleItemCount += eligibleItems;
    commissionPaise += saleCommission;
    fullCommissionPaise += billStaff
      ? commissionBeforeReturns(config, {
          saleTotalPaise: sale.totalPaise,
          itemCount,
        })
      : commissionForSale(config, {
          eligiblePaise: sale.totalPaise,
          saleTotalPaise: sale.totalPaise,
          eligibleItemCount: lineItemsAssignedToStaff(
            items,
            staff.id,
            billStaff ? sale.staffId : null
          ),
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
    invoiceCount: relevantSales.length,
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
