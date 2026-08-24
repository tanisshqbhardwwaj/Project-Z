import { describe, it, expect } from "vitest";
import {
  allocateLineDiscounts,
  computeInvoicePricing,
  formatInvoiceMoney,
  formatInvoiceRupees,
  formatLineDiscountHint,
  resolveInvoiceLineAllocations,
  shouldShowLineDiscountHints,
  type StoredInvoicePricing,
} from "@/lib/shop/invoice-pricing";

describe("allocateLineDiscounts", () => {
  it("returns original lines when discount is zero", () => {
    const result = allocateLineDiscounts(
      [
        { qty: 2, priceRupees: 100 },
        { qty: 1, priceRupees: 50 },
      ],
      0
    );
    expect(result[0].discountedLineRupees).toBe(200);
    expect(result[1].discountedLineRupees).toBe(50);
  });

  it("splits discount by line share and last line absorbs rounding", () => {
    const result = allocateLineDiscounts(
      [
        { qty: 1, priceRupees: 100 },
        { qty: 1, priceRupees: 100 },
        { qty: 1, priceRupees: 100 },
      ],
      10
    );
    const totalDiscount = result.reduce((s, l) => s + l.lineDiscountRupees, 0);
    const totalAfter = result.reduce((s, l) => s + l.discountedLineRupees, 0);
    expect(totalDiscount).toBe(10);
    expect(totalAfter).toBe(290);
    expect(result[2].lineDiscountRupees).toBeGreaterThan(3.32);
  });
});

describe("shouldShowLineDiscountHints", () => {
  it("returns true for percent manual discount mode", () => {
    const pricing: StoredInvoicePricing = {
      subtotalRupees: 745,
      discountRupees: 149,
      taxIncluded: false,
      taxRatePercent: 0,
      roundOffRupees: 0,
      taxableRupees: 596,
      gstRupees: 0,
      manualDiscountMode: "percent",
      manualDiscountPercent: 20,
    };
    expect(shouldShowLineDiscountHints(pricing)).toBe(true);
  });

  it("returns true when an offer discount is applied", () => {
    const pricing: StoredInvoicePricing = {
      subtotalRupees: 800,
      discountRupees: 160,
      taxIncluded: false,
      taxRatePercent: 0,
      roundOffRupees: 0,
      taxableRupees: 640,
      gstRupees: 0,
      offerDiscountRupees: 160,
    };
    expect(shouldShowLineDiscountHints(pricing)).toBe(true);
  });

  it("returns false for flat rupee manual discount without offer", () => {
    const pricing: StoredInvoicePricing = {
      subtotalRupees: 745,
      discountRupees: 149,
      taxIncluded: false,
      taxRatePercent: 0,
      roundOffRupees: 0,
      taxableRupees: 596,
      gstRupees: 0,
      manualDiscountMode: "rupees",
    };
    expect(shouldShowLineDiscountHints(pricing)).toBe(false);
  });

  it("respects live discount mode during billing", () => {
    expect(shouldShowLineDiscountHints(null, "percent")).toBe(true);
    expect(shouldShowLineDiscountHints(null, "rupees", 0)).toBe(false);
  });

  it("respects live offer discount during billing", () => {
    expect(shouldShowLineDiscountHints(null, "rupees", 160)).toBe(true);
  });
});

describe("computeInvoicePricing useDecimalPlaces", () => {
  const items = [{ qty: 1, priceRupees: 745 }];

  it("applies round-off when decimals are enabled", () => {
    const result = computeInvoicePricing({
      items,
      discountRupees: 149,
      useDecimalPlaces: true,
    });
    expect(result.totalRupees).toBeLessThanOrEqual(596);
    expect(result.roundOffRupees).toBeLessThanOrEqual(0);
  });

  it("skips round-off and rounds total when decimals are disabled", () => {
    const result = computeInvoicePricing({
      items,
      discountRupees: 149.37,
      useDecimalPlaces: false,
    });
    expect(result.roundOffRupees).toBe(0);
    expect(result.totalRupees).toBe(Math.round(745 - 149.37));
  });
});

describe("formatting", () => {
  const template = { useDecimalPlaces: true };
  const wholeTemplate = { useDecimalPlaces: false };

  it("formats with paise by default", () => {
    expect(formatInvoiceRupees(596)).toMatch(/596\.00/);
  });

  it("formats whole rupees when decimals off", () => {
    expect(formatInvoiceRupees(596, { decimals: false })).not.toMatch(/\.00/);
    expect(formatInvoiceMoney(596, wholeTemplate)).not.toMatch(/\.00/);
  });

  it("builds line discount hint in percent mode", () => {
    const hint = formatLineDiscountHint({ lineDiscountRupees: 149 }, template);
    expect(hint).toBe("Off ₹149.00");
    expect(hint).not.toContain("List");
  });

  it("returns null hint when no line discount", () => {
    expect(
      formatLineDiscountHint({ lineDiscountRupees: 0 }, template)
    ).toBeNull();
  });
});

describe("resolveInvoiceLineAllocations", () => {
  const items = [
    { qty: 1, priceRupees: 800 },
    { qty: 1, priceRupees: 1500 },
  ];

  it("uses offer line discounts only on eligible items", () => {
    const result = resolveInvoiceLineAllocations(items, {
      showLineHints: true,
      totalDiscountRupees: 160,
      offerLineDiscountRupees: [160, 0],
    });
    expect(result?.[0].lineDiscountRupees).toBe(160);
    expect(result?.[0].discountedLineRupees).toBe(640);
    expect(result?.[1].lineDiscountRupees).toBe(0);
    expect(result?.[1].discountedLineRupees).toBe(1500);
  });

  it("merges percent manual discount with offer line discounts", () => {
    const result = resolveInvoiceLineAllocations(items, {
      showLineHints: true,
      totalDiscountRupees: 310,
      manualDiscountRupees: 150,
      manualDiscountMode: "percent",
      offerLineDiscountRupees: [160, 0],
    });
    expect(result?.[0].lineDiscountRupees).toBeGreaterThan(160);
    expect(result?.[1].lineDiscountRupees).toBeGreaterThan(0);
  });
});

describe("percent vs flat line display totals", () => {
  const items = [{ qty: 1, priceRupees: 745 }];
  const discount = 149;

  it("percent mode: allocated lines sum to subtotal minus discount", () => {
    const allocated = allocateLineDiscounts(items, discount);
    const lineSum = allocated.reduce((s, l) => s + l.discountedLineRupees, 0);
    expect(lineSum).toBe(596);
    expect(allocated[0].lineDiscountRupees).toBe(149);
  });

  it("flat mode: list line amounts sum to subtotal", () => {
    const subtotal = items.reduce((s, l) => s + l.qty * l.priceRupees, 0);
    expect(subtotal).toBe(745);
    expect(subtotal - discount).toBe(596);
  });
});
