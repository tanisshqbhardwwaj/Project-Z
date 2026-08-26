import { prisma } from "@/lib/db/prisma";
import type {
  BillingEventType,
  BillingPlan,
  PlanRequestStatus,
  Prisma,
  SetupFeeStatus,
  SubscriptionStatus,
} from "@prisma/client";
import {
  BILLING_PLANS,
  defaultStorageQuotaBytes,
  EARLY_BIRD_SETUP_LIMIT,
  SETUP_FEE_EARLY_BIRD_PAISE,
  SETUP_FEE_REGULAR_PAISE,
} from "@/lib/billing/plans";
import { effectiveModulesForPlan } from "@/lib/billing/entitlements";
import { resolveEnabledModules } from "@/lib/org/modules";
import type { OrgSettingsJson } from "@/lib/org/modules";

export type PaymentActivationInput = {
  provider: "manual" | "razorpay" | string;
  reference?: string | null;
};

async function logBillingEvent(input: {
  organizationId: string;
  type: BillingEventType;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.billingEvent.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function countEarlyBirdSetupsUsed(): Promise<number> {
  return prisma.organization.count({ where: { earlyBirdSetup: true } });
}

export async function setupFeeForNewOrg(): Promise<{
  setupFeePaise: bigint;
  earlyBird: boolean;
}> {
  const used = await countEarlyBirdSetupsUsed();
  const earlyBird = used < EARLY_BIRD_SETUP_LIMIT;
  return {
    setupFeePaise: BigInt(earlyBird ? SETUP_FEE_EARLY_BIRD_PAISE : SETUP_FEE_REGULAR_PAISE),
    earlyBird,
  };
}

export async function getOrgBillingSnapshot(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      planRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!org) throw new Error("Organization not found");
  return org;
}

export async function activatePlanAfterPayment(
  organizationId: string,
  plan: BillingPlan,
  actorUserId: string | null,
  payment: PaymentActivationInput,
  options?: { storageQuotaBytes?: bigint }
) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error("Organization not found");

  const quota = options?.storageQuotaBytes ?? defaultStorageQuotaBytes(plan);
  const now = new Date();

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan,
      subscriptionStatus: "ACTIVE",
      storageQuotaBytes: quota,
      currentPeriodEnd: addMonths(now, 1),
      cancelledAt: null,
      cancelReason: null,
    },
  });

  await prisma.planRequest.updateMany({
    where: { organizationId, status: "PENDING" },
    data: {
      status: "APPROVED",
      reviewedById: actorUserId,
      reviewedAt: now,
    },
  });

  await logBillingEvent({
    organizationId,
    type: org.plan === plan ? "PLAN_ACTIVATED" : "PLAN_CHANGED",
    actorUserId,
    metadata: {
      plan,
      fromPlan: org.plan,
      provider: payment.provider,
      reference: payment.reference ?? null,
    },
  });

  return updated;
}

export async function createPlanRequest(input: {
  organizationId: string;
  userId: string;
  toPlan: BillingPlan;
}) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new Error("Organization not found");
  if (org.subscriptionStatus === "CANCELLED") {
    throw new Error("This organization is cancelled. Contact support to reactivate.");
  }
  if (org.plan === input.toPlan && org.subscriptionStatus === "ACTIVE") {
    throw new Error("You are already on this plan.");
  }

  await prisma.planRequest.updateMany({
    where: { organizationId: input.organizationId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const request = await prisma.planRequest.create({
    data: {
      organizationId: input.organizationId,
      fromPlan: org.plan,
      toPlan: input.toPlan,
      status: "PENDING",
      createdById: input.userId,
    },
  });

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: { subscriptionStatus: "PENDING_PAYMENT" },
  });

  await logBillingEvent({
    organizationId: input.organizationId,
    type: "PLAN_REQUEST",
    actorUserId: input.userId,
    metadata: { fromPlan: org.plan, toPlan: input.toPlan, requestId: request.id },
  });

  return request;
}

