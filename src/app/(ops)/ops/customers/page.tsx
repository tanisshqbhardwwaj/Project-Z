"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { OpsPageHeader } from "@/components/ops/ops-page-header";
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ops/ops-data-table";
import { OpsPlanPill, OpsStatusPill } from "@/components/ops/ops-status-pill";
import { formatStorageBytes } from "@/lib/billing/plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  currentPeriodEnd: string | null;
  accessExpiresAt: string | null;
  createdAt: string;
  members: { user: { name: string; email: string; phone: string | null } }[];
  planRequests: { toPlan: string }[];
};

const PLANS = ["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"] as const;
const STATUSES = ["TRIAL", "PENDING_PAYMENT", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;

export default function OpsCustomersPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [plan, setPlan] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [items, setItems] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (plan !== "all") params.set("plan", plan);
      if (status !== "all") params.set("status", status);
      const res = await apiFetch<{ items: OrgRow[] }>(
        `/api/v1/ops/organizations?${params.toString()}`
      );
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [q, plan, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  const columns = useMemo<OpsDataTableColumn<OrgRow>[]>(
    () => [
      {
        key: "shop",
        header: "Organization",
        searchable: (row) =>
          `${row.name} ${row.businessType} ${row.members[0]?.user?.email ?? ""}`,
        cell: (org) => (
          <div>
            <Link href={`/ops/customers/${org.id}`} className="font-medium text-primary hover:underline">
              {org.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {org.businessType}
              {org.shopSector ? ` · ${org.shopSector}` : ""}
            </p>
          </div>
        ),
      },
      {
        key: "owner",
        header: "Owner",
        searchable: (row) =>
          `${row.members[0]?.user?.name ?? ""} ${row.members[0]?.user?.email ?? ""} ${row.members[0]?.user?.phone ?? ""}`,
        cell: (org) => {
          const owner = org.members[0]?.user;
          return (
            <div>
              <p>{owner?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{owner?.email}</p>
            </div>
          );
        },
      },
      {
        key: "plan",
        header: "Plan",
        cell: (org) => (
          <div className="space-y-1">
            <OpsPlanPill plan={org.plan} />
            {org.planRequests[0] ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                → {org.planRequests[0].toPlan}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (org) => <OpsStatusPill status={org.subscriptionStatus} />,
      },
      {
        key: "expires",
        header: "Expires",
        cell: (org) => {
          const date = org.accessExpiresAt ?? org.currentPeriodEnd;
          if (!date) return <span className="text-muted-foreground">—</span>;
          const expired = new Date(date) < new Date();
          return (
            <span className={expired ? "text-destructive" : undefined}>
              {new Date(date).toLocaleDateString("en-IN")}
            </span>
          );
        },
      },
      {
        key: "storage",
        header: "Storage",
        cell: (org) => (
          <span className="text-xs">
            {formatStorageBytes(org.storageUsedBytes)} / {formatStorageBytes(org.storageQuotaBytes)}
          </span>
        ),
      },
      {
        key: "setup",
        header: "Setup",
        cell: (org) => org.setupFeeStatus,
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <OpsPageHeader
        title="Organizations"
        description="Search and filter customer organizations. Owner contact only — no shop financial data."
      />

      {loading && items.length === 0 ? (
        <PageLoader label="Loading organizations…" />
      ) : (
        <OpsDataTable
          rows={items}
          columns={columns}
          searchPlaceholder="Filter loaded results…"
          emptyMessage="No organizations match your filters."
          toolbar={
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Server search…"
                className="h-10 rounded-xl border bg-background px-3 text-sm md:w-48"
              />
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-36 rounded-xl">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
    </div>
  );
}
