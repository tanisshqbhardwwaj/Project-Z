import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "./audit.service";
import type { StaffStatus } from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { dayKeyToUtcDate } from "@/lib/date/org-day";

export async function listStaffMembers(
  organizationId: string,
  options?: { status?: StaffStatus }
) {
  await requireModule(organizationId, "staff");
  return prisma.staffMember.findMany({
    where: {
      organizationId,
      ...(options?.status && { status: options.status }),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

async function recordWageHistory(input: {
  organizationId: string;
  staffId: string;
  wagePaise: bigint | null;
  wagePeriod: string | null;
  overtimeRatePaise?: bigint | null;
  effectiveFrom: Date;
  createdById: string;
}) {
  if (!input.wagePaise || !input.wagePeriod) return;
  await prisma.staffWage.create({
    data: {
      organizationId: input.organizationId,
      staffId: input.staffId,
      wagePaise: input.wagePaise,
      wagePeriod: input.wagePeriod,
      overtimeRatePaise: input.overtimeRatePaise ?? null,
      effectiveFrom: input.effectiveFrom,
      createdById: input.createdById,
    },
  });
}

export async function createStaffMember(input: {
  organizationId: string;
  createdById: string;
  name: string;
  phone?: string;
  roleTitle: string;
  wageRupees?: number | null;
  wagePeriod?: "DAILY" | "MONTHLY" | null;
  overtimeRateRupees?: number | null;
  joinedAt?: string | Date | null;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "staff");

  const name = input.name.trim();
  const roleTitle = input.roleTitle.trim();
  if (name.length < 2) throw new Error("Staff name must be at least 2 characters");
  if (!roleTitle) throw new Error("Role is required");

  const joinedAt =
    typeof input.joinedAt === "string"
      ? dayKeyToUtcDate(input.joinedAt)
      : input.joinedAt ?? new Date();

  const wagePaise =
    input.wageRupees != null && input.wageRupees > 0
      ? rupeesToPaise(input.wageRupees)
      : null;
  const overtimeRatePaise =
    input.overtimeRateRupees != null && input.overtimeRateRupees > 0
      ? rupeesToPaise(input.overtimeRateRupees)
      : null;

  const staff = await prisma.staffMember.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      name,
      phone: input.phone?.trim() || null,
      roleTitle,
      wagePaise,
      wagePeriod: input.wagePeriod ?? null,
      overtimeRatePaise,
      joinedAt,
      notes: input.notes?.trim() || null,
      status: "ACTIVE",
    },
  });

  await recordWageHistory({
    organizationId: input.organizationId,
    staffId: staff.id,
    wagePaise,
    wagePeriod: input.wagePeriod ?? null,
    overtimeRatePaise,
    effectiveFrom: joinedAt,
    createdById: input.createdById,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "staff.created",
    entityType: "StaffMember",
    entityId: staff.id,
    after: staff,
  });

  return staff;
}

export async function getLinkedStaffMember(organizationId: string, userId: string) {
  await requireModule(organizationId, "staff");
  return prisma.staffMember.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      roleTitle: true,
      phone: true,
      joinedAt: true,
    },
  });
}

export async function linkStaffToUser(input: {
  organizationId: string;
  staffId: string;
  userId: string | null;
  actorUserId: string;
}) {
  await requireModule(input.organizationId, "staff");

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!staff) throw new Error("Staff member not found");

  if (input.userId) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
    });
    if (!member || member.status !== "ACTIVE") {
      throw new Error("User is not an active member of this organization");
    }

    const existingLink = await prisma.staffMember.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        NOT: { id: input.staffId },
      },
    });
    if (existingLink) {
      throw new Error("This login is already linked to another staff profile");
    }
  }

  const updated = await prisma.staffMember.update({
    where: { id: input.staffId },
    data: { userId: input.userId },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: "staff.login_linked",
    entityType: "StaffMember",
    entityId: updated.id,
    before: staff,
    after: updated,
  });

  return updated;
}

export async function updateStaffMember(input: {
  organizationId: string;
  staffId: string;
  actorUserId: string;
  linkUserId?: string | null;
  name?: string;
  phone?: string | null;
  roleTitle?: string;
  wageRupees?: number | null;
  wagePeriod?: "DAILY" | "MONTHLY" | null;
  overtimeRateRupees?: number | null;
  status?: StaffStatus;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "staff");

  const existing = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Staff member not found");

  const data: {
    name?: string;
    phone?: string | null;
    roleTitle?: string;
    wagePaise?: bigint | null;
    wagePeriod?: string | null;
    overtimeRatePaise?: bigint | null;
    status?: StaffStatus;
    leftAt?: Date | null;
    joinedAt?: Date;
    notes?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Staff name must be at least 2 characters");
    data.name = name;
  }
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.roleTitle !== undefined) {
    const roleTitle = input.roleTitle.trim();
    if (!roleTitle) throw new Error("Role is required");
    data.roleTitle = roleTitle;
  }
  let wageChanged = false;
  if (input.wageRupees !== undefined) {
    data.wagePaise =
      input.wageRupees != null && input.wageRupees > 0
        ? rupeesToPaise(input.wageRupees)
        : null;
    wageChanged = data.wagePaise !== existing.wagePaise;
  }
  if (input.wagePeriod !== undefined) {
    data.wagePeriod = input.wagePeriod;
    wageChanged = wageChanged || data.wagePeriod !== existing.wagePeriod;
  }
  if (input.overtimeRateRupees !== undefined) {
    data.overtimeRatePaise =
      input.overtimeRateRupees != null && input.overtimeRateRupees > 0
        ? rupeesToPaise(input.overtimeRateRupees)
        : null;
  }
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  let rehired = false;
  if (input.status !== undefined && input.status !== existing.status) {
    data.status = input.status;
    if (input.status === "LEFT") {
      data.leftAt = new Date();
    } else {
      data.leftAt = null;
      if (existing.status === "LEFT") {
        rehired = true;
        data.joinedAt = new Date();
      }
    }
  }

  if (input.linkUserId !== undefined) {
    return linkStaffToUser({
      organizationId: input.organizationId,
      staffId: input.staffId,
      userId: input.linkUserId,
      actorUserId: input.actorUserId,
    });
  }

  const updated = await prisma.staffMember.update({
    where: { id: input.staffId },
    data,
  });

  if (wageChanged && updated.wagePaise && updated.wagePeriod) {
    await recordWageHistory({
      organizationId: input.organizationId,
      staffId: updated.id,
      wagePaise: updated.wagePaise,
      wagePeriod: updated.wagePeriod,
      overtimeRatePaise: updated.overtimeRatePaise,
      effectiveFrom: new Date(),
      createdById: input.actorUserId,
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: rehired ? "staff.rehired" : "staff.updated",
    entityType: "StaffMember",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}
