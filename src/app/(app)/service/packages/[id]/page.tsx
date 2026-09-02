"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gift, ShoppingCart } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customers/customer";

type PackageDetail = {
  id: string;
  name: string;
  type: string;
  pricePaise: string;
  sessionCount: number | null;
  prepaidValuePaise: string | null;
  validityDays: number | null;
  isActive: boolean;
  customerPackages: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    status: string;
    remainingSessions: number | null;
    remainingValuePaise: string | null;
    expiresAt: string | null;
    purchasedAt: string;
  }>;
};

export default function ServicePackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_packages");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [sellOpen, setSellOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId && id ? queryKeys.modules.service.package(orgId, id) : ["disabled"],
    queryFn: () => apiFetch<PackageDetail>(`/api/v1/service/packages/${id}`),
    enabled: !!orgId && !!id && enabled,
  });

  const sellMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ saleId?: string }>("/api/v1/service/customer-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
        }),
      }),
    onSuccess: (result) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.package(orgId, id!) });
      }
      setSellOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      if (result.saleId) window.location.href = `/shop/invoices/${result.saleId}`;
    },
    onError: (e) => applyError(e),
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Packages in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading package..." />;
  if (loadError || !data) {
    return (
      <p className="text-destructive">
        {loadError instanceof Error ? loadError.message : "Package not found"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/service/packages"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to packages
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.type.replace(/_/g, " ")}</p>
          </div>
          <Button className="rounded-xl" onClick={() => setSellOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sell package
          </Button>
        </div>
      </div>

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Package details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Price: </span>
            {formatINR(data.pricePaise)}
          </p>
          {data.sessionCount ? (
            <p>
              <span className="text-muted-foreground">Sessions: </span>
              {data.sessionCount}
            </p>
          ) : null}
          {data.validityDays ? (
            <p>
              <span className="text-muted-foreground">Validity: </span>
              {data.validityDays} days
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Status: </span>
            <Badge variant={data.isActive ? "default" : "secondary"} className="ml-1">
              {data.isActive ? "Active" : "Inactive"}
            </Badge>
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Customer balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.customerPackages.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No customers have purchased this package yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Purchased</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.customerPackages.map((cp) => (
                    <tr key={cp.id}>
                      <td className="px-4 py-3">
                        {formatCustomerLabel({ name: cp.customerName, phone: cp.customerPhone })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(cp.purchasedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        {cp.remainingSessions != null
                          ? `${cp.remainingSessions} sessions`
                          : cp.remainingValuePaise
                            ? formatINR(cp.remainingValuePaise)
                            : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{cp.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sell {data.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellCustomer">Customer name</Label>
              <Input
                id="sellCustomer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellPhone">Phone</Label>
              <Input
                id="sellPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              className="rounded-xl"
              disabled={!customerName.trim() || sellMutation.isPending}
              onClick={() => {
                clear();
                sellMutation.mutate();
              }}
            >
              {sellMutation.isPending ? "Processing…" : `Sell for ${formatINR(data.pricePaise)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
