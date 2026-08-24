"use client";

import Link from "next/link";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { cn } from "@/lib/utils";

export function CashierModeBanner() {
  const { active, isOwnerPreview, isRealCashier, homePath } = useCashierMode();

  if (!active) return null;

  return (
    <div
      className={cn(
        "print-hidden border-b px-3 py-1.5 text-center text-xs font-medium md:px-6",
        isOwnerPreview
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-vertical/20 bg-vertical-subtle text-foreground"
      )}
    >
      {isOwnerPreview ? (
        <>
          Cashier preview — simplified counter UI.{" "}
          <Link href="/settings/profile" className="underline underline-offset-2">
            Turn off
          </Link>
        </>
      ) : isRealCashier ? (
        <>
          Cashier mode —{" "}
          <Link href={homePath} className="underline underline-offset-2">
            New bill
          </Link>
          {" · "}
          <Link href="/cashier" className="underline underline-offset-2">
            Home
          </Link>
        </>
      ) : null}
    </div>
  );
}
