"use client";

import Link from "next/link";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type VendorGivenEntry = {
  date: string;
  description: string;
  paymentPaise: string;
};

interface VendorGivenHistoryProps {
  vendorName: string;
  totalPaidPaise: string;
  entries: VendorGivenEntry[];
  projectId: string;
  vendorId: string;
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VendorGivenHistory({
  vendorName,
  totalPaidPaise,
  entries,
  projectId,
  vendorId,
}: VendorGivenHistoryProps) {
  const payments = entries.filter((entry) => BigInt(entry.paymentPaise) > BigInt(0));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-0 bg-primary/5 shadow-md ring-1 ring-primary/15">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{vendorName}</span> got from you
          </p>
          <MoneyDisplay paise={totalPaidPaise} className="mt-1 text-3xl font-bold text-primary" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">What you gave</CardTitle>
          <p className="text-sm text-muted-foreground">Each line is money you paid, with the date.</p>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {payments.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No payments yet. Tap below when you give money to {vendorName}.
            </p>
          ) : (
            payments.map((entry, index) => (
              <div
                key={`${entry.date}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-green-50/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{formatDay(entry.date)}</p>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </div>
                <MoneyDisplay paise={entry.paymentPaise} className="shrink-0 text-lg text-green-700" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/payments/new?projectId=${projectId}&vendorId=${vendorId}`}>
          <Button className="h-12 w-full rounded-xl">Give money to {vendorName}</Button>
        </Link>
        <Link href={`/expenses/new?projectId=${projectId}&vendorId=${vendorId}`}>
          <Button variant="outline" className="h-12 w-full rounded-xl">
            Add a bill
          </Button>
        </Link>
      </div>
    </div>
  );
}
