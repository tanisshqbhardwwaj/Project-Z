"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { PlanCards, StorageUsageBar, type PlanCardData } from "@/components/billing/plan-cards";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SETUP_FEE_EARLY_BIRD_PAISE,
  SETUP_FEE_REGULAR_PAISE,
  formatINRFromPaise,
} from "@/lib/billing/plans";

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
  const isCancelled = me.subscriptionStatus === "CANCELLED";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & plans</h1>
        <p className="text-sm text-muted-foreground">
          {activeOrganizationName} · Prices exclude tax · Hardware not included
        </p>
      </div>

      <FormFeedback error={error} warning={warning} />

      {me.pendingRequest ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <CreditCard className="mt-0.5 h-5 w-5 text-amber-600" />
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
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Subscription cancelled</p>
              <p className="text-muted-foreground">
                Cloud backup and app access for this shop are off. Contact us to reactivate.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">
                {me.planName} · {me.monthlyLabel}/mo
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{me.subscriptionStatus.replace(/_/g, " ").toLowerCase()}</p>
            </div>
            {me.setupFeeStatus === "UNPAID" && me.setupFeePaise ? (
              <div>
                <p className="text-muted-foreground">One-time setup</p>
                <p className="font-medium">
                  {formatINRFromPaise(Number(me.setupFeePaise))}{" "}
                  {me.earlyBirdSetup ? "(early offer)" : ""}
                </p>
              </div>
            ) : null}
          </div>
          <StorageUsageBar
            usedLabel={me.storageUsedLabel}
            quotaLabel={me.storageQuotaLabel}
            percent={pct}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Choose a plan</h2>
        <PlanCards
          plans={plans}
          currentPlan={me.plan}
          pendingPlan={me.pendingRequest?.toPlan ?? null}
          onSelect={requestPlan}
          selecting={selecting}
          readOnly={isCancelled}
        />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">One-time setup & onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Regular {formatINRFromPaise(SETUP_FEE_REGULAR_PAISE)} · Early customer{" "}
            {formatINRFromPaise(SETUP_FEE_EARLY_BIRD_PAISE)} (first 100 shops)
          </p>
          <p>
            Includes store configuration, staff setup, GST/invoice setup, data import help, training,
            and desktop software setup.
          </p>
          <p>Pay via: {billingContact}</p>
        </CardContent>
      </Card>

      {!isCancelled ? (
        <Card className="rounded-2xl border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Cancel software</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This turns off cloud backup, sync, and licensed app access for{" "}
              <strong>{me.organizationName}</strong>. Your local files on the shop PC are not deleted.
            </p>
            <Button variant="destructive" className="rounded-xl" onClick={() => setCancelOpen(true)}>
              Opt out / cancel all services
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/settings/organization" className="underline">
          Back to organization settings
        </Link>
      </p>

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
