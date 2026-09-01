"use client";

import Link from "next/link";
import type { BusinessType } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import {
  modulesForBusinessType,
  moduleLabel,
  type ModuleKey,
} from "@/lib/org/modules";
import { isModuleAllowedByPlan } from "@/lib/billing/entitlements";
import { BILLING_PLANS } from "@/lib/billing/plans";
import type { BillingPlan } from "@prisma/client";
import type { ShopSector } from "@/lib/org/shop-sector";

type OrgModuleTogglesProps = {
  businessType: BusinessType;
  primaryShopSector?: ShopSector | null;
  plan: BillingPlan | null;
  moduleToggles: Partial<Record<ModuleKey, boolean>>;
  enableStaff: boolean;
  disabled?: boolean;
  onToggle: (key: ModuleKey, next: boolean) => void;
};

export function OrgModuleToggles({
  businessType,
  primaryShopSector,
  plan,
  moduleToggles,
  enableStaff,
  disabled = false,
  onToggle,
}: OrgModuleTogglesProps) {
  const modules = modulesForBusinessType(businessType, primaryShopSector ?? null);

  return (
    <div className="space-y-3">
      {modules.map((mod) => {
        const on = Boolean(
          moduleToggles[mod.key] ??
            (mod.key === "staff" ? enableStaff : mod.defaultOn[businessType])
        );
        const planAllowed = plan ? isModuleAllowedByPlan(plan, mod.key) : true;
        const planName = plan ? BILLING_PLANS[plan].name : "your plan";

        return (
          <div
            key={mod.key}
            className="flex items-start gap-3 rounded-xl border p-3 sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">
                  {moduleLabel(mod.key, businessType)}
                </p>
                {!planAllowed ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {planName} plan
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
              {!planAllowed ? (
                <Link
                  href="/settings/billing"
                  className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Upgrade to unlock
                </Link>
              ) : null}
            </div>
            <Switch
              checked={on}
              disabled={disabled || !planAllowed}
              onCheckedChange={(next) => onToggle(mod.key, next)}
            />
          </div>
        );
      })}
    </div>
  );
}
