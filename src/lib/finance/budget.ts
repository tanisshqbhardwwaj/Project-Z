export interface BudgetSummary {
  contractAmountPaise: bigint;
  budgetAmountPaise: bigint;
  totalExpensesPaise: bigint;
  remainingBudgetPaise: bigint;
  expectedProfitPaise: bigint;
  actualProfitPaise: bigint;
  budgetUtilizationPercent: number;
  vendorOutstandingPaise: bigint;
  totalPaidPaise: bigint;
}

export function calculateBudgetSummary(input: {
  contractAmountPaise: bigint;
  budgetAmountPaise: bigint | null;
  totalExpensesPaise: bigint;
  vendorOutstandingPaise: bigint;
  totalPaidPaise: bigint;
}): BudgetSummary {
  const budget =
    input.budgetAmountPaise ?? input.contractAmountPaise;
  const remaining = budget - input.totalExpensesPaise;
  const expectedProfit = input.contractAmountPaise - budget;
  const actualProfit = input.contractAmountPaise - input.totalExpensesPaise;
  const utilization =
    budget > BigInt(0)
      ? (Number(input.totalExpensesPaise) / Number(budget)) * 100
      : 0;

  return {
    contractAmountPaise: input.contractAmountPaise,
    budgetAmountPaise: budget,
    totalExpensesPaise: input.totalExpensesPaise,
    remainingBudgetPaise: remaining,
    expectedProfitPaise: expectedProfit,
    actualProfitPaise: actualProfit,
    budgetUtilizationPercent: Math.round(utilization * 100) / 100,
    vendorOutstandingPaise: input.vendorOutstandingPaise,
    totalPaidPaise: input.totalPaidPaise,
  };
}
