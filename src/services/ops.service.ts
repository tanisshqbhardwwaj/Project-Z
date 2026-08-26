import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/context";
import { getPlanDefinition } from "@/lib/billing/plans";
import { getStorageUsageBreakdown } from "@/services/storage-quota.service";

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
      storageUsedBytes: true,
      storageQuotaBytes: true,
      setupFeeStatus: true,
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

  const staffCount = await prisma.staffMember.count({
    where: { organizationId: id, status: "ACTIVE" },
  });

  const storage = await getStorageUsageBreakdown(id);
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
    },
    planDef: getPlanDefinition(org.plan),
    storage,
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
