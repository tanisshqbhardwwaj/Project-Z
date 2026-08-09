"use client";

import Link from "next/link";
import { IndianRupee } from "lucide-react";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VendorTotalCardProps {
  vendorName: string;
  totalPaidPaise: string;
  projectId: string;
  vendorId: string;
}

export function VendorTotalCard({
  vendorName,
  totalPaidPaise,
  projectId,
  vendorId,
}: VendorTotalCardProps) {
  const hasPaid = BigInt(totalPaidPaise) > BigInt(0);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 bg-primary/5 shadow-lg ring-1 ring-primary/15">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:py-14">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <IndianRupee className="h-7 w-7" />
          </span>
          <p className="text-base text-muted-foreground">
            <span className="font-semibold text-foreground">{vendorName}</span> got from you
          </p>
          <MoneyDisplay paise={totalPaidPaise} className="mt-3 text-4xl font-bold text-primary sm:text-5xl" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {hasPaid
              ? "This is the total money you gave this vendor on this work order."
              : "You have not paid this vendor on this work order yet."}
          </p>
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
