import { prisma } from "@/lib/db/prisma";
import { invalidateEntitlementCache } from "@/lib/billing/entitlement-engine";
import { ADDON_CATALOG, addonModuleGrants, type AddonKey } from "@/lib/billing/addon-catalog";

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
  invalidateEntitlementCache(organizationId);
}
