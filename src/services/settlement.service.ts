import { prisma } from "@/lib/db/prisma";
import { calculateSettlement } from "@/lib/finance/settlement";
import type { SplitType } from "@prisma/client";

export async function getPartnerContributions(projectId: string, organizationId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      projectId,
      organizationId,
      deletedAt: null,
      paymentType: "VENDOR",
    },
    include: { paidBy: { select: { id: true, name: true } } },
  });

  const contributionMap = new Map<string, { userId: string; userName: string; totalPaidPaise: bigint }>();

  for (const p of payments) {
    const existing = contributionMap.get(p.paidByUserId);
    if (existing) {
      existing.totalPaidPaise += p.amountPaise;
    } else {
      contributionMap.set(p.paidByUserId, {
        userId: p.paidByUserId,
        userName: p.paidBy.name,
        totalPaidPaise: p.amountPaise,
      });
    }
  }

  return Array.from(contributionMap.values());
}

export async function getProjectSettlement(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      splitConfig: true,
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!project) return null;

  const contributions = await getPartnerContributions(projectId, organizationId);

  const memberIds = new Set(project.members.map((m) => m.userId));
  for (const m of project.members) {
    if (!contributions.find((c) => c.userId === m.userId)) {
      contributions.push({
        userId: m.userId,
        userName: m.user.name,
        totalPaidPaise: BigInt(0),
      });
    }
  }

  const filtered = contributions.filter((c) => memberIds.has(c.userId));
  const splitType = (project.splitConfig?.splitType ?? "EQUAL") as SplitType;
  const splits = project.splitConfig?.splits as Array<{ userId: string; percent?: number }> | undefined;

  const percents: Record<string, number> = {};
  const customShares: Record<string, bigint> = {};

  if (splitType === "PERCENT" && splits) {
    for (const s of splits) {
      if (s.percent) percents[s.userId] = s.percent;
    }
  }

  return calculateSettlement(splitType, filtered, { percents, customShares });
}
