import { describe, expect, it } from "vitest";
import {
  fiscalYearLabel,
  formatShopBillNumber,
  normalizeCashierCode,
} from "@/lib/shop/bill-number";

describe("fiscalYearLabel", () => {
  it("uses Apr–Mar fiscal year", () => {
    expect(fiscalYearLabel(new Date("2026-08-24"))).toBe("26-27");
    expect(fiscalYearLabel(new Date("2026-03-31"))).toBe("25-26");
    expect(fiscalYearLabel(new Date("2026-04-01"))).toBe("26-27");
  });
});

describe("formatShopBillNumber", () => {
  it("formats INV-(cashier code)-FY-seq", () => {
    expect(
      formatShopBillNumber({
        prefix: "inv",
        cashierCode: "4",
        fiscalYear: "26-27",
        sequence: 18,
      })
    ).toBe("INV-4-26-27-00018");
  });

  it("falls back to 00 when cashier code is missing", () => {
    expect(
      formatShopBillNumber({
        prefix: "INV",
        cashierCode: null,
        fiscalYear: "26-27",
        sequence: 1,
      })
    ).toBe("INV-00-26-27-00001");
  });
});

describe("normalizeCashierCode", () => {
  it("uppercases and strips invalid characters", () => {
    expect(normalizeCashierCode(" c4 ")).toBe("C4");
    expect(normalizeCashierCode("")).toBe("00");
  });
});
