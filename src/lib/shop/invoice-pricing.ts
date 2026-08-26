import type { DiscountBasis } from "@/lib/org/shop-settings";
import type { ResolvedInvoiceTemplate } from "@/lib/org/shop-settings";

export type ManualDiscountMode = "percent" | "rupees";

export type InvoicePricingInput = {
  items: Array<{ qty: number; priceRupees: number }>;
  discountRupees?: number;
  /** When set, overrides discountRupees (% of subtotal or total per discountBasis) */
  discountPercent?: number;
  discountBasis?: DiscountBasis;
  /** Ignored — round off is always auto floor-down to whole rupees when useDecimalPlaces is true */
  roundOffRupees?: number;
  taxRatePercent?: number;
  taxIncluded?: boolean;
  /** When set, use this GST amount instead of calculating from rate */
  manualGstRupees?: number | null;
  /** When false, skip bill round-off and round totals to whole rupees. Default true. */
  useDecimalPlaces?: boolean;
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
  const useDecimalPlaces = input.useDecimalPlaces !== false;
  let roundOffRupees = 0;
  let totalRupees: number;
  if (useDecimalPlaces) {
    roundOffRupees = roundDownToRupee(beforeRound);
    totalRupees = round2(Math.max(0, beforeRound + roundOffRupees));
  } else {
    totalRupees = Math.max(0, Math.round(beforeRound));
  }
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
  manualDiscountMode?: ManualDiscountMode;
  manualDiscountPercent?: number;
  offerDiscountRupees?: number;
  /** Saved per line index — offer + percent manual combined. */
  lineDiscountRupees?: number[];
  appliedOffers?: { offerId: string; name: string; discountRupees: number }[];
<<<<<<< HEAD
  splitPayments?: { method: string; amountRupees: number }[];
  terminalPayment?: {
    provider: string;
    externalId: string;
    merchantTxnId: string;
    reference?: string;
  };
=======
>>>>>>> origin/master
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
    manualDiscountMode:
      p.manualDiscountMode === "percent" || p.manualDiscountMode === "rupees"
        ? p.manualDiscountMode
        : undefined,
    manualDiscountPercent:
      p.manualDiscountPercent != null ? Number(p.manualDiscountPercent) : undefined,
    offerDiscountRupees:
      p.offerDiscountRupees != null ? Number(p.offerDiscountRupees) : undefined,
    lineDiscountRupees: Array.isArray(p.lineDiscountRupees)
      ? p.lineDiscountRupees.map((n) => Number(n))
      : undefined,
    appliedOffers: Array.isArray(p.appliedOffers)
      ? (p.appliedOffers as { offerId: string; name: string; discountRupees: number }[])
      : undefined,
<<<<<<< HEAD
    splitPayments: Array.isArray(p.splitPayments)
      ? (p.splitPayments as { method: string; amountRupees: number }[])
      : undefined,
    terminalPayment:
      p.terminalPayment && typeof p.terminalPayment === "object"
        ? (p.terminalPayment as StoredInvoicePricing["terminalPayment"])
        : undefined,
=======
>>>>>>> origin/master
  };
}

export function formatInvoiceRupees(
  rupees: number,
  options?: { decimals?: boolean }
): string {
  const decimals = options?.decimals !== false;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(rupees);
}

export function formatInvoiceMoney(
  rupees: number,
  template: Pick<ResolvedInvoiceTemplate, "useDecimalPlaces">
): string {
  return formatInvoiceRupees(rupees, { decimals: template.useDecimalPlaces });
}

/** Per-item discount hint when line-level savings are shown. */
export function formatLineDiscountHint(
  allocated: Pick<AllocatedLineDiscount, "lineDiscountRupees">,
  template: Pick<ResolvedInvoiceTemplate, "useDecimalPlaces">
): string | null {
  if (allocated.lineDiscountRupees <= 0.004) return null;
  return `Off ${formatInvoiceMoney(allocated.lineDiscountRupees, template)}`;
}

export function shouldShowLineDiscountHints(
  pricing: StoredInvoicePricing | null | undefined,
  liveDiscountMode?: ManualDiscountMode,
  liveOfferDiscountRupees?: number
): boolean {
  const offerDiscount =
    liveOfferDiscountRupees ?? pricing?.offerDiscountRupees ?? 0;
  if (offerDiscount > 0) return true;

  if (liveDiscountMode === "percent") return true;
  if (liveDiscountMode === "rupees") return false;
  if (!pricing) return false;
  if (pricing.manualDiscountMode === "rupees") return false;
  if (pricing.manualDiscountMode === "percent") return true;
  if ((pricing.manualDiscountPercent ?? 0) > 0) return true;
  if ((pricing.discountPercent ?? 0) > 0) return true;
<<<<<<< HEAD
  // Legacy bills: flat ₹ discount saved without manualDiscountMode — keep lines at list price.
  if (
    (pricing.manualDiscountRupees ?? 0) > 0 ||
    ((pricing.discountRupees ?? 0) > 0 && (pricing.discountPercent ?? 0) <= 0)
  ) {
    return false;
  }
=======
>>>>>>> origin/master
  return false;
}