export async function rejectPlanRequest(input: {
  requestId: string;
  reviewerId: string;
  reason?: string;
}) {
  const req = await prisma.planRequest.findUnique({ where: { id: input.requestId } });
  if (!req || req.status !== "PENDING") throw new Error("Request not found or already handled");

  const updated = await prisma.planRequest.update({
    where: { id: input.requestId },
    data: {
      status: "REJECTED",
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
      rejectReason: input.reason ?? null,
    },
  });

  const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
  if (org?.subscriptionStatus === "PENDING_PAYMENT") {
    const pendingCount = await prisma.planRequest.count({
      where: { organizationId: req.organizationId, status: "PENDING" },
    });
    if (pendingCount === 0) {
      await prisma.organization.update({
        where: { id: req.organizationId },
        data: {
          subscriptionStatus: org.currentPeriodEnd ? "ACTIVE" : "TRIAL",
        },
      });
    }
  }

  await logBillingEvent({
    organizationId: req.organizationId,
    type: "REQUEST_REJECTED",
    actorUserId: input.reviewerId,
    metadata: { requestId: req.id, reason: input.reason ?? null },
  });

  return updated;
}

export async function approvePlanRequest(input: {
  requestId: string;
  reviewerId: string;
  payment?: PaymentActivationInput;
  storageQuotaBytes?: bigint;
}) {
  const req = await prisma.planRequest.findUnique({ where: { id: input.requestId } });
  if (!req || req.status !== "PENDING") throw new Error("Request not found or already handled");

  return activatePlanAfterPayment(
    req.organizationId,
    req.toPlan,
    input.reviewerId,
    input.payment ?? { provider: "manual" },
    { storageQuotaBytes: input.storageQuotaBytes }
  );
}

export async function cancelOrganizationSubscription(input: {
  organizationId: string;
  userId: string;
  reason?: string;
}) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new Error("Organization not found");
  if (org.subscriptionStatus === "CANCELLED") {
    throw new Error("Already cancelled.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: input.organizationId },
      data: {
        subscriptionStatus: "CANCELLED",
        cancelledAt: now,
        cancelReason: input.reason ?? null,
      },
    }),
    prisma.planRequest.updateMany({
      where: { organizationId: input.organizationId, status: "PENDING" },
      data: { status: "CANCELLED" },
    }),
  ]);

  await logBillingEvent({
    organizationId: input.organizationId,
    type: "CANCELLED",
    actorUserId: input.userId,
    metadata: { reason: input.reason ?? null },
  });
}

export async function reactivateOrganization(input: {
  organizationId: string;
  plan: BillingPlan;
  actorUserId: string;
  payment?: PaymentActivationInput;
  storageQuotaBytes?: bigint;
}) {
  const result = await activatePlanAfterPayment(
    input.organizationId,
    input.plan,
    input.actorUserId,
    input.payment ?? { provider: "manual" },
    { storageQuotaBytes: input.storageQuotaBytes }
  );

  await logBillingEvent({
    organizationId: input.organizationId,
    type: "REACTIVATED",
    actorUserId: input.actorUserId,
    metadata: { plan: input.plan },
  });

  return result;
}

export async function markSetupFeePaid(input: {
  organizationId: string;
  actorUserId: string;
  status: SetupFeeStatus;
}) {
  const updated = await prisma.organization.update({
    where: { id: input.organizationId },
    data: { setupFeeStatus: input.status },
  });

  await logBillingEvent({
    organizationId: input.organizationId,
    type: input.status === "WAIVED" ? "SETUP_FEE_WAIVED" : "SETUP_FEE_PAID",
    actorUserId: input.actorUserId,
    metadata: { status: input.status },
  });

  return updated;
}

