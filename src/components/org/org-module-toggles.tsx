"use client";

import Link from "next/link";
import type { BusinessType } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import {
  modulesForBusinessType,
  moduleLabel,
  type ModuleKey,
} from "@/lib/org/modules";
import {
  isModuleEntitled,
  minimumPlanLabelForModule,
} from "@/lib/billing/entitlements";
import { ADDON_CATALOG } from "@/lib/billing/addon-catalog";
import type { BillingPlan } from "@prisma/client";
import type { ShopSector } from "@/lib/org/shop-sector";

type OrgModuleTogglesProps = {
  businessType: BusinessType;
  primaryShopSector?: ShopSector | null;
  plan: BillingPlan | null;
  activeAddonKeys?: string[];
  moduleToggles: Partial<Record<ModuleKey, boolean>>;
  enableStaff: boolean;
  disabled?: boolean;
  onToggle: (key: ModuleKey, next: boolean) => void;
};

function addonLabelForModule(moduleKey: ModuleKey, activeAddonKeys: string[]): string | null {
  for (const key of activeAddonKeys) {
    const def = ADDON_CATALOG[key as keyof typeof ADDON_CATALOG];
    if (def?.modules.includes(moduleKey)) {
      return def.label;
    }
  }
  return null;
}

export function OrgModuleToggles({
  businessType,
  primaryShopSector,
  plan,
  activeAddonKeys = [],
  moduleToggles,
  enableStaff,
  disabled = false,
  onToggle,
}: OrgModuleTogglesProps) {
  const modules = modulesForBusinessType(businessType, primaryShopSector ?? null);

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const on = Boolean(
          moduleToggles[mod.key] ??
            (mod.key === "staff" ? enableStaff : mod.defaultOn[businessType])
        );
        const entitled = plan ? isModuleEntitled(plan, mod.key, activeAddonKeys) : false;
        const minPlanLabel = minimumPlanLabelForModule(mod.key);
        const addonLabel = addonLabelForModule(mod.key, activeAddonKeys);

        return (
          <div
            key={mod.key}
            className="flex items-start gap-3 rounded-xl border p-2.5 sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">
                  {moduleLabel(mod.key, businessType)}
                </p>
                {!entitled && minPlanLabel ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {minPlanLabel}+ plan
                  </span>
                ) : null}
                {!entitled && addonLabel ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Add-on
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
              {!entitled ? (
                <Link
                  href="/settings/billing"
                  className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {minPlanLabel
                    ? `Upgrade to ${minPlanLabel} or above to unlock`
                    : "Upgrade or add-on required"}
                </Link>
              ) : null}
            </div>
            <Switch
              checked={on}
              disabled={disabled || !entitled}
              onCheckedChange={(next) => onToggle(mod.key, next)}
            />
          </div>
        );
      })}
    </div>
  );
}
