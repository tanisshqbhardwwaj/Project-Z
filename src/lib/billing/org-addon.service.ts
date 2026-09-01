import { prisma } from "@/lib/db/prisma";
import { invalidateEntitlementCache } from "@/lib/billing/entitlement-engine";
import {
  ADDON_CATALOG,
  addonModuleGrants,
  MULTI_STORE_ADDON_KEY,
  type AddonKey,
} from "@/lib/billing/addon-catalog";
import { mergeMultiStoreSettings } from "@/lib/shop/branch/multi-store";
import type { OrgSettingsJson } from "@/lib/org/modules";

export { ADDON_CATALOG, addonModuleGrants, type AddonKey };

export async function listOrgAddons(organizationId: string) {
  try {
    return await prisma.orgAddon.findMany({
      where: {
        organizationId,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
    });
  } catch {
    return [];
  }
}

export async function grantOrgAddon(input: {
  organizationId: string;
  addonKey: string;
  quantity?: number;
  validUntil?: Date | null;
}) {
  const row = await prisma.orgAddon.upsert({
    where: {
      organizationId_addonKey: {
        organizationId: input.organizationId,
        addonKey: input.addonKey,
      },
    },
    create: {
      organizationId: input.organizationId,
      addonKey: input.addonKey,
      quantity: input.quantity ?? 1,
      validUntil: input.validUntil ?? null,
    },
    update: {
      quantity: input.quantity ?? 1,
      validUntil: input.validUntil ?? null,
    },
  });
  invalidateEntitlementCache(input.organizationId);
  return row;
}

export async function revokeOrgAddon(organizationId: string, addonKey: string) {
  await prisma.orgAddon.deleteMany({
    where: { organizationId, addonKey },
  });
  if (addonKey === MULTI_STORE_ADDON_KEY) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    if (org) {
      const nextSettings = mergeMultiStoreSettings(org.settings as OrgSettingsJson, {
        enabled: false,
      });
      await prisma.organization.update({
        where: { id: organizationId },
        data: { settings: nextSettings },
      });
    }
  }
  invalidateEntitlementCache(organizationId);
}

export async function hasActiveOrgAddon(
  organizationId: string,
  addonKey: string
): Promise<boolean> {
  const rows = await listOrgAddons(organizationId);
  return rows.some((row) => row.addonKey === addonKey);
}

export async function listActiveOrgAddonKeys(organizationId: string): Promise<string[]> {
  const rows = await listOrgAddons(organizationId);
  return rows.map((row) => row.addonKey);
}
