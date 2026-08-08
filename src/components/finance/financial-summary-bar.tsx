"use client";

import { MoneyDisplay } from "./money-display";

interface FinancialSummaryBarProps {
  contractPaise: bigint | string;
  spentPaise: bigint | string;
  remainingPaise: bigint | string;
  outstandingPaise: bigint | string;
}

export function FinancialSummaryBar({
  contractPaise,
  spentPaise,
  remainingPaise,
  outstandingPaise,
}: FinancialSummaryBarProps) {
  const items = [
    { label: "Tender Amount", value: contractPaise },
    { label: "Spent", value: spentPaise },
    { label: "Remaining", value: remainingPaise },
    { label: "Outstanding", value: outstandingPaise, highlight: true },
  ];

  return (
    <div className="sticky top-0 z-10 grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="text-center md:text-left">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <MoneyDisplay
            paise={item.value}
            className={item.highlight ? "text-amber-600" : "text-lg"}
          />
        </div>
      ))}
    </div>
  );
}
