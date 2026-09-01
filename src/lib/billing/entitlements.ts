import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";
import { addonModuleGrants } from "@/lib/billing/addon-catalog";
import { BILLING_PLANS, PLAN_ORDER, type PlanDefinition } from "@/lib/billing/plans";

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

export function minimumPlanForModule(
  moduleKey: ModuleKey,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): BillingPlan | null {
  for (const plan of PLAN_ORDER) {
    if ((catalog[plan] ?? BILLING_PLANS[plan]).modules.includes(moduleKey)) {
      return plan;
    }
  }
  return null;
}

export function minimumPlanLabelForModule(
  moduleKey: ModuleKey,
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): string | null {
  const plan = minimumPlanForModule(moduleKey, catalog);
  return plan ? (catalog[plan] ?? BILLING_PLANS[plan]).name : null;
}

/** Plan tier or an active org add-on that grants the module. */
export function isModuleEntitled(
  plan: BillingPlan | null | undefined,
  moduleKey: ModuleKey,
  activeAddonKeys: string[] = [],
  catalog: Record<BillingPlan, PlanDefinition> = BILLING_PLANS
): boolean {
  if (!plan) return false;
  if (isModuleAllowedByPlan(plan, moduleKey, catalog)) return true;
  return activeAddonKeys.some((key) => addonModuleGrants(key).includes(moduleKey));
}
