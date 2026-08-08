import { describe, it, expect } from "vitest";
import { buildVendorLedger, getVendorBalance } from "@/lib/finance/vendor-ledger";

describe("vendor-ledger", () => {
  it("builds ledger with partial payments", () => {
    const entries = buildVendorLedger({
      expenses: [
        {
          id: "1",
          expenseDate: new Date("2026-08-10"),
          description: "Paint",
          amountPaise: BigInt(2000000),
        },
      ],
      payments: [
        {
          id: "2",
          paymentDate: new Date("2026-08-12"),
          amountPaise: BigInt(1500000),
          paidByName: "Partner B",
          referenceNumber: null,
        },
        {
          id: "3",
          paymentDate: new Date("2026-08-15"),
          amountPaise: BigInt(500000),
          paidByName: "Owner",
          referenceNumber: null,
        },
      ],
    });

    expect(entries).toHaveLength(3);
    expect(getVendorBalance(entries)).toBe(BigInt(0));
    expect(entries[1].balancePaise).toBe(BigInt(500000));
  });
});
