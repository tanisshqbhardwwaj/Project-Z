"use client";

import Link from "next/link";
import { useCashierMode } from "@/hooks/use-cashier-mode";

export function CashierModeBanner() {
  const { active, isRealCashier, homePath } = useCashierMode();

  if (!active || !isRealCashier) return null;

  return (
    <div className="print-hidden border-b border-vertical/20 bg-vertical-subtle px-3 py-1.5 text-center text-xs font-medium text-foreground md:px-6">
      Cashier mode —{" "}
      <Link href={homePath} className="underline underline-offset-2">
        New bill
      </Link>
      {" · "}
      <Link href="/cashier" className="underline underline-offset-2">
        Home
      </Link>
    </div>
  );
}
