import type { StaffCommissionType } from "@prisma/client";

export type CommissionConfig = {
  commissionType: StaffCommissionType;
  commissionPercent: number | null;
  commissionAmountPaise: bigint | null;
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
