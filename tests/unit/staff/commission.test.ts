import { describe, it, expect } from "vitest";
import {
  commissionForSale,
  describeCommission,
  type CommissionConfig,
} from "@/services/staff-commission.service";

const percent = (value: number): CommissionConfig => ({
  commissionType: "PERCENT",
  commissionPercent: value,
  commissionAmountPaise: null,
});

const perSale = (rupees: number): CommissionConfig => ({
  commissionType: "FIXED_PER_SALE",
  commissionPercent: null,
  commissionAmountPaise: BigInt(Math.round(rupees * 100)),
});

const perItem = (rupees: number): CommissionConfig => ({
  commissionType: "FIXED_PER_ITEM",
  commissionPercent: null,
  commissionAmountPaise: BigInt(Math.round(rupees * 100)),
});

const perMonth = (rupees: number): CommissionConfig => ({
  commissionType: "FIXED_MONTHLY",
  commissionPercent: null,
  commissionAmountPaise: BigInt(Math.round(rupees * 100)),
});

const noCommission: CommissionConfig = {
  commissionType: "NONE",
  commissionPercent: null,
  commissionAmountPaise: null,
};

describe("commissionForSale — no commission", () => {
  it("pays nothing when commission is switched off", () => {
    expect(
      commissionForSale(noCommission, {
        eligiblePaise: BigInt(5_000_000),
        saleTotalPaise: BigInt(5_000_000),
        eligibleItemCount: 5,
      })
    ).toBe(BigInt(0));
  });

  it("pays nothing when a percentage was never entered", () => {
    expect(
      commissionForSale(percent(0), {
        eligiblePaise: BigInt(5_000_000),
        saleTotalPaise: BigInt(5_000_000),
        eligibleItemCount: 5,
      })
    ).toBe(BigInt(0));
  });
});

describe("commissionForSale — percentage", () => {
  it("pays 2% of a ₹50,000 sale as ₹1,000", () => {
    expect(
      commissionForSale(percent(2), {
        eligiblePaise: BigInt(5_000_000),
        saleTotalPaise: BigInt(5_000_000),
        eligibleItemCount: 10,
      })
    ).toBe(BigInt(100_000));
  });

  it("handles fractional percentages", () => {
    expect(
      commissionForSale(percent(2.5), {
        eligiblePaise: BigInt(1_000_000),
        saleTotalPaise: BigInt(1_000_000),
        eligibleItemCount: 1,
      })
    ).toBe(BigInt(25_000));
  });

  it("pays only on the part the customer kept after a partial return", () => {
    // ₹3,000 bill, ₹1,000 returned → 2% of the remaining ₹2,000.
    expect(
      commissionForSale(percent(2), {
        eligiblePaise: BigInt(200_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 2,
      })
    ).toBe(BigInt(4_000));
  });

  it("pays nothing on a fully returned sale", () => {
    expect(
      commissionForSale(percent(2), {
        eligiblePaise: BigInt(0),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 0,
      })
    ).toBe(BigInt(0));
  });
});

describe("commissionForSale — fixed per sale", () => {
  it("pays the flat amount on an untouched sale", () => {
    expect(
      commissionForSale(perSale(25), {
        eligiblePaise: BigInt(300_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 3,
      })
    ).toBe(BigInt(2_500));
  });

  it("pro-rates the flat amount after a partial return", () => {
    // Two thirds of the bill value survived → two thirds of ₹25.
    expect(
      commissionForSale(perSale(25), {
        eligiblePaise: BigInt(200_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 2,
      })
    ).toBe(BigInt(1_666));
  });

  it("pays nothing once the whole sale comes back", () => {
    expect(
      commissionForSale(perSale(25), {
        eligiblePaise: BigInt(0),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 0,
      })
    ).toBe(BigInt(0));
  });

  it("pays the full flat amount when an exchange raised the value", () => {
    expect(
      commissionForSale(perSale(25), {
        eligiblePaise: BigInt(320_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 3,
      })
    ).toBe(BigInt(2_500));
  });
});

describe("commissionForSale — fixed per item", () => {
  it("pays per item kept", () => {
    expect(
      commissionForSale(perItem(10), {
        eligiblePaise: BigInt(300_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 3,
      })
    ).toBe(BigInt(3_000));
  });

  it("drops the returned item from the count", () => {
    expect(
      commissionForSale(perItem(10), {
        eligiblePaise: BigInt(200_000),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: 2,
      })
    ).toBe(BigInt(2_000));
  });

  it("never goes negative on an over-returned line", () => {
    expect(
      commissionForSale(perItem(10), {
        eligiblePaise: BigInt(0),
        saleTotalPaise: BigInt(300_000),
        eligibleItemCount: -1,
      })
    ).toBe(BigInt(0));
  });
});

describe("describeCommission", () => {
  it("explains each configuration in plain words", () => {
    expect(describeCommission(noCommission)).toBe("No commission");
    expect(describeCommission(percent(2))).toBe("2% of eligible sales");
    expect(describeCommission(perSale(25))).toBe("₹25 per sale");
    expect(describeCommission(perItem(10))).toBe("₹10 per item");
    expect(describeCommission(perMonth(500))).toBe("₹500 per month");
  });

  it("flags an unfinished configuration", () => {
    expect(describeCommission(percent(0))).toBe("Percentage (not set)");
  });
});
