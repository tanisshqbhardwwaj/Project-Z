import { describe, expect, it } from "vitest";
import {
  getSortedPlanComparisonCategories,
  groupComparisonRows,
  isUniversalComparisonRow,
  minimumPlanTierIndex,
  sortComparisonRows,
} from "@/lib/billing/plan-comparison";
import { PLAN_ORDER } from "@/lib/billing/plans";

describe("sortComparisonRows", () => {
  it("puts universal rows before tiered rows in billing", () => {
    const billing = getSortedPlanComparisonCategories().find((c) => c.id === "billing")!;
    const returnsIdx = billing.rows.findIndex((r) => r.id === "returns");
    const invoiceIdx = billing.rows.findIndex((r) => r.id === "invoice-generation");
    expect(invoiceIdx).toBeLessThan(returnsIdx);
    expect(isUniversalComparisonRow(billing.rows[0])).toBe(true);
  });

  it("orders tiered rows by lowest unlock plan", () => {
    const inventory = getSortedPlanComparisonCategories().find((c) => c.id === "inventory")!;
    const importIdx = inventory.rows.findIndex((r) => r.id === "import-export");
    const barcodeIdx = inventory.rows.findIndex((r) => r.id === "barcode-scan");
    expect(minimumPlanTierIndex(inventory.rows.find((r) => r.id === "import-export")!)).toBe(1);
    expect(minimumPlanTierIndex(inventory.rows.find((r) => r.id === "barcode-scan")!)).toBe(2);
    expect(importIdx).toBeLessThan(barcodeIdx);
  });

  it("orders staff features Basic → Starter → Business → Professional", () => {
    const staff = getSortedPlanComparisonCategories().find((c) => c.id === "staff")!;
    const ids = staff.rows.map((r) => r.id);
    expect(ids.indexOf("staff")).toBeLessThan(ids.indexOf("attendance"));
    expect(ids.indexOf("attendance")).toBeLessThan(ids.indexOf("payroll"));
  });
});

describe("groupComparisonRows", () => {
  it("labels all-plan group first", () => {
    const billing = getSortedPlanComparisonCategories().find((c) => c.id === "billing")!;
    const groups = groupComparisonRows(billing.rows);
    expect(groups[0]?.label).toBe("Included on all plans");
    expect(groups[0]?.rows.every(isUniversalComparisonRow)).toBe(true);
  });

  it("uses unlock group for tiered features", () => {
    const staff = getSortedPlanComparisonCategories().find((c) => c.id === "staff")!;
    const groups = groupComparisonRows(staff.rows);
    expect(groups.some((g) => g.label === "Unlocks on higher plans")).toBe(true);
  });
});

describe("plan column order", () => {
  it("stays lowest to highest tier", () => {
    expect(PLAN_ORDER).toEqual(["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"]);
  });
});
