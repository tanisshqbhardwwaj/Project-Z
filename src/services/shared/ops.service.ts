import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/context";
import { getPlanDefinition } from "@/lib/billing/plans";
import { inventorySkuCapForPlan } from "@/lib/billing/entitlements";
import { inventorySkuUsagePercent } from "@/lib/billing/entitlement-engine";
import { listOrgAddons } from "@/lib/billing/org-addon.service";
import { getMultiStoreConfig } from "@/services/shop/shop-branch.service";
import { isShopVertical } from "@/lib/org/business-type";
import { getStorageUsageBreakdown } from "@/services/shared/storage-quota.service";
import { mergeModuleSettings, parseOrgSettings } from "@/lib/org/require-module";
import type { ModuleKey } from "@/lib/org/modules";

/** Safe org detail for platform ops — no localPinHash, raw settings, or shop financials. */
export async function getOpsOrganizationDetail(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      shopSector: true,
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      accessExpiresAt: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      setupFeeStatus: true,
      enableStaff: true,
      settings: true,
      onboardingCompleteAt: true,
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          invitedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      planRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          fromPlan: true,
          toPlan: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!org) {
    throw new ApiError(404, "NOT_FOUND", "Organization not found");
  }

  const [staffCount, inventorySkuCount, addons, storage, multiStore] = await Promise.all([
    prisma.staffMember.count({
      where: { organizationId: id, status: "ACTIVE" },
    }),
    prisma.inventoryItem.count({ where: { organizationId: id } }),
    listOrgAddons(id),
    getStorageUsageBreakdown(id),
    isShopVertical(org.businessType)
      ? getMultiStoreConfig(id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const inventorySkuCap = inventorySkuCapForPlan(org.plan);
  const activeMemberCount = org.members.filter((m) => m.status === "ACTIVE").length;
  const adminCount = org.members.filter(
    (m) => m.status === "ACTIVE" && m.role === "OWNER"
  ).length;

  const { members, planRequests, ...orgRest } = org;

  return {
    org: {
      ...orgRest,
      members,
      planRequests,
      memberCount: activeMemberCount,
      adminCount,
      staffCount,
      inventorySkuCount,
      inventorySkuCap,
      inventorySkuUsagePercent: inventorySkuUsagePercent(inventorySkuCount, inventorySkuCap),
    },
    addons,
    planDef: getPlanDefinition(org.plan),
    storage,
    multiStore,
  };
}

export async function listOpsUsers(input: { q?: string; skip?: number; take?: number }) {
  const q = input.q?.trim();
  const where = q
    ? {
        OR: [
          { user: { name: { contains: q } } },
          { user: { email: { contains: q } } },
          { user: { phone: { contains: q } } },
          { organization: { name: { contains: q } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { status: { in: ["ACTIVE", "INVITED"] }, ...where },
      skip: input.skip ?? 0,
      take: input.take ?? 50,
      orderBy: [{ joinedAt: "desc" }],
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            lastLoginAt: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionStatus: true,
          },
        },
      },
    }),
    prisma.organizationMember.count({
      where: { status: { in: ["ACTIVE", "INVITED"] }, ...where },
    }),
  ]);

  return { items, total };
}

export async function updateOpsOrganizationModules(input: {
  organizationId: string;
  modules: Record<string, boolean>;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");

  const existing = parseOrgSettings(org.settings);
  const nextSettings = mergeModuleSettings(
    existing,
    input.modules as Partial<Record<ModuleKey, boolean>>
  );

  const data: { settings: typeof nextSettings; enableStaff?: boolean } = {
    settings: nextSettings,
  };
  if (input.modules.staff !== undefined) {
    data.enableStaff = Boolean(input.modules.staff);
  }

  return prisma.organization.update({
    where: { id: input.organizationId },
    data,
  });
}