export type AllocatedLineDiscount = {
  qty: number;
  priceRupees: number;
  originalLineRupees: number;
  lineDiscountRupees: number;
  discountedLineRupees: number;
  discountedUnitRupees: number;
};

/** Split bill discount across lines by share of subtotal; last line absorbs rounding paise. */
export function allocateLineDiscounts(
  items: Array<{ qty: number; priceRupees: number }>,
  totalDiscountRupees: number
): AllocatedLineDiscount[] {
  const discount = round2(Math.max(0, totalDiscountRupees));
  const lines = items.map((line) => {
    const originalLineRupees = round2(line.qty * line.priceRupees);
    return { ...line, originalLineRupees };
  });
  const subtotal = round2(lines.reduce((s, l) => s + l.originalLineRupees, 0));
  if (discount <= 0 || subtotal <= 0) {
    return lines.map((line) => ({
      qty: line.qty,
      priceRupees: line.priceRupees,
      originalLineRupees: line.originalLineRupees,
      lineDiscountRupees: 0,
      discountedLineRupees: line.originalLineRupees,
      discountedUnitRupees: line.qty > 0 ? round2(line.originalLineRupees / line.qty) : 0,
    }));
  }

  let allocated = 0;
  return lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    const lineDiscountRupees = isLast
      ? round2(Math.min(line.originalLineRupees, discount - allocated))
      : round2(
          Math.min(
            line.originalLineRupees,
            (line.originalLineRupees / subtotal) * discount
          )
        );
    allocated = round2(allocated + lineDiscountRupees);
    const discountedLineRupees = round2(
      Math.max(0, line.originalLineRupees - lineDiscountRupees)
    );
    const discountedUnitRupees =
      line.qty > 0 ? round2(discountedLineRupees / line.qty) : 0;
    return {
      qty: line.qty,
      priceRupees: line.priceRupees,
      originalLineRupees: line.originalLineRupees,
      lineDiscountRupees,
      discountedLineRupees,
      discountedUnitRupees,
    };
  });
}

export function allocationsFromLineDiscounts(
  items: Array<{ qty: number; priceRupees: number }>,
  lineDiscountRupees: number[]
): AllocatedLineDiscount[] {
  return items.map((line, index) => {
    const originalLineRupees = round2(line.qty * line.priceRupees);
    const lineDiscount = round2(
      Math.min(originalLineRupees, Math.max(0, lineDiscountRupees[index] ?? 0))
    );
    const discountedLineRupees = round2(
      Math.max(0, originalLineRupees - lineDiscount)
    );
    const discountedUnitRupees =
      line.qty > 0 ? round2(discountedLineRupees / line.qty) : 0;
    return {
      qty: line.qty,
      priceRupees: line.priceRupees,
      originalLineRupees,
      lineDiscountRupees: lineDiscount,
      discountedLineRupees,
      discountedUnitRupees,
    };
  });
}

export function resolveInvoiceLineAllocations(
  items: Array<{ qty: number; priceRupees: number }>,
  input: {
    showLineHints: boolean;
    totalDiscountRupees: number;
    storedLineDiscountRupees?: number[];
    manualDiscountRupees?: number;
    manualDiscountMode?: ManualDiscountMode;
    offerLineDiscountRupees?: number[];
  }
): AllocatedLineDiscount[] | null {
  if (!input.showLineHints || input.totalDiscountRupees <= 0) return null;

<<<<<<< HEAD
  const offerLineTotal = round2(
    (input.offerLineDiscountRupees ?? []).reduce((s, n) => s + Math.max(0, n), 0)
  );

  // Flat ₹ discount on the whole cart — show only in totals, not per line.
  if (input.manualDiscountMode === "rupees" && offerLineTotal <= 0) {
    return null;
  }

=======
>>>>>>> origin/master
  if (
    input.storedLineDiscountRupees &&
    input.storedLineDiscountRupees.length === items.length
  ) {
    return allocationsFromLineDiscounts(items, input.storedLineDiscountRupees);
  }

  const manualPart =
    input.manualDiscountMode === "percent" && (input.manualDiscountRupees ?? 0) > 0
      ? allocateLineDiscounts(items, input.manualDiscountRupees!).map(
          (line) => line.lineDiscountRupees
        )
      : items.map(() => 0);

  if (
    input.offerLineDiscountRupees &&
    input.offerLineDiscountRupees.length === items.length
  ) {
    const combined = items.map((_, index) =>
      round2((input.offerLineDiscountRupees![index] ?? 0) + (manualPart[index] ?? 0))
    );
    return allocationsFromLineDiscounts(items, combined);
  }

  if (input.manualDiscountMode === "percent" && (input.manualDiscountRupees ?? 0) > 0) {
    return allocateLineDiscounts(items, input.manualDiscountRupees!);
  }

<<<<<<< HEAD
  return null;
=======
  return allocateLineDiscounts(items, input.totalDiscountRupees);
>>>>>>> origin/master
}
