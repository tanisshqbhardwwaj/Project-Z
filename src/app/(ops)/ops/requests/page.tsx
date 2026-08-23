"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RequestRow = {
  id: string;
  fromPlan: string;
  toPlan: string;
  createdAt: string;
  organization: { id: string; name: string };
  createdBy: { name: string; email: string; phone: string | null };
};

export default function OpsRequestsPage() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<RequestRow[]>("/api/v1/ops/plan-requests");
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(requestId: string) {
    setActing(requestId);
    try {
      await apiFetch("/api/v1/ops/plan-requests", {
        method: "POST",
        body: JSON.stringify({ action: "approve", requestId }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  async function reject(requestId: string) {
    setActing(requestId);
    try {
      await apiFetch("/api/v1/ops/plan-requests", {
        method: "POST",
        body: JSON.stringify({ action: "reject", requestId }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  if (loading) return <PageLoader label="Loading requests…" />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Pending plan requests</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{r.organization.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.fromPlan} → {r.toPlan} · {r.createdBy.name} · {r.createdBy.email}
                    {r.createdBy.phone ? ` · ${r.createdBy.phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="rounded-xl"
                    disabled={acting === r.id}
                    onClick={() => approve(r.id)}
                  >
                    Mark paid & activate
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={acting === r.id}
                    onClick={() => reject(r.id)}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
