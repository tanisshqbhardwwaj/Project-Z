"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { DesktopOnlyNote } from "@/components/layout/desktop-only-note";
import { PlanCards, StorageUsageBar, type PlanCardData } from "@/components/billing/plan-cards";
import {
  SettingsCardGrid,
  SettingsPageHeader,
} from "@/components/settings/settings-page-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BillingMe = {
  organizationName: string;
  plan: string;
  planName: string;
  monthlyLabel: string;
  subscriptionStatus: string;
  storageUsedLabel: string;
  storageQuotaLabel: string;
  storageUsedBytes: string;
  storageQuotaBytes: string;
  inventorySkuCount: number;
  inventorySkuCap: number | null;
  inventorySkuUsagePercent: number | null;
  setupFeePaise: string | null;
  setupFeeStatus: string;
  earlyBirdSetup: boolean;
  cancelledAt: string | null;
  pendingRequest: { toPlan: string } | null;
};

export default function BillingSettingsPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const activeOrganizationName = useAuthStore((s) => s.activeOrganizationName);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [billingContact, setBillingContact] = useState("");
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const { error, warning, clear, applyError, showWarning } = useFormFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    clear();
    try {
      const [plansRes, meRes] = await Promise.all([
        apiFetch<{ plans: PlanCardData[]; billingContact: string }>("/api/v1/billing/plans"),
        apiFetch<BillingMe>("/api/v1/billing/me"),
      ]);
      setPlans(plansRes.plans);
      setBillingContact(plansRes.billingContact);
      setMe(meRes);
    } catch (e) {
      applyError(e);
    } finally {
      setLoading(false);
    }
  }, [applyError, clear]);

  useEffect(() => {
    if (role && role !== "OWNER") {
      router.replace("/settings/organization");
      return;
    }
    if (role === "OWNER") load();
  }, [role, router, load]);

  async function requestPlan(code: string) {
    setSelecting(code);
    clear();
    try {
      await apiFetch("/api/v1/billing/requests", {
        method: "POST",
        body: JSON.stringify({ plan: code }),
      });
      showWarning("Plan request sent. We will activate after payment is confirmed.");
      await load();
    } catch (e) {
      applyError(e);
    } finally {
      setSelecting(null);
    }
  }

  async function cancelSubscription() {
    setCancelling(true);
    clear();
    try {
      await apiFetch("/api/v1/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ confirmName, reason: cancelReason || undefined }),
      });
      setCancelOpen(false);
      showWarning("Subscription cancelled. Cloud and app access for this shop are turned off.");
      await load();
    } catch (e) {
      applyError(e);
    } finally {
      setCancelling(false);
    }
  }

  if (loading || !me) {
    return <PageLoader label="Loading billing…" />;
  }

  const used = Number(me.storageUsedBytes);
  const quota = Number(me.storageQuotaBytes);
  const pct = quota > 0 ? (used / quota) * 100 : 0;
  const skuPct = me.inventorySkuUsagePercent ?? 0;
  const skuCapLabel =
    me.inventorySkuCap != null ? String(me.inventorySkuCap) : "Unlimited";
  const isCancelled = me.subscriptionStatus === "CANCELLED";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SettingsPageHeader
          title="Billing & plans"
          description={`${activeOrganizationName} · Prices exclude tax · Hardware not included`}
        />
        <DesktopOnlyNote feature="Billing and plans" />
      </div>

      <FormFeedback error={error} warning={warning} />

      <SettingsCardGrid>
        {me.pendingRequest ? (
          <Card className="border-amber-500/40 bg-amber-500/5 lg:col-span-2">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">Waiting for payment confirmation</p>
                <p className="text-muted-foreground">
                  You requested {me.pendingRequest.toPlan}. Pay our team ({billingContact}), then we
                  activate your plan. Billing on the counter is not blocked while you wait.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isCancelled ? (
          <Card className="border-destructive/40 bg-destructive/5 lg:col-span-2">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">Subscription cancelled</p>
                <p className="text-muted-foreground">
                  Cloud backup and app access for this shop are off. Contact us to reactivate.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Current subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">
                  {me.planName} · {me.monthlyLabel}/mo
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">
                  {me.subscriptionStatus.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
            </div>
            <StorageUsageBar
              usedLabel={me.storageUsedLabel}
              quotaLabel={me.storageQuotaLabel}
              percent={pct}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Plan limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {me.inventorySkuCap != null ? (
              <StorageUsageBar
                label="Inventory SKUs"
                usedLabel={String(me.inventorySkuCount)}
                quotaLabel={skuCapLabel}
                percent={skuPct}
                warningThreshold={80}
                nearLimitMessage={`You are at ${skuPct}% of your plan SKU limit. Upgrade before adding more products, or remove unused items.`}
                atLimitMessage="SKU limit reached — you cannot add new inventory items until you upgrade or remove unused SKUs. Existing items are kept."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Unlimited inventory SKUs on your current plan.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Need multi-store, WhatsApp invoicing, or extra storage? Contact{" "}
              <span className="font-medium text-foreground">{billingContact}</span> for add-on pricing.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Choose a plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare tiers and request an upgrade. We activate after payment is confirmed.
            </p>
          </CardHeader>
          <CardContent>
            <PlanCards
              plans={plans}
              currentPlan={me.plan}
              pendingPlan={me.pendingRequest?.toPlan ?? null}
              onSelect={requestPlan}
              selecting={selecting}
              readOnly={isCancelled}
            />
          </CardContent>
        </Card>

        {!isCancelled ? (
          <Card className="rounded-2xl border-destructive/30 shadow-md lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive">Cancel software</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-muted-foreground">
                Turns off cloud backup, sync, and licensed app access for{" "}
                <strong className="text-foreground">{me.organizationName}</strong>. Local files on the
                shop PC are not deleted.
              </p>
              <Button
                variant="destructive"
                className="shrink-0 rounded-xl"
                onClick={() => setCancelOpen(true)}
              >
                Opt out / cancel all services
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </SettingsCardGrid>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel all services?</DialogTitle>
            <DialogDescription>
              Type <strong>{me.organizationName}</strong> to confirm. This cannot be undone without
              contacting support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="confirmName">Organization name</Label>
              <Input
                id="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="cancelReason">Reason (optional)</Label>
              <Input
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              disabled={cancelling || confirmName.trim() !== me.organizationName.trim()}
              onClick={cancelSubscription}
            >
              {cancelling ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