export async function updateOrgBillingFromOps(input: {
  organizationId: string;
  actorUserId: string;
  plan?: BillingPlan;
  subscriptionStatus?: SubscriptionStatus;
  storageQuotaBytes?: bigint;
  setupFeeStatus?: SetupFeeStatus;
  onboardingComplete?: boolean;
}) {
  const data: Record<string, unknown> = {};
  if (input.plan) data.plan = input.plan;
  if (input.subscriptionStatus) data.subscriptionStatus = input.subscriptionStatus;
  if (input.storageQuotaBytes !== undefined) data.storageQuotaBytes = input.storageQuotaBytes;
  if (input.setupFeeStatus) data.setupFeeStatus = input.setupFeeStatus;
  if (input.onboardingComplete) data.onboardingCompleteAt = new Date();

  const updated = await prisma.organization.update({
    where: { id: input.organizationId },
    data,
  });

  if (input.plan) {
    await logBillingEvent({
      organizationId: input.organizationId,
      type: "PLAN_CHANGED",
      actorUserId: input.actorUserId,
      metadata: { plan: input.plan },
    });
  }

  return updated;
}

export function billingModulesForOrg(org: {
  businessType: string;
  shopSector: string | null;
  enableStaff: boolean;
  settings: unknown;
  plan: BillingPlan;
}) {
  const settings = (org.settings ?? {}) as OrgSettingsJson;
  const enabled = resolveEnabledModules({
    businessType: org.businessType as "SHOPKEEPER" | "CONTRACTOR" | "ARCHITECT" | "BUILDER",
    shopSector: org.shopSector as import("@prisma/client").ShopSector | null,
    settings,
    enableStaffLegacy: org.enableStaff,
  });
  if (org.businessType !== "SHOPKEEPER") return enabled;
  return effectiveModulesForPlan(org.plan, enabled);
}

