"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatStorageBytes } from "@/lib/billing/plans";

type OrgRow = {
  id: string;
  name: string;
  businessType: string;
  shopSector: string | null;
  plan: string;
  subscriptionStatus: string;
  storageUsedBytes: string;
  storageQuotaBytes: string;
  setupFeeStatus: string;
  createdAt: string;
  members: { user: { name: string; email: string; phone: string | null } }[];
  planRequests: { toPlan: string }[];
};

export default function OpsCustomersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await apiFetch<{ items: OrgRow[] }>(
        `/api/v1/ops/organizations?${params.toString()}`
      );
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Customers</h2>
      <Input
        placeholder="Search shop, owner email, phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md rounded-xl"
      />
      {loading ? (
        <PageLoader label="Loading customers…" />
      ) : (
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Shop</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Storage</th>
                    <th className="p-3">Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((org) => {
                    const owner = org.members[0]?.user;
                    return (
                      <tr key={org.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <Link href={`/ops/customers/${org.id}`} className="font-medium underline">
                            {org.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {org.businessType}
                            {org.shopSector ? ` · ${org.shopSector}` : ""}
                          </p>
                        </td>
                        <td className="p-3">
                          {owner?.name ?? "—"}
                          <p className="text-xs text-muted-foreground">{owner?.email}</p>
                        </td>
                        <td className="p-3">
                          {org.plan}
                          {org.planRequests[0] ? (
                            <p className="text-xs text-amber-600">→ {org.planRequests[0].toPlan}</p>
                          ) : null}
                        </td>
                        <td className="p-3">{org.subscriptionStatus}</td>
                        <td className="p-3 text-xs">
                          {formatStorageBytes(org.storageUsedBytes)} /{" "}
                          {formatStorageBytes(org.storageQuotaBytes)}
                        </td>
                        <td className="p-3">{org.setupFeeStatus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
