"use client";

import { MoneyDisplay } from "./money-display";

interface FinancialSummaryBarProps {
  contractPaise: bigint | string;
  spentPaise: bigint | string;
  remainingPaise: bigint | string;
}

export function FinancialSummaryBar({
  contractPaise,
  spentPaise,
  remainingPaise,
}: FinancialSummaryBarProps) {
  const items = [
    { label: "Tender Amount", value: contractPaise },
    { label: "Spent", value: spentPaise },
    { label: "Remaining", value: remainingPaise },
  ];

  return (
    <div className="sticky top-0 z-10 grid grid-cols-3 gap-2 rounded-xl border bg-card p-3 shadow-sm sm:gap-3 sm:p-4">
      {items.map((item) => (
        <div key={item.label} className="text-center md:text-left">
          <p className="text-xs text-muted-foreground sm:text-sm">{item.label}</p>
          <MoneyDisplay paise={item.value} className="text-base sm:text-lg" />
        </div>
      ))}
    </div>
  );
}
