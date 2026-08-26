import { prisma } from "@/lib/db/prisma";
import type { ModuleKey } from "@/lib/org/modules";
import {
  getModuleDefinition,
  resolveEnabledModules,
  type OrgSettingsJson,
} from "@/lib/org/modules";
import type { BusinessType, ShopSector } from "@prisma/client";
import { sanitizeShopSettingsForClient } from "@/lib/org/shop-settings";

export async function getOrgModuleContext(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      businessType: true,
      shopSector: true,
      enableStaff: true,
      timezone: true,
      settings: true,
    },
  });
  if (!org) throw new Error("Organization not found");
  const settings = (org.settings ?? {}) as OrgSettingsJson;
  const enabledModules = resolveEnabledModules({
    businessType: org.businessType,
    shopSector: org.shopSector,
    settings,
    enableStaffLegacy: org.enableStaff,
  });
  return { org, settings, enabledModules };
}

export async function requireModule(organizationId: string, moduleKey: ModuleKey) {
  const { org, enabledModules } = await getOrgModuleContext(organizationId);
  if (!enabledModules[moduleKey]) {
    const def = getModuleDefinition(moduleKey);
    throw new Error(
      `${def?.description ?? moduleKey} is not enabled. Turn it on in Manage Organization → Features.`
    );
  }
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
}) {
  const settings = sanitizeShopSettingsForClient(
    parseOrgSettings(input.settings) as Record<string, unknown>
  ) as OrgSettingsJson;
  const enabled = resolveEnabledModules({
    businessType: input.businessType,
    shopSector: input.shopSector,
    settings,
    enableStaffLegacy: input.enableStaff,
  });
  return { settings, enabledModules: enabled };
}
