"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { UsersRound } from "lucide-react";
import { PaymentReminderSettingsPanel } from "@/components/shop/payment-reminder-settings-panel";

type CustomerCredit = {
  id: string;
  customerName: string;
  phone: string | null;
  balancePaise: string;
  notes: string | null;
};

export default function ShopUdhaarPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_udhaar");
  const title = moduleLabel("shop_udhaar", activeBusinessType ?? "SHOPKEEPER");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});

  const creditsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.customers(orgId) : ["disabled"],
    queryFn: () => apiFetch<CustomerCredit[]>("/api/v1/shop/udhaar"),
    enabled: !!orgId && moduleEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/udhaar", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.customers(orgId) });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/udhaar", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.customers(orgId) });
    },
  });

  if (!moduleEnabled) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{title} is optional</h1>
        <p className="text-sm text-muted-foreground">
          Turn on {title.toLowerCase()} in Manage Organization → Features.
        </p>
        <Link href="/settings/organization">
          <Button className="rounded-xl">Manage Organization</Button>
        </Link>
      </div>
    );
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (customerName.trim().length < 2) return showWarning("Customer name is required");
    try {
      await createMutation.mutateAsync({
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        balanceRupees: openingBalance ? Number(openingBalance) : 0,
      });
      setCustomerName("");
      setPhone("");
      setOpeningBalance("");
    } catch (err) {
      applyError(err, "Failed to add customer");
    }
  }

  async function adjustCredit(creditId: string) {
    clear();
    const value = Number(adjustAmounts[creditId]);
    if (!Number.isFinite(value) || value === 0) {
      showWarning("Enter a non-zero adjustment amount");
      return;
    }
    try {
      await adjustMutation.mutateAsync({ creditId, deltaRupees: value });
      setAdjustAmounts((prev) => ({ ...prev, [creditId]: "" }));
    } catch (err) {
      applyError(err, "Failed to adjust balance");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Customer credit ledger (udhaar)</p>
      </div>

      <FormFeedback warning={warning} error={error} />

      {orgId ? <PaymentReminderSettingsPanel orgId={orgId} /> : null}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Add customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addCustomer} className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-12 rounded-xl" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Opening balance (₹)</Label>
                <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add customer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {creditsQuery.isLoading ? (
            <PageLoader label="Loading customers..." />
          ) : creditsQuery.error ? (
            <p className="text-sm text-destructive">
              {creditsQuery.error instanceof Error
                ? creditsQuery.error.message
                : "Failed to load ledger"}
            </p>
          ) : (creditsQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No customers yet"
              description="Add a customer above to start tracking their udhaar balance."
            />
          ) : (
            (creditsQuery.data ?? []).map((c) => (
              <div key={c.id} className="space-y-2 rounded-xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.customerName}</p>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    )}
                  </div>
                  <p className="font-semibold">{formatINR(c.balancePaise)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/shop/udhaar/${c.id}`}>
                    <Button type="button" variant="secondary" className="h-10 rounded-xl">
                      View ledger
                    </Button>
                  </Link>
                  <Input
                    type="number"
                    placeholder="± ₹ adjust"
                    value={adjustAmounts[c.id] ?? ""}
                    onChange={(e) =>
                      setAdjustAmounts((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    className="h-10 w-32 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => adjustCredit(c.id)}
                    disabled={adjustMutation.isPending}
                  >
                    Update
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
