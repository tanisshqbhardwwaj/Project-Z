import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import { ApiError } from "@/lib/api/context";
import type { ModuleKey } from "@/lib/org/modules";
import {
  getModuleDefinition,
  resolveEnabledModules,
  type OrgSettingsJson,
} from "@/lib/org/modules";
import {
  assertModuleAllowedByPlan,
  effectiveModulesForPlan,
  inventorySkuCapForPlan,
  subscriptionAllowsProductUse,
} from "@/lib/billing/entitlements";
import { stripDisabledServiceModules } from "@/lib/org/service-vertical";
import {
  planMeetsMinimum,
  reportFeatureLabel,
  reportFeatureMinPlan,
  type ReportFeatureId,
} from "@/lib/billing/report-entitlements";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { getCachedOrganization } from "@/lib/db/request-cache";
import { prisma } from "@/lib/db/prisma";
import { addonModuleGrants } from "@/lib/billing/addon-catalog";

const CACHE_TTL_MS = 30_000;

type EntitlementSnapshot = {
  expiresAt: number;
  plan: BillingPlan;
  subscriptionStatus: SubscriptionStatus;
  enabledModules: Record<ModuleKey, boolean>;
  inventorySkuCap: number | null;
};

const snapshotCache = new Map<string, EntitlementSnapshot>();

export function invalidateEntitlementCache(organizationId: string) {
  snapshotCache.delete(organizationId);
}

async function loadSnapshot(organizationId: string): Promise<EntitlementSnapshot> {
  const now = Date.now();
  const cached = snapshotCache.get(organizationId);
  if (cached && cached.expiresAt > now) return cached;

  const org = await getCachedOrganization(organizationId);
  if (!org) {
    throw new ApiError(404, "NOT_FOUND", "Organization not found");
  }

  const settings = (org.settings ?? {}) as OrgSettingsJson;
  const orgEnabled = resolveEnabledModules({
    businessType: org.businessType,
    shopSector: org.shopSector,
    settings,
    enableStaffLegacy: org.enableStaff,
  });
  let enabledModules = effectiveModulesForPlan(org.plan, orgEnabled);

  try {
    const addons = await prisma.orgAddon.findMany({
      where: {
        organizationId,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
    });
    for (const addon of addons) {
      for (const mod of addonModuleGrants(addon.addonKey)) {
        enabledModules = { ...enabledModules, [mod]: true };
      }
    }
  } catch {
    /* OrgAddon table may not exist until migration runs */
  }

  enabledModules = stripDisabledServiceModules(enabledModules);

  const snapshot: EntitlementSnapshot = {
    expiresAt: now + CACHE_TTL_MS,
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    enabledModules,
    inventorySkuCap: inventorySkuCapForPlan(org.plan),
  };
  snapshotCache.set(organizationId, snapshot);
  return snapshot;
}

export async function getEntitlements(organizationId: string) {
  return loadSnapshot(organizationId);
}

export async function requireEntitledModule(
  organizationId: string,
  moduleKey: ModuleKey
) {
  const snap = await loadSnapshot(organizationId);
  if (!subscriptionAllowsProductUse(snap.subscriptionStatus)) {
    throw new ApiError(
      403,
      "SUBSCRIPTION_CANCELLED",
      "This subscription is not active. Go to Settings → Billing to reactivate."
    );
  }
  try {
    assertModuleAllowedByPlan(snap.plan, moduleKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Plan does not include this module";
    throw new ApiError(403, "PLAN_UPGRADE_REQUIRED", msg);
  }
  if (!snap.enabledModules[moduleKey]) {
    const def = getModuleDefinition(moduleKey);
    throw new ApiError(
      403,
      "MODULE_DISABLED",
      `${def?.description ?? moduleKey} is not enabled. Turn it on in Manage Organization → Features.`
    );
  }
  return snap;
}

export async function requireEntitledReportFeature(
  organizationId: string,
  feature: ReportFeatureId
): Promise<BillingPlan> {
  const snap = await loadSnapshot(organizationId);
  const minimum = reportFeatureMinPlan(feature);
  if (!planMeetsMinimum(snap.plan, minimum)) {
    const label = reportFeatureLabel(feature);
    const planName = BILLING_PLANS[minimum].name;
    throw new ApiError(
      403,
      "PLAN_UPGRADE_REQUIRED",
      `${label} is included on the ${planName} plan and above. Upgrade in Settings → Billing.`
    );
  }
  return snap.plan;
}

export async function getInventorySkuCap(organizationId: string): Promise<number | null> {
  const snap = await loadSnapshot(organizationId);
  return snap.inventorySkuCap;
}

/** Grandfathered limit check: block only when at or over cap. */
export async function assertUnderInventorySkuCap(
  organizationId: string,
  currentSkuCount: number
) {
  const cap = await getInventorySkuCap(organizationId);
  if (cap == null) return;
  if (currentSkuCount >= cap) {
    throw new ApiError(
      403,
      "PLAN_LIMIT_REACHED",
      `Your plan allows up to ${cap} inventory SKUs. Upgrade in Settings → Billing or remove unused items to add more.`
    );
  }
}

export function inventorySkuUsagePercent(current: number, cap: number | null): number | null {
  if (cap == null || cap <= 0) return null;
  return Math.min(100, Math.round((current / cap) * 100));
}
