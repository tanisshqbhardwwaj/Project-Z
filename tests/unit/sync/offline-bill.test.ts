import { describe, expect, it } from "vitest";
import { SYNC_KINDS } from "@/lib/sync/kinds";
import { formatShopBillNumber, fiscalYearLabel } from "@/lib/shop/bill-number";

describe("sync kinds", () => {
  it("covers shop writes that go through the outbox", () => {
    expect(SYNC_KINDS).toContain("sale.create");
    expect(SYNC_KINDS).toContain("return.create");
    expect(SYNC_KINDS).toContain("udhaar.payment");
  });
});

describe("offline bill numbers", () => {
  it("embeds cashier code and fiscal year", () => {
    expect(
      formatShopBillNumber({
        storeCode: "BF",
        cashierCode: "R2",
        fiscalYear: "26-27",
        sequence: 18,
      })
    ).toBe("BF/26-27/R2/0018");
  });

  it("uses Apr–Mar fiscal year", () => {
    expect(fiscalYearLabel(new Date("2026-08-24"))).toBe("26-27");
  });
});
