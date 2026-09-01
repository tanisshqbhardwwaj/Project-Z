"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { BillingPlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useActivePlan } from "@/hooks/use-active-plan";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import {
  MODULE_REGISTRY,
  moduleLabel,
  type ModuleKey,
} from "@/lib/org/modules";
import { getBusinessTypeConfig } from "@/lib/org/business-type";
import { isModuleAllowedByPlan } from "@/lib/billing/entitlements";
import { BILLING_PLANS } from "@/lib/billing/plans";

type ModuleGateProps = {
  moduleKey: ModuleKey;
  children: ReactNode;
  title?: string;
};

export function ModuleGate({ moduleKey, children, title }: ModuleGateProps) {
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const enabledModules = useAuthStore((s) => s.enabledModules);
  const plan = useActivePlan();

  const mod = MODULE_REGISTRY.find((m) => m.key === moduleKey);
  const displayTitle = title ?? (businessType ? moduleLabel(moduleKey, businessType) : mod?.description ?? "Feature");

  if (!businessType || !mod) {
    return null;
  }

  if (!mod.availableFor.includes(businessType)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Not available for your organization</h1>
        <p className="text-sm text-muted-foreground">
          {displayTitle} is not part of {getBusinessTypeConfig(businessType).label} organizations.
        </p>
        <Link href="/dashboard">
          <Button className="rounded-xl">Go to dashboard</Button>
        </Link>
      </div>
    );
  }

  const planAllowed = plan ? isModuleAllowedByPlan(plan, moduleKey) : true;
  if (!planAllowed) {
    const planName = plan ? BILLING_PLANS[plan as BillingPlan]?.name : "your plan";
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{displayTitle} requires an upgrade</h1>
        <p className="text-sm text-muted-foreground">
          {displayTitle} is not included in {planName}. Upgrade in Billing to unlock it.
        </p>
        <Link href="/settings/billing">
          <Button className="rounded-xl">View plans</Button>
        </Link>
      </div>
    );
  }

  if (!isModuleEnabled(enabledModules, moduleKey)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{displayTitle} is optional</h1>
        <p className="text-sm text-muted-foreground">
          Turn on {displayTitle.toLowerCase()} in Manage Organization → Features.
        </p>
        <Link href="/settings/organization">
          <Button className="rounded-xl">Manage Organization</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
