"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoader } from "@/components/ui/page-loader";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectTabs } from "@/components/project/project-tabs";

type LedgerData = {
  vendor: { name: string };
  balance: string;
  entries: Array<{
    date: string;
    description: string;
    billPaise: string;
    paymentPaise: string;
    balancePaise: string;
  }>;
};

export default function ProjectVendorLedgerPage() {
  const params = useParams<{ id: string; vendorId: string }>();
  const { id, vendorId } = params;

  const { data: summary, loading: summaryLoading } = useFetch(`project:${id}:summary`, () =>
    apiFetch<{ project: { name: string } }>(`/api/v1/projects/${id}/summary`)
  );

  const { data: ledger, loading: ledgerLoading, error } = useFetch(
    `vendor:${vendorId}:ledger:${id}`,
    () => apiFetch<LedgerData>(`/api/v1/vendors/${vendorId}/ledger?projectId=${id}`)
  );

  if (summaryLoading || ledgerLoading) return <PageLoader label="Loading ledger..." />;
  if (error || !ledger || !summary) {
    return <p className="text-destructive">{error ?? "Ledger not found"}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/projects/${id}?tab=vendors`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to vendors
          </Link>
          <h1 className="text-2xl font-bold">{ledger.vendor.name}</h1>
          <p className="text-muted-foreground">{summary.project.name}</p>
        </div>
        <MoneyDisplay paise={ledger.balance} className="text-xl text-amber-600" />
      </div>

      <ProjectTabs projectId={id} activeTab="vendors" />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Ledger (this work order)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {ledger.entries.map((e, i) => (
            <div key={i} className="rounded-xl border p-4 text-sm">
              <div className="flex justify-between font-medium">
                <span>{new Date(e.date).toLocaleDateString("en-IN")}</span>
                <MoneyDisplay paise={e.balancePaise} />
              </div>
              <p className="mt-1 text-muted-foreground">{e.description}</p>
              <div className="mt-2 flex gap-4 text-xs">
                {BigInt(e.billPaise) > BigInt(0) && (
                  <span>
                    Bill: <MoneyDisplay paise={e.billPaise} />
                  </span>
                )}
                {BigInt(e.paymentPaise) > BigInt(0) && (
                  <span>
                    Paid: <MoneyDisplay paise={e.paymentPaise} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link href={`/expenses/new?projectId=${id}`}>
        <Button className="rounded-xl">Add Expense / Payment</Button>
      </Link>
    </div>
  );
}
