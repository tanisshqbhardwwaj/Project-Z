"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { useActivePlan } from "@/hooks/use-active-plan";
import {
  canAccessReportFeature,
  minimumPlanLabelForReportFeature,
} from "@/lib/billing/report-entitlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import Link from "next/link";

type ReminderSettingsResponse = {
  settings: {
    enabled: boolean;
    minBalanceRupees: number;
    daysBetweenReminders: number;
    idleDaysBeforeReminder: number;
  };
  eligible: boolean;
  dueCount: number;
  dueTotalPaise: string;
};

export function PaymentReminderSettingsPanel({ orgId }: { orgId: string }) {
  const plan = useActivePlan();
  const role = useAuthStore((s) => s.role);
  const planOk = canAccessReportFeature(plan, "payment-reminders");
  const isOwner = role === "OWNER";
  const { error, clear, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.modules.shop.paymentReminders(orgId),
    queryFn: () =>
      apiFetch<ReminderSettingsResponse>("/api/v1/shop/payment-reminders/settings"),
    enabled: !!orgId && planOk && isOwner,
  });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/payment-reminders/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      clear();
      qc.invalidateQueries({ queryKey: queryKeys.modules.shop.paymentReminders(orgId) });
    },
    onError: (err) => applyError(err),
  });

  if (!planOk) {
    return (
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Payment reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Automatic udhaar reminders are on the{" "}
            {minimumPlanLabelForReportFeature("payment-reminders")} plan.
          </p>
          <Link href="/settings/billing">
            <Button variant="outline" size="sm" className="rounded-xl">
              View plans
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) return null;
  if (isLoading || !data) return null;

  const s = data.settings;

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Payment reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Daily alerts list customers due for a reminder. You send WhatsApp messages manually
          from each ledger.
          {data.dueCount > 0 ? (
            <>
              {" "}
              <span className="font-medium text-amber-700">
                {data.dueCount} due now ({formatINR(data.dueTotalPaise)} total).
              </span>
            </>
          ) : null}
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) =>
              saveMutation.mutate({ enabled: e.target.checked })
            }
            disabled={saveMutation.isPending}
          />
          Enable daily payment reminder alerts
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Min balance (₹)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={s.minBalanceRupees}
              className="h-10 rounded-xl"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== s.minBalanceRupees) {
                  saveMutation.mutate({ minBalanceRupees: v });
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Days between reminders</Label>
            <Input
              type="number"
              min={1}
              max={90}
              defaultValue={s.daysBetweenReminders}
              className="h-10 rounded-xl"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== s.daysBetweenReminders) {
                  saveMutation.mutate({ daysBetweenReminders: v });
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Idle days before remind</Label>
            <Input
              type="number"
              min={0}
              max={90}
              defaultValue={s.idleDaysBeforeReminder}
              className="h-10 rounded-xl"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== s.idleDaysBeforeReminder) {
                  saveMutation.mutate({ idleDaysBeforeReminder: v });
                }
              }}
            />
          </div>
        </div>

        <FormFeedback error={error} />
      </CardContent>
    </Card>
  );
}