export async function getOpsSummary() {
  const [
    orgCount,
    byPlan,
    byStatus,
    pendingRequests,
    cancelledCount,
    earlyBirdUsed,
    storageAgg,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.groupBy({ by: ["plan"], _count: true }),
    prisma.organization.groupBy({ by: ["subscriptionStatus"], _count: true }),
    prisma.planRequest.count({ where: { status: "PENDING" } }),
    prisma.organization.count({ where: { subscriptionStatus: "CANCELLED" } }),
    prisma.organization.count({ where: { earlyBirdSetup: true } }),
    prisma.organization.aggregate({ _sum: { storageUsedBytes: true } }),
  ]);

  let mrrPaise = 0;
  const activeOrgs = await prisma.organization.findMany({
    where: { subscriptionStatus: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] } },
    select: { plan: true },
  });
  for (const o of activeOrgs) {
    mrrPaise += BILLING_PLANS[o.plan].monthlyPaise;
  }

  const setupOutstanding = await prisma.organization.count({
    where: { setupFeeStatus: "UNPAID", businessType: "SHOPKEEPER" },
  });

  const ops = await getOpsActivitySignals();
  const recentOrganizations = await listRecentOpsOrganizations(8);
  const platformFeed = await listOpsPlatformFeed(12);

  const [totalUsers, totalStaff, activeUsers30d, inactiveOrgs30d] = await Promise.all([
    prisma.organizationMember
      .count({ where: { status: "ACTIVE" } })
      .catch(() => 0),
    prisma.staffMember
      .count({ where: { status: "ACTIVE" } })
      .catch(() => 0),
    prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM "User" WHERE "lastLoginAt" >= ?`,
      startOfDay(30).toISOString()
    )
      .then((rows) => Number(rows[0]?.count ?? 0))
      .catch(() => 0),
    prisma.organization
      .count({
        where: {
          createdAt: { lt: startOfDay(30) },
          subscriptionStatus: { in: ["ACTIVE", "TRIAL"] },
          OR: [
            { lastActiveAt: null },
            { lastActiveAt: { lt: startOfDay(30) } },
          ],
        },
      })
      .catch(() => 0),
  ]);

  return {
    orgCount,
    byPlan: Object.fromEntries(byPlan.map((r) => [r.plan, r._count])),
    byStatus: Object.fromEntries(byStatus.map((r) => [r.subscriptionStatus, r._count])),
    pendingRequests,
    cancelledCount,
    earlyBirdUsed,
    earlyBirdRemaining: Math.max(0, EARLY_BIRD_SETUP_LIMIT - earlyBirdUsed),
    storageUsedBytes: storageAgg._sum.storageUsedBytes?.toString() ?? "0",
    mrrPaise,
    setupOutstanding,
    totalUsers,
    totalStaff,
    activeUsers30d,
    inactiveOrgs30d,
    recentOrganizations,
    platformFeed,
    ...ops,
  };
}

function startOfDay(daysAgo = 0): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Platform billing and adoption only. Shop sales, stock, staff and returns stay
 * inside each organization — ops must not aggregate those private details.
 */
export async function getOpsActivitySignals() {
  const today = startOfDay();
  const weekAgo = startOfDay(7);
  const monthAgo = startOfDay(30);

  const safeCount = (promise: Promise<number>) => promise.catch(() => 0);

  const [newOrgsThisWeek, newOrgsThisMonth, trialsExpiringSoon] = await Promise.all([
    safeCount(prisma.organization.count({ where: { createdAt: { gte: weekAgo } } })),
    safeCount(prisma.organization.count({ where: { createdAt: { gte: monthAgo } } })),
    safeCount(
      prisma.organization.count({
        where: {
          subscriptionStatus: "TRIAL",
          currentPeriodEnd: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 86_400_000),
          },
        },
      })
    ),
  ]);

  return {
    activity: {
      newOrgsThisWeek,
      newOrgsThisMonth,
      trialsExpiringSoon,
    },
  };
}

export type OpsPlatformEvent = {
  id: string;
  type: "org_created" | "member_joined";
  label: string;
  at: string;
  href: string | null;
};

/** Safe platform activity — no shop financial data. */
export async function listOpsPlatformFeed(take = 12): Promise<OpsPlatformEvent[]> {
  const [orgs, members] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.organizationMember.findMany({
      where: { status: "ACTIVE", joinedAt: { not: null } },
      orderBy: { joinedAt: "desc" },
      take: 10,
      select: {
        id: true,
        joinedAt: true,
        role: true,
        user: { select: { name: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  const events: OpsPlatformEvent[] = [
    ...orgs.map((o) => ({
      id: `org-${o.id}`,
      type: "org_created" as const,
      label: `New organization · ${o.name}`,
      at: o.createdAt.toISOString(),
      href: `/ops/customers/${o.id}`,
    })),
    ...members
      .filter((m) => m.joinedAt)
      .map((m) => ({
        id: `member-${m.id}`,
        type: "member_joined" as const,
        label: `${m.user.name} joined ${m.organization.name} (${m.role})`,
        at: m.joinedAt!.toISOString(),
        href: null,
      })),
  ];

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, take);
}

/** Recently created organizations with their owner, for the ops overview feed. */
export async function listRecentOpsOrganizations(take = 8) {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      businessType: true,
      shopSector: true,
      plan: true,
      subscriptionStatus: true,
      createdAt: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        select: { user: { select: { name: true, email: true, phone: true } } },
      },
    },
  });
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    businessType: org.businessType,
    shopSector: org.shopSector,
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    createdAt: org.createdAt.toISOString(),
    owner: org.members[0]?.user ?? null,
  }));
}

export async function listOpsOrganizations(input: {
  q?: string;
  plan?: BillingPlan;
  status?: SubscriptionStatus;
  skip?: number;
  take?: number;
}) {
  const where: Record<string, unknown> = {};
  if (input.plan) where.plan = input.plan;
  if (input.status) where.subscriptionStatus = input.status;
  if (input.q) {
    where.OR = [
      { name: { contains: input.q } },
      { slug: { contains: input.q } },
      {
        members: {
          some: {
            role: "OWNER",
            user: {
              OR: [
                { email: { contains: input.q } },
                { name: { contains: input.q } },
                { phone: { contains: input.q } },
              ],
            },
          },
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip: input.skip ?? 0,
      take: input.take ?? 50,
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          where: { role: "OWNER", status: "ACTIVE" },
          take: 1,
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
        planRequests: {
          where: { status: "PENDING" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return { items, total };
}

export async function listPendingPlanRequests() {
  return prisma.planRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      organization: { select: { id: true, name: true, plan: true, subscriptionStatus: true } },
      createdBy: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}

export type { PlanRequestStatus };
