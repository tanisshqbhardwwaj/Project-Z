"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";

type LedgerData = {
  credit: {
    id: string;
    customerName: string;
    phone: string | null;
    balancePaise: string;
    totalPurchasesPaise: string;
    creditLimitPaise: string | null;
  };
  outstandingSales: Array<{
    id: string;
    billNumber: string | null;
    totalPaise: string;
    paidAmountPaise: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  entries: Array<{
    id: string;
    type: string;
    amountPaise: string;
    balanceAfterPaise: string;
    createdAt: string;
    notes: string | null;
    shopSale: { billNumber: string | null } | null;
    createdBy: { name: string };
  }>;
};

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.creditLedger(orgId, id) : ["disabled"],
    queryFn: () => apiFetch<LedgerData>(`/api/v1/shop/udhaar/${id}/ledger`),
    enabled: !!orgId && !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/udhaar/payments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.creditLedger(orgId, id) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.customers(orgId) });
      }
      setPaymentAmount("");
    },
  });

  if (isLoading) return <PageLoader label="Loading ledger..." />;
  if (!data) return <p className="p-8">Customer not found</p>;

  const { credit, entries, outstandingSales } = data;
  const paidTotal = Number(credit.totalPurchasesPaise) - Number(credit.balancePaise);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    clear();
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) return showWarning("Enter payment amount");
    try {
      await paymentMutation.mutateAsync({ creditId: credit.id, amountRupees: amt });
    } catch (err) {
      applyError(err, "Failed to record payment");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{credit.customerName}</h1>
          <p className="text-sm text-muted-foreground">{credit.phone ?? "No phone"}</p>
        </div>
        <Link href="/shop/udhaar"><Button variant="outline" className="rounded-xl">Back</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total purchases</p><p className="text-xl font-bold">{formatINR(credit.totalPurchasesPaise)}</p></CardContent></Card>
        <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total paid</p><p className="text-xl font-bold">{formatINR(paidTotal)}</p></CardContent></Card>
        <Card className="rounded-2xl border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-amber-600">{formatINR(credit.balancePaise)}</p></CardContent></Card>
      </div>

      <FormFeedback warning={warning} error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader><CardTitle className="text-lg">Record payment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={recordPayment} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label>Amount ₹</Label>
              <Input type="number" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <Button type="submit" className="mt-6 rounded-xl" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? "Saving…" : "Record"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {outstandingSales.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Outstanding invoices</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {outstandingSales.map((s) => (
              <div key={s.id} className="flex justify-between rounded-lg border p-2">
                <Link href={`/shop/invoices/${s.id}`} className="font-medium hover:underline">
                  {s.billNumber ?? s.id.slice(0, 8)}
                </Link>
                <span>
                  {formatINR(s.paidAmountPaise)} / {formatINR(s.totalPaise)} · {s.paymentStatus}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader><CardTitle className="text-lg">Payment history</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {entries.map((e) => (
                <li key={e.id} className="flex justify-between border-b pb-2">
                  <span>{e.type} · {e.shopSale?.billNumber ?? e.notes ?? "—"} · {e.createdBy.name}</span>
                  <span>{formatINR(e.amountPaise)} · Bal {formatINR(e.balanceAfterPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
