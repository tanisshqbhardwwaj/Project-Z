import type { BillingPlan, BusinessType, ShopSector } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";
import {
  getModuleDefinition,
  resolveEnabledModules,
  type OrgSettingsJson,
} from "@/lib/org/modules";
import { effectiveModulesForPlan } from "@/lib/billing/entitlements";
import { requireEntitledModule, getEntitlements } from "@/lib/billing/entitlement-engine";
import { getCachedOrganization } from "@/lib/db/request-cache";
import { sanitizeShopSettingsForClient } from "@/lib/org/shop-settings";

export async function getOrgModuleContext(organizationId: string) {
  const org = await getCachedOrganization(organizationId);
  if (!org) throw new Error("Organization not found");
  const settings = (org.settings ?? {}) as OrgSettingsJson;
  const { enabledModules } = await getEntitlements(organizationId);
  return { org, settings, enabledModules };
}

export async function requireModule(organizationId: string, moduleKey: ModuleKey) {
  await requireEntitledModule(organizationId, moduleKey);
  const org = await getCachedOrganization(organizationId);
  if (!org) throw new Error("Organization not found");
  return org;
}

export function parseOrgSettings(raw: unknown): OrgSettingsJson {
  if (!raw || typeof raw !== "object") return {};
  return raw as OrgSettingsJson;
}

export function mergeModuleSettings(
  existing: OrgSettingsJson,
  modules: Partial<Record<ModuleKey, boolean>>
): OrgSettingsJson {
  return {
    ...existing,
    modules: { ...existing.modules, ...modules },
  };
}

export function modulesPayloadForClient(input: {
  businessType: BusinessType;
  shopSector: ShopSector | null;
  settings: unknown;
  enableStaff: boolean;
  plan?: BillingPlan;
}) {
  const settings = sanitizeShopSettingsForClient(
    parseOrgSettings(input.settings) as Record<string, unknown>
  ) as OrgSettingsJson;
  const orgEnabled = resolveEnabledModules({
    businessType: input.businessType,
    shopSector: input.shopSector,
    settings,
    enableStaffLegacy: input.enableStaff,
  });
  const enabledModules = input.plan
    ? effectiveModulesForPlan(input.plan, orgEnabled)
    : orgEnabled;
  return { settings, enabledModules };
}

export { getModuleDefinition };
