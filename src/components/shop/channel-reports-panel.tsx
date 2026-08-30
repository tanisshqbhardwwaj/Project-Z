"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  ReportDateRangeBar,
  type ReportPeriodPreset,
} from "@/components/shop/report-date-range";

type ChannelSales = {
  channel: string;
  orderCount: number;
  grossPaise: string;
  commissionPaise: string;
  netPaise: string;
};

type ChannelSettings = {
  swiggyCommissionPercent?: number;
  zomatoCommissionPercent?: number;
  packagingChargePaise?: number;
};

type PayoutRow = {
  id: string;
  channel: string;
  periodStart: string;
  periodEnd: string;
  grossPaise: string;
  commissionPaise: string;
  netPayoutPaise: string;
  status: string;
};

const CHANNELS = ["SWIGGY", "ZOMATO", "OTHER_AGGREGATOR"];

export function ChannelReportsPanel() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [period, setPeriod] = useState<ReportPeriodPreset>("month");
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exactDate, setExactDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [payoutChannel, setPayoutChannel] = useState("SWIGGY");
  const [payoutStart, setPayoutStart] = useState(rangeFrom);
  const [payoutEnd, setPayoutEnd] = useState(rangeTo);
  const [grossRupees, setGrossRupees] = useState("");
  const [commissionRupees, setCommissionRupees] = useState("");
  const [netRupees, setNetRupees] = useState("");

  const queryString = useMemo(() => {
    if (period === "range") return `from=${rangeFrom}&to=${rangeTo}`;
    if (period === "date") return `period=date&date=${exactDate}`;
    return `period=${period}`;
  }, [period, rangeFrom, rangeTo, exactDate]);

  const salesQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.channels(orgId), "sales", queryString] : ["disabled"],
    queryFn: () =>
      apiFetch<{ channels: ChannelSales[] }>(
        `/api/v1/shop/channels?${queryString}&report=sales`
      ).then((r) => r.channels ?? []),
    enabled: !!orgId,
  });

  const settingsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.channels(orgId) : ["disabled"],
    queryFn: () => apiFetch<ChannelSettings>("/api/v1/shop/channels"),
    enabled: !!orgId,
  });

  const payoutsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.payouts(orgId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ payouts: PayoutRow[] }>("/api/v1/shop/payouts").then((r) => r.payouts ?? []),
    enabled: !!orgId,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (body: ChannelSettings) =>
      apiFetch("/api/v1/shop/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.channels(orgId) });
    },
    onError: (e) => applyError(e),
  });

  const createPayoutMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/shop/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: payoutChannel,
          periodStart: payoutStart,
          periodEnd: payoutEnd,
          grossPaise: Math.round(Number(grossRupees) * 100),
          commissionPaise: Math.round(Number(commissionRupees) * 100),
          netPayoutPaise: Math.round(Number(netRupees) * 100),
        }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.payouts(orgId) });
      setGrossRupees("");
      setCommissionRupees("");
      setNetRupees("");
    },
    onError: (e) => applyError(e),
  });

  if (salesQuery.isLoading) return <PageLoader label="Loading channel reports..." />;

  const channelSales = salesQuery.data ?? [];
  const settings = settingsQuery.data ?? {};
  const payouts = payoutsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Swiggy / Zomato channels</h2>
        <p className="text-sm text-muted-foreground">
          Online order sales split and payout reconciliation
        </p>
      </div>

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Sales by channel
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
        <CardContent>
          {channelSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channel sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Channel</th>
                    <th className="py-2 pr-4 font-medium">Orders</th>
                    <th className="py-2 pr-4 font-medium text-right">Gross</th>
                    <th className="py-2 pr-4 font-medium text-right">Commission</th>
                    <th className="py-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {channelSales.map((row) => (
                    <tr key={row.channel}>
                      <td className="py-2 pr-4 font-medium">{row.channel}</td>
                      <td className="py-2 pr-4">{row.orderCount}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatINR(row.grossPaise)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-amber-700">
                        {formatINR(row.commissionPaise)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatINR(row.netPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Channel settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Swiggy commission %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              defaultValue={settings.swiggyCommissionPercent ?? 22}
              id="swiggyPct"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Zomato commission %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              defaultValue={settings.zomatoCommissionPercent ?? 22}
              id="zomatoPct"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Packaging charge (₹)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={(settings.packagingChargePaise ?? 0) / 100}
              id="packaging"
              className="rounded-xl"
            />
          </div>
          <div className="sm:col-span-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                clear();
                const swiggy = document.getElementById("swiggyPct") as HTMLInputElement;
                const zomato = document.getElementById("zomatoPct") as HTMLInputElement;
                const packaging = document.getElementById("packaging") as HTMLInputElement;
                saveSettingsMutation.mutate({
                  swiggyCommissionPercent: Number(swiggy.value),
                  zomatoCommissionPercent: Number(zomato.value),
                  packagingChargePaise: Math.round(Number(packaging.value) * 100),
                });
              }}
            >
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Record payout reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={payoutChannel} onValueChange={setPayoutChannel}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period start</Label>
            <DatePicker value={payoutStart} onChange={setPayoutStart} />
          </div>
          <div className="space-y-2">
            <Label>Period end</Label>
            <DatePicker value={payoutEnd} onChange={setPayoutEnd} />
          </div>
          <div className="space-y-2">
            <Label>Gross payout (₹)</Label>
            <Input type="number" min={0} value={grossRupees} onChange={(e) => setGrossRupees(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Commission (₹)</Label>
            <Input type="number" min={0} value={commissionRupees} onChange={(e) => setCommissionRupees(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Net received (₹)</Label>
            <Input type="number" min={0} value={netRupees} onChange={(e) => setNetRupees(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex items-end">
            <Button
              className="rounded-xl"
              disabled={!grossRupees || !netRupees || createPayoutMutation.isPending}
              onClick={() => {
                clear();
                createPayoutMutation.mutate();
              }}
            >
              Save payout record
            </Button>
          </div>
        </CardContent>
      </Card>

      {payouts.length > 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>Recent payout records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium text-right">Net payout</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.slice(0, 10).map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.channel}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.periodStart).toLocaleDateString("en-IN")} –{" "}
                        {new Date(p.periodEnd).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatINR(p.netPayoutPaise)}
                      </td>
                      <td className="px-4 py-3">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
