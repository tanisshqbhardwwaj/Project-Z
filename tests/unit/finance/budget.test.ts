import { describe, it, expect } from "vitest";
import { calculateBudgetSummary } from "@/lib/finance/budget";

describe("budget", () => {
  it("calculates profit and utilization", () => {
    const summary = calculateBudgetSummary({
      contractAmountPaise: BigInt(50000000),
      budgetAmountPaise: BigInt(35000000),
      totalExpensesPaise: BigInt(28000000),
      vendorOutstandingPaise: BigInt(5500000),
      totalPaidPaise: BigInt(22500000),
    });

    expect(summary.remainingBudgetPaise).toBe(BigInt(7000000));
    expect(summary.expectedProfitPaise).toBe(BigInt(15000000));
    expect(summary.actualProfitPaise).toBe(BigInt(22000000));
    expect(summary.budgetUtilizationPercent).toBe(80);
  });
});
