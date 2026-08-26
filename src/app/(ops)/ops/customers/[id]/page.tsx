"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StorageUsageBar } from "@/components/billing/plan-cards";
import { formatStorageBytes } from "@/lib/billing/plans";

const PLANS = ["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"] as const;

export default function OpsCustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [plan, setPlan] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<any>(`/api/v1/ops/organizations/${id}`);
    setData(res);
    setPlan(res.org.plan);
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function activate() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/ops/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ plan, activatePlan: true }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function reactivate() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/ops/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ plan, reactivate: true }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function markSetup(status: "PAID" | "WAIVED") {
    await apiFetch(`/api/v1/ops/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ setupFeeStatus: status }),
    });
    await load();
  }

  if (!data) return <PageLoader label="Loading customer…" />;

  const org = data.org;
  const used = Number(org.storageUsedBytes);
  const quota = Number(org.storageQuotaBytes);
  const owner = org.members.find((m: { role: string }) => m.role === "OWNER")?.user;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ops/customers" className="text-sm text-muted-foreground underline">
          ← Customers
        </Link>
        <h2 className="mt-2 text-2xl font-semibold">{org.name}</h2>
        <p className="text-sm text-muted-foreground">
          {owner?.name} · {owner?.email} · {owner?.phone ?? "no phone"}
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Status: <strong>{org.subscriptionStatus}</strong> · Plan: <strong>{org.plan}</strong>
          </p>
          <StorageUsageBar
            usedLabel={formatStorageBytes(used)}
            quotaLabel={formatStorageBytes(quota)}
            percent={quota ? (used / quota) * 100 : 0}
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Assign plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="rounded-xl" disabled={saving} onClick={activate}>
              Activate after payment
            </Button>
            {org.subscriptionStatus === "CANCELLED" ? (
              <Button variant="secondary" className="rounded-xl" disabled={saving} onClick={reactivate}>
                Reactivate
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => markSetup("PAID")}>
              Mark setup paid
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => markSetup("WAIVED")}>
              Waive setup fee
            </Button>
          </div>
        </CardContent>
      </Card>

      {org.planRequests?.length ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Recent plan requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {org.planRequests.map((r: { id: string; fromPlan: string; toPlan: string; status: string; createdAt: string }) => (
              <div key={r.id} className="flex justify-between border-b py-2 last:border-0">
                <span>
                  {r.fromPlan} → {r.toPlan} ({r.status})
                </span>
                <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
