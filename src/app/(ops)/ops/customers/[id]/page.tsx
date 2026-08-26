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
<<<<<<< HEAD
  const [loadError, setLoadError] = useState<string | null>(null);
=======
>>>>>>> origin/master

  const load = useCallback(async () => {
    const res = await apiFetch<any>(`/api/v1/ops/organizations/${id}`);
    setData(res);
    setPlan(res.org.plan);
  }, [id]);

  useEffect(() => {
<<<<<<< HEAD
    setLoadError(null);
    load().catch((err) => {
      setLoadError(err instanceof Error ? err.message : "Failed to load customer");
    });
=======
    load().catch(() => {});
>>>>>>> origin/master
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

<<<<<<< HEAD
  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <div>
            <h2 className="text-xl font-semibold">Could not load customer</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Button
            className="rounded-xl"
            onClick={() => {
              setLoadError(null);
              load().catch((err) => {
                setLoadError(
                  err instanceof Error ? err.message : "Failed to load customer"
                );
              });
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    return <PageLoader label="Loading customer…" />;
  }
=======
  if (!data) return <PageLoader label="Loading customer…" />;
>>>>>>> origin/master

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
<<<<<<< HEAD
        <p className="mt-1 text-xs text-muted-foreground">
          {org.memberCount ?? org.members?.length ?? 0} members ·{" "}
          {org.staffCount ?? 0} staff · {org.adminCount ?? 1} owner/admin
          {org.onboardingCompleteAt ? " · Onboarding complete" : " · Onboarding pending"}
        </p>
=======
>>>>>>> origin/master
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

<<<<<<< HEAD
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {org.members.map(
                (m: {
                  id: string;
                  role: string;
                  status: string;
                  joinedAt: string | null;
                  user: {
                    name: string;
                    email: string;
                  };
                }) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </td>
                    <td className="py-2.5 pr-4">{m.role}</td>
                    <td className="py-2.5 pr-4">{m.status}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {m.joinedAt
                        ? new Date(m.joinedAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

=======
>>>>>>> origin/master
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
