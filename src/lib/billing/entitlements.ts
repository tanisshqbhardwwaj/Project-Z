import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";
import { BILLING_PLANS, type PlanDefinition } from "@/lib/billing/plans";

export function subscriptionAllowsProductUse(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL" || status === "PAST_DUE";
}

export function subscriptionAllowsCloudSync(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

export function effectiveModulesForPlan(
  plan: BillingPlan,
  orgEnabled: Record<ModuleKey, boolean>,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): Record<ModuleKey, boolean> {
  const allowed = catalog[plan]?.modules ?? BILLING_PLANS[plan].modules;
  const result = { ...orgEnabled };
  for (const key of Object.keys(result) as ModuleKey[]) {
    if (!allowed.includes(key)) {
      result[key] = false;
    }
  }
  return result;
}

export function assertModuleAllowedByPlan(
  plan: BillingPlan,
  moduleKey: ModuleKey,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): void {
  const def = catalog[plan] ?? BILLING_PLANS[plan];
  if (!def.modules.includes(moduleKey)) {
    throw new Error(
      `${moduleKey} is not included in your ${def.name} plan. Upgrade in Settings → Billing.`
    );
  }
}

export function inventorySkuCapForPlan(
  plan: BillingPlan,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): number | null {
  return (catalog[plan] ?? BILLING_PLANS[plan]).inventorySkuCap;
}

export function isModuleAllowedByPlan(
  plan: BillingPlan,
  moduleKey: ModuleKey,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): boolean {
  const def = catalog[plan] ?? BILLING_PLANS[plan];
  return def.modules.includes(moduleKey);
}
