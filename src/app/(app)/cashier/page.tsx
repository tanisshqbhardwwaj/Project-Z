"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { cashierModeSummary } from "@/lib/staff/cashier-mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Receipt } from "lucide-react";

export default function CashierHomePage() {
  const userName = useAuthStore((s) => s.user?.name);
  const { access, navItems, homePath, isOwnerPreview, isRealCashier, staffName } =
    useCashierMode();

  const summary = cashierModeSummary(access);
  const hasAnyAccess =
    access.canBill ||
    access.canProcessReturns ||
    access.canViewOwnSales ||
    access.canViewOwnAttendance;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Cashier mode
        </p>
        <h1 className="text-2xl font-bold">
          Hello{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        {isRealCashier && staffName ? (
          <p className="text-sm text-muted-foreground">Staff profile: {staffName}</p>
        ) : null}
        {isOwnerPreview ? (
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Preview mode — you still have owner access. Turn off in Profile → Cashier preview.
          </p>
        ) : null}
      </div>

      {!hasAnyAccess ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Waiting for permissions
              </p>
              <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
                Ask the shop owner to open Staff → your profile → Login access, and turn on
                billing (and anything else you need).
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Link href={homePath}>
          <Button size="lg" className="h-14 w-full rounded-2xl text-base">
            <Receipt className="mr-2 h-5 w-5" />
            {access.canBill ? "Start new bill" : "Open workspace"}
          </Button>
        </Link>
      )}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What you can do</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {summary.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-muted-foreground">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {navItems.length > 0 ? (
        <div className="grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vertical-subtle text-vertical">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}

      <Card className="rounded-2xl border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Not in cashier mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Owners use the full dashboard, inventory, offers, purchases, and reports.</p>
          <p>Cashiers only see billing tools their owner enables — nothing else in the sidebar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
