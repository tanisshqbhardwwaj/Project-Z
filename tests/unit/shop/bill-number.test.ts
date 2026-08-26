import { describe, expect, it } from "vitest";
import {
  deriveStoreCode,
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

describe("deriveStoreCode", () => {
  it("uses word initials", () => {
    expect(deriveStoreCode("Bharatdarsh Fashion")).toBe("BF");
    expect(deriveStoreCode("Sri Balaji Traders")).toBe("SBT");
  });

  it("handles single-word and empty names", () => {
    expect(deriveStoreCode("Zudio")).toBe("ZU");
    expect(deriveStoreCode("")).toBe("Z");
    expect(deriveStoreCode(null)).toBe("Z");
  });
});

describe("formatShopBillNumber", () => {
  it("formats STORE/FY/CASHIER/SEQ", () => {
    expect(
      formatShopBillNumber({
        storeCode: "bf",
        cashierCode: "r2",
        fiscalYear: "26-27",
        sequence: 42,
      })
    ).toBe("BF/26-27/R2/0042");
  });

  it("falls back to 00 when cashier code is missing", () => {
    expect(
      formatShopBillNumber({
        storeCode: "BF",
        cashierCode: null,
        fiscalYear: "26-27",
        sequence: 1,
      })
    ).toBe("BF/26-27/00/0001");
  });

  it("stays within the 16-character GST limit", () => {
    const bill = formatShopBillNumber({
      storeCode: "LONGSTORE",
      cashierCode: "R9",
      fiscalYear: "26-27",
      sequence: 9999,
    });
    expect(bill.length).toBeLessThanOrEqual(16);
    expect(bill).toBe("LO/26-27/R9/9999");
  });
});

describe("normalizeCashierCode", () => {
  it("uppercases and strips invalid characters", () => {
    expect(normalizeCashierCode(" c4 ")).toBe("C4");
    expect(normalizeCashierCode("")).toBe("00");
  });
});
