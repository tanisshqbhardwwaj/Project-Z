"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customers/customer";

type ContractRow = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  startDate: string;
  endDate: string;
  billingCycle: string;
  amountPaise: string;
  visitsIncluded: number | null;
  nextServiceDate: string | null;
  status: string;
};

const BILLING_CYCLES = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];

export default function ServiceContractsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_contracts");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [billingCycle, setBillingCycle] = useState("YEARLY");
  const [amountRupees, setAmountRupees] = useState("");
  const [visitsIncluded, setVisitsIncluded] = useState("");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId ? queryKeys.modules.service.contracts(orgId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ contracts: ContractRow[] }>("/api/v1/service/contracts").then((r) =>
        Array.isArray(r) ? r : r.contracts ?? []
      ),
    enabled: !!orgId && enabled,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/service/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          startDate,
          endDate,
          billingCycle,
          amountPaise: Math.round(Number(amountRupees) * 100),
          visitsIncluded: visitsIncluded ? Number(visitsIncluded) : undefined,
        }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.service.contracts(orgId) });
      setCreateOpen(false);
    },
    onError: (e) => applyError(e),
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on AMC Contracts in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading contracts..." />;
  if (loadError) {
    return (
      <p className="text-destructive">
        {loadError instanceof Error ? loadError.message : "Failed to load contracts"}
      </p>
    );
  }

  const contracts = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AMC Contracts"
        description="Annual maintenance and recurring service agreements"
        actions={
          <Button size="lg" className="rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-5 w-5" />
            New contract
          </Button>
        }
      />

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contracts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contracts.length === 0 ? (
            <EmptyState icon={FileText} title="No contracts yet" description="Create an AMC contract for a customer.">
              <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
                New contract
              </Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contract</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Next visit</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        {formatCustomerLabel({ name: c.customerName, phone: c.customerPhone })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.startDate).toLocaleDateString("en-IN")} –{" "}
                        {new Date(c.endDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(c.amountPaise)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.nextServiceDate
                          ? new Date(c.nextServiceDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/service/contracts/${c.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>New AMC contract</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Contract name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Billing cycle</Label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" min={0} value={amountRupees} onChange={(e) => setAmountRupees(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Visits included (optional)</Label>
              <Input type="number" min={1} value={visitsIncluded} onChange={(e) => setVisitsIncluded(e.target.value)} className="rounded-xl" />
            </div>
            <Button
              className="rounded-xl"
              disabled={!name.trim() || !customerName.trim() || !amountRupees || createMutation.isPending}
              onClick={() => {
                clear();
                createMutation.mutate();
              }}
            >
              {createMutation.isPending ? "Creating…" : "Create contract"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
