"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Truck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/finance/money";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

type PurchaseRow = {
  id: string;
  purchaseDate: string;
  billNumber: string | null;
  totalPaise: string;
  paymentStatus: string;
  supplier: { id: string; name: string };
  createdBy: { name: string };
  _count: { items: number };
};

type PurchaseList = {
  items: PurchaseRow[];
  total: number;
  page: number;
  pageSize: number;
};

export default function PurchasesPage() {
  const { activeBusinessType, activeOrganizationId, enabledModules, role } = useAuthStore();
  const orgId = activeOrganizationId;
  const enabled = isModuleEnabled(enabledModules, "shop_purchases");
  const canManage = hasPermission(role as OrgRole, "shop.purchase.manage");
  const title = moduleLabel("shop_purchases", activeBusinessType ?? "SHOPKEEPER");

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("q", search.trim());
    if (paymentFilter) p.set("paymentStatus", paymentFilter);
    p.set("page", String(page));
    return `?${p.toString()}`;
  }, [search, paymentFilter, page]);

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.purchases(orgId), search, paymentFilter, page] : ["disabled"],
    queryFn: () => apiFetch<PurchaseList>(`/api/v1/shop/purchases${queryString}`),
    enabled: !!orgId && enabled,
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading purchases..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load purchases"}
      </p>
    );
  }

  const purchases = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Purchase history and stock receiving</p>
        </div>
        {canManage && (
          <Link href="/shop/purchases/new">
            <Button size="lg" className="rounded-xl">
              <Plus className="mr-2 h-5 w-5" />
              New purchase
            </Button>
          </Link>
        )}
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Purchase history
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search supplier or bill number…"
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">All payment status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partially paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Supplier</th>
                    <th className="pb-2 pr-3 font-medium">Bill #</th>
                    <th className="pb-2 pr-3 font-medium">Items</th>
                    <th className="pb-2 pr-3 font-medium">Total</th>
                    <th className="pb-2 pr-3 font-medium">Payment</th>
                    <th className="pb-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <Link href={`/shop/purchases/${p.id}`} className="font-medium hover:underline">
                          {new Date(p.purchaseDate).toLocaleDateString("en-IN")}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">{p.supplier.name}</td>
                      <td className="py-3 pr-3">{p.billNumber ?? "—"}</td>
                      <td className="py-3 pr-3">{p._count.items}</td>
                      <td className="py-3 pr-3">{formatINR(Number(p.totalPaise))}</td>
                      <td className="py-3 pr-3">{p.paymentStatus.replace("_", " ")}</td>
                      <td className="py-3">{p.createdBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
