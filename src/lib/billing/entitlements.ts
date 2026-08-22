import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";
import { BILLING_PLANS, isModuleAllowedByPlan } from "@/lib/billing/plans";

export function subscriptionAllowsProductUse(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL" || status === "PAST_DUE";
}

export function subscriptionAllowsCloudSync(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

export function effectiveModulesForPlan(
  plan: BillingPlan,
  orgEnabled: Record<ModuleKey, boolean>
): Record<ModuleKey, boolean> {
  const allowed = BILLING_PLANS[plan].modules;
  const result = { ...orgEnabled };
  for (const key of Object.keys(result) as ModuleKey[]) {
    if (!allowed.includes(key)) {
      result[key] = false;
    }
  }
  return result;
}

export function assertModuleAllowedByPlan(plan: BillingPlan, moduleKey: ModuleKey): void {
  if (!isModuleAllowedByPlan(plan, moduleKey)) {
    throw new Error(
      `${moduleKey} is not included in your ${BILLING_PLANS[plan].name} plan. Upgrade in Settings → Billing.`
    );
  }
}

export function inventorySkuCapForPlan(plan: BillingPlan): number | null {
  return BILLING_PLANS[plan].inventorySkuCap;
}
