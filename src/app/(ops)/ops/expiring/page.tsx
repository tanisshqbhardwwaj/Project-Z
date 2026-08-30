"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { OpsPageHeader } from "@/components/ops/ops-page-header";
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ops/ops-data-table";
import { OpsPlanPill, OpsStatusPill } from "@/components/ops/ops-status-pill";
import { cn } from "@/lib/utils";

type ExpiringOrg = {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  accessExpiresAt: string | null;
  expiresAt: string;
  expireReason: string;
  owner: { name: string; email: string; phone: string | null } | null;
};

export default function OpsExpiringPage() {
  const [items, setItems] = useState<ExpiringOrg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await apiFetch<{ expiringSoon: ExpiringOrg[] }>("/api/v1/ops/summary");
      setItems(summary.expiringSoon);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: OpsDataTableColumn<ExpiringOrg>[] = [
    {
      key: "org",
      header: "Organization",
      searchable: (row) => `${row.name} ${row.owner?.email ?? ""}`,
      cell: (org) => (
        <div>
          <Link href={`/ops/customers/${org.id}`} className="font-medium text-primary hover:underline">
            {org.name}
          </Link>
          <p className="text-xs text-muted-foreground">{org.owner?.name ?? "No owner"}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner contact",
      searchable: (row) => `${row.owner?.email ?? ""} ${row.owner?.phone ?? ""}`,
      cell: (org) => (
        <div className="text-sm">
          <p>{org.owner?.email ?? "—"}</p>
          {org.owner?.phone ? (
            <p className="text-xs text-muted-foreground">{org.owner.phone}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (org) => <OpsPlanPill plan={org.plan} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (org) => <OpsStatusPill status={org.subscriptionStatus} />,
    },
    {
      key: "reason",
      header: "Expiry type",
      cell: (org) => (
        <span className="text-xs capitalize text-muted-foreground">
          {org.expireReason.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      cell: (org) => {
        const expired = new Date(org.expiresAt) < new Date();
        return (
          <span className={cn("font-medium", expired && "text-destructive")}>
            {expired ? "Expired · " : ""}
            {new Date(org.expiresAt).toLocaleString("en-IN")}
          </span>
        );
      },
    },
  ];

  const upcoming = items.filter((o) => new Date(o.expiresAt) >= new Date());
  const expired = items.filter((o) => new Date(o.expiresAt) < new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <OpsPageHeader
        title="Expiring access"
        description="Organizations with trial period end or founder-set access expiry within 7 days, plus recently expired."
      />

      {loading ? (
        <PageLoader label="Loading expiring organizations…" />
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Within 7 days ({upcoming.length})
            </h3>
            <OpsDataTable
              rows={upcoming}
              columns={columns}
              searchPlaceholder="Search upcoming…"
              emptyMessage="No organizations expiring in the next 7 days."
            />
          </section>

          {expired.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-destructive">
                Already expired ({expired.length})
              </h3>
              <OpsDataTable
                rows={expired}
                columns={columns}
                searchPlaceholder="Search expired…"
                emptyMessage="No expired organizations."
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
