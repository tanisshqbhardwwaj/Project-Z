"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ReportDateRangeBar,
  type ReportPeriodPreset,
} from "@/components/shop/report-date-range";
import { formatINR } from "@/lib/finance/money";

type CommissionRow = {
  staffId: string;
  staffName: string;
  serviceCount: number;
  salesPaise: string;
  commissionPaise: string;
};

export default function ServiceCommissionsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_commissions");
  const [period, setPeriod] = useState<ReportPeriodPreset>("month");
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exactDate, setExactDate] = useState(() => new Date().toISOString().slice(0, 10));

  const queryString = useMemo(() => {
    if (period === "range") return `from=${rangeFrom}&to=${rangeTo}`;
    if (period === "date") return `period=date&date=${exactDate}`;
    return `period=${period}`;
  }, [period, rangeFrom, rangeTo, exactDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.service.commissions(orgId, queryString) : ["disabled"],
    queryFn: () =>
      apiFetch<{ rows: CommissionRow[]; totals?: { salesPaise: string; commissionPaise: string } }>(
        `/api/v1/service/commissions?${queryString}`
      ),
    enabled: !!orgId && enabled,
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Commissions in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading commissions..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load commissions"}
      </p>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff commissions"
        description="Service earnings and commission by staff member"
      />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Period
          </CardTitle>
          <ReportDateRangeBar
            preset={period}
            onPresetChange={setPeriod}
            date={exactDate}
            onDateChange={setExactDate}
            from={rangeFrom}
            to={rangeTo}
            onFromChange={setRangeFrom}
            onToChange={setRangeTo}
            presets={["today", "week", "month", "range"]}
          />
        </CardHeader>
        {data?.totals ? (
          <CardContent className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total service sales</p>
              <p className="text-lg font-bold">{formatINR(data.totals.salesPaise)}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total commission</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatINR(data.totals.commissionPaise)}
              </p>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={Percent}
              title="No commission data"
              description="Complete service appointments to see staff earnings."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Services</th>
                    <th className="px-4 py-3 font-medium text-right">Sales</th>
                    <th className="px-4 py-3 font-medium text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.staffId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.staffName}</td>
                      <td className="px-4 py-3">{row.serviceCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatINR(row.salesPaise)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">
                        {formatINR(row.commissionPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
