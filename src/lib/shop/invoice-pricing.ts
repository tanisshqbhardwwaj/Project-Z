import type { DiscountBasis } from "@/lib/org/shop-settings";

export type InvoicePricingInput = {
  items: Array<{ qty: number; priceRupees: number }>;
  discountRupees?: number;
  /** When set, overrides discountRupees (% of subtotal or total per discountBasis) */
  discountPercent?: number;
  discountBasis?: DiscountBasis;
  /** Ignored — round off is always auto floor-down to whole rupees */
  roundOffRupees?: number;
  taxRatePercent?: number;
  taxIncluded?: boolean;
  /** When set, use this GST amount instead of calculating from rate */
  manualGstRupees?: number | null;
};

export type InvoicePricingResult = {
  subtotalRupees: number;
  discountRupees: number;
  discountPercent: number;
  discountBasis: DiscountBasis;
  taxableRupees: number;
  gstRupees: number;
  cgstRupees: number;
  sgstRupees: number;
  taxIncluded: boolean;
  taxRatePercent: number;
  roundOffRupees: number;
  totalRupees: number;
  totalPaise: bigint;
  gstPaise: bigint;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeTax(
  amount: number,
  taxRatePercent: number,
  taxIncluded: boolean,
  manualGstRupees: number | null | undefined
): { taxableRupees: number; gstRupees: number } {
  let taxableRupees = amount;
  let gstRupees = 0;

  if (manualGstRupees != null && Number.isFinite(manualGstRupees)) {
    gstRupees = round2(Math.max(0, manualGstRupees));
    if (taxIncluded) {
      taxableRupees = round2(Math.max(0, amount - gstRupees));
    }
  } else if (taxRatePercent > 0) {
    const rate = taxRatePercent / 100;
    if (taxIncluded) {
      taxableRupees = round2(amount / (1 + rate));
      gstRupees = round2(amount - taxableRupees);
    } else {
      taxableRupees = amount;
      gstRupees = round2(taxableRupees * rate);
    }
  }

  return { taxableRupees, gstRupees };
}

function resolveDiscount(
  discountPercent: number,
  discountRupeesInput: number,
  basisAmount: number
): number {
  if (discountPercent > 0) {
    return round2(Math.min(basisAmount, (basisAmount * discountPercent) / 100));
  }
  return round2(Math.min(basisAmount, Math.max(0, discountRupeesInput)));
}

export function computeInvoicePricing(input: InvoicePricingInput): InvoicePricingResult {
  const subtotalRupees = round2(
    input.items.reduce((s, l) => s + l.qty * l.priceRupees, 0)
  );
  const discountPercent = Math.max(0, input.discountPercent ?? 0);
  const discountBasis: DiscountBasis = input.discountBasis ?? "subtotal";
  const taxIncluded = Boolean(input.taxIncluded);
  const taxRatePercent = Math.max(0, input.taxRatePercent ?? 0);
  const manualGst = input.manualGstRupees ?? null;

  let discountRupees = 0;
  let taxableRupees = 0;
  let gstRupees = 0;

  if (discountBasis === "subtotal") {
    discountRupees = resolveDiscount(
      discountPercent,
      input.discountRupees ?? 0,
      subtotalRupees
    );
    const afterDiscount = round2(Math.max(0, subtotalRupees - discountRupees));
    const tax = computeTax(afterDiscount, taxRatePercent, taxIncluded, manualGst);
    taxableRupees = tax.taxableRupees;
    gstRupees = tax.gstRupees;
  } else {
    const tax = computeTax(subtotalRupees, taxRatePercent, taxIncluded, manualGst);
    taxableRupees = tax.taxableRupees;
    gstRupees = tax.gstRupees;
    const grossBeforeDiscount = round2(
      taxIncluded ? subtotalRupees : taxableRupees + gstRupees
    );
    discountRupees = resolveDiscount(
      discountPercent,
      input.discountRupees ?? 0,
      grossBeforeDiscount
    );
  }

  const beforeRound = round2(
    discountBasis === "subtotal"
      ? taxIncluded
        ? Math.max(0, subtotalRupees - discountRupees)
        : taxableRupees + gstRupees
      : Math.max(
          0,
          (taxIncluded ? subtotalRupees : taxableRupees + gstRupees) - discountRupees
        )
  );
  const roundOffRupees = roundDownToRupee(beforeRound);
  const totalRupees = round2(Math.max(0, beforeRound + roundOffRupees));
  const totalPaise = BigInt(Math.round(totalRupees * 100));
  const gstPaise = BigInt(Math.round(gstRupees * 100));
  const halfGst = round2(gstRupees / 2);
  const cgstRupees = halfGst;
  const sgstRupees = round2(gstRupees - halfGst);

  return {
    subtotalRupees,
    discountRupees,
    discountPercent,
    discountBasis,
    taxableRupees,
    gstRupees,
    cgstRupees,
    sgstRupees,
    taxIncluded,
    taxRatePercent,
    roundOffRupees,
    totalRupees,
    totalPaise,
    gstPaise,
  };
}

/** Floor to whole rupee; delta is always zero or negative (never rounds up). */
export function roundDownToRupee(totalRupees: number): number {
  const floored = Math.floor(totalRupees + 1e-9);
  return round2(floored - totalRupees);
}

/** @deprecated Use roundDownToRupee */
export function roundToNearestRupee(totalRupees: number): number {
  return roundDownToRupee(totalRupees);
}

export type StoredInvoicePricing = {
  subtotalRupees: number;
  discountRupees: number;
  discountPercent?: number;
  discountBasis?: DiscountBasis;
  taxableRupees: number;
  gstRupees: number;
  cgstRupees?: number;
  sgstRupees?: number;
  taxIncluded: boolean;
  taxRatePercent: number;
  roundOffRupees: number;
  manualGstRupees?: number | null;
  manualDiscountRupees?: number;
  offerDiscountRupees?: number;
  appliedOffers?: { offerId: string; name: string; discountRupees: number }[];
};

export function parsePricingJson(raw: unknown): StoredInvoicePricing | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.subtotalRupees !== "number") return null;
  const gstRupees = Number(p.gstRupees ?? 0);
  const halfGst = Math.round((gstRupees / 2) * 100) / 100;
  return {
    subtotalRupees: p.subtotalRupees,
    discountRupees: Number(p.discountRupees ?? 0),
    discountPercent: Number(p.discountPercent ?? 0),
    discountBasis:
      p.discountBasis === "total" || p.discountBasis === "subtotal"
        ? p.discountBasis
        : "subtotal",
    taxableRupees: Number(p.taxableRupees ?? p.subtotalRupees),
    gstRupees,
    cgstRupees: Number(p.cgstRupees ?? halfGst),
    sgstRupees: Number(p.sgstRupees ?? gstRupees - halfGst),
    taxIncluded: Boolean(p.taxIncluded),
    taxRatePercent: Number(p.taxRatePercent ?? 0),
    roundOffRupees: Number(p.roundOffRupees ?? 0),
    manualGstRupees:
      p.manualGstRupees != null ? Number(p.manualGstRupees) : null,
    manualDiscountRupees:
      p.manualDiscountRupees != null ? Number(p.manualDiscountRupees) : undefined,
    offerDiscountRupees:
      p.offerDiscountRupees != null ? Number(p.offerDiscountRupees) : undefined,
    appliedOffers: Array.isArray(p.appliedOffers)
      ? (p.appliedOffers as { offerId: string; name: string; discountRupees: number }[])
      : undefined,
  };
}

export function formatInvoiceRupees(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
