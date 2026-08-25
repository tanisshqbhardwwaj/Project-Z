import { prisma } from "@/lib/db/prisma";
import { inviteMember } from "./organization.service";
import { createAuditLog } from "./audit.service";
import { staffAccessFromForm } from "@/lib/staff/access";
import {
  attachStaffAccessJson,
  readStaffAccessJson,
  writeStaffAccessJson,
} from "@/lib/staff/access-storage";
import type { StaffCommissionType, StaffStatus } from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { dayKeyToUtcDate } from "@/lib/date/org-day";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import { normalizeCashierCode } from "@/lib/shop/bill-number";

function resolveCashierCodeInput(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return normalizeCashierCode(trimmed);
}

async function assertUniqueCashierCode(
  organizationId: string,
  cashierCode: string | null,
  excludeStaffId?: string
) {
  if (!cashierCode) return;
  const existing = await prisma.staffMember.findFirst({
    where: {
      organizationId,
      cashierCode,
      ...(excludeStaffId ? { NOT: { id: excludeStaffId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (existing) {
    throw new Error(
      `Cashier code "${cashierCode}" is already used by ${existing.name}`
    );
  }
}

export async function listStaffMembers(
  organizationId: string,
  options?: { status?: StaffStatus; search?: string }
) {
  await requireModule(organizationId, "staff");
  await ensureCatalogSchema();
  const search = options?.search?.trim();
  const rows = await prisma.staffMember.findMany({
    where: {
      organizationId,
      ...(options?.status && { status: options.status }),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
              { roleTitle: { contains: search } },
              { cashierCode: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return attachStaffAccessJson(rows);
}

/** Staff list plus this month's sales so the team screen shows real activity. */
export async function listStaffWithPerformance(input: {
  organizationId: string;
  year: number;
  month: number;
  status?: StaffStatus;
  search?: string;
}) {
  const staff = await listStaffMembers(input.organizationId, {
    status: input.status,
    search: input.search,
  });
  if (staff.length === 0) return [];

  const { computeStaffCommission } = await import("./staff-commission.service");

  return Promise.all(
    staff.map(async (member) => {
      const commission = await computeStaffCommission({
        organizationId: input.organizationId,
        staffId: member.id,
        year: input.year,
        month: input.month,
      }).catch(() => null);

      return {
        ...member,
        performance: commission
          ? {
              invoiceCount: commission.invoiceCount,
              grossSalesPaise: commission.grossSalesPaise.toString(),
              returnedValuePaise: commission.returnedValuePaise.toString(),
              eligibleSalesPaise: commission.eligibleSalesPaise.toString(),
              commissionPaise: commission.commissionPaise.toString(),
            }
          : null,
      };
    })
  );
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

export type StaffCommissionInput = {
  commissionType?: StaffCommissionType;
  commissionPercent?: number | null;
  commissionAmountRupees?: number | null;
};

/**
 * Normalises commission config so only the field relevant to the chosen type is
 * stored — switching from percentage to fixed never leaves a stale percentage
 * behind to be paid out by accident.
 */
function resolveCommission(input: StaffCommissionInput) {
  const type = input.commissionType ?? "NONE";
  if (type === "PERCENT") {
    const percent = input.commissionPercent ?? 0;
    if (percent <= 0) throw new Error("Enter a commission percentage above zero");
    if (percent > 100) throw new Error("Commission percentage cannot exceed 100");
    return {
      commissionType: type,
      commissionPercent: percent,
      commissionAmountPaise: null,
    };
  }
  if (type === "FIXED_PER_SALE" || type === "FIXED_PER_ITEM" || type === "FIXED_MONTHLY") {
    const amount = input.commissionAmountRupees ?? 0;
    if (amount <= 0) throw new Error("Enter a commission amount above zero");
    return {
      commissionType: type,
      commissionPercent: null,
      commissionAmountPaise: rupeesToPaise(amount),
    };
  }
  return {
    commissionType: "NONE" as StaffCommissionType,
    commissionPercent: null,
    commissionAmountPaise: null,
  };
}

async function ensureStaffLoginInvite(input: {
  organizationId: string;
  staffId: string;
  email: string;
  invitedById: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    await linkStaffToUser({
      organizationId: input.organizationId,
      staffId: input.staffId,
      userId: existingUser.id,
      actorUserId: input.invitedById,
    });
    return;
  }

  const pendingInvite = await prisma.organizationInvite.findFirst({
    where: {
      organizationId: input.organizationId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvite) return;

  await inviteMember({
    organizationId: input.organizationId,
    email,
    role: "CASHIER",
    invitedById: input.invitedById,
  });
}

export async function createStaffMember(input: {
  organizationId: string;
  createdById: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  roleKey?: string | null;
  roleTitle: string;
  cashierCode?: string | null;
  wageRupees?: number | null;
  wagePeriod?: "DAILY" | "MONTHLY" | null;
  paymentFrequency?: string | null;
  overtimeRateRupees?: number | null;
  joinedAt?: string | Date | null;
  notes?: string | null;
  access?: Partial<import("@/lib/staff/access").StaffAccess>;
} & StaffCommissionInput) {
  await requireModule(input.organizationId, "staff");
  await ensureCatalogSchema();

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
  const commission = resolveCommission(input);
  const cashierCode = resolveCashierCodeInput(input.cashierCode);
  await assertUniqueCashierCode(input.organizationId, cashierCode);

  const staff = await prisma.staffMember.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      roleKey: input.roleKey?.trim() || null,
      roleTitle,
      cashierCode,
      wagePaise,
      wagePeriod: input.wagePeriod ?? null,
      paymentFrequency:
        input.paymentFrequency?.trim() || input.wagePeriod || null,
      overtimeRatePaise,
      ...commission,
      joinedAt,
      notes: input.notes?.trim() || null,
      status: "ACTIVE",
    },
  });

  await writeStaffAccessJson(staff.id, input.access ?? {});

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

  if (staff.email) {
    await ensureStaffLoginInvite({
      organizationId: input.organizationId,
      staffId: staff.id,
      email: staff.email,
      invitedById: input.createdById,
    });
  }

  return {
    ...staff,
    accessJson: staffAccessFromForm(input.access ?? {}),
  };
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
      email: true,
      joinedAt: true,
      commissionType: true,
      commissionPercent: true,
      commissionAmountPaise: true,
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
  email?: string | null;
  roleKey?: string | null;
  roleTitle?: string;
  cashierCode?: string | null;
  wageRupees?: number | null;
  wagePeriod?: "DAILY" | "MONTHLY" | null;
  paymentFrequency?: string | null;
  overtimeRateRupees?: number | null;
  joinedAt?: string | Date | null;
  status?: StaffStatus;
  notes?: string | null;
  access?: Partial<import("@/lib/staff/access").StaffAccess>;
} & StaffCommissionInput) {
  await requireModule(input.organizationId, "staff");
  await ensureCatalogSchema();

  const existing = await prisma.staffMember.findFirst({
    where: { id: input.staffId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Staff member not found");

  const data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    roleKey?: string | null;
    roleTitle?: string;
    cashierCode?: string | null;
    wagePaise?: bigint | null;
    wagePeriod?: string | null;
    paymentFrequency?: string | null;
    overtimeRatePaise?: bigint | null;
    commissionType?: StaffCommissionType;
    commissionPercent?: number | null;
    commissionAmountPaise?: bigint | null;
    status?: StaffStatus;
    leftAt?: Date | null;
    joinedAt?: Date;
    notes?: string | null;
  } = {};

  const accessToWrite =
    input.access !== undefined ? staffAccessFromForm(input.access) : undefined;

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Staff name must be at least 2 characters");
    data.name = name;
  }
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.roleKey !== undefined) data.roleKey = input.roleKey?.trim() || null;
  if (input.paymentFrequency !== undefined) {
    data.paymentFrequency = input.paymentFrequency?.trim() || null;
  }
  if (input.commissionType !== undefined) {
    Object.assign(data, resolveCommission(input));
  }
  if (input.joinedAt !== undefined && input.joinedAt) {
    data.joinedAt =
      typeof input.joinedAt === "string"
        ? dayKeyToUtcDate(input.joinedAt)
        : input.joinedAt;
  }
  if (input.roleTitle !== undefined) {
    const roleTitle = input.roleTitle.trim();
    if (!roleTitle) throw new Error("Role is required");
    data.roleTitle = roleTitle;
  }
  if (input.cashierCode !== undefined) {
    const cashierCode = resolveCashierCodeInput(input.cashierCode);
    await assertUniqueCashierCode(
      input.organizationId,
      cashierCode,
      input.staffId
    );
    data.cashierCode = cashierCode;
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

  if (accessToWrite !== undefined) {
    await writeStaffAccessJson(input.staffId, accessToWrite);
  }

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

  if (updated.email && !updated.userId) {
    await ensureStaffLoginInvite({
      organizationId: input.organizationId,
      staffId: updated.id,
      email: updated.email,
      invitedById: input.actorUserId,
    });
  }

  const accessJson =
    accessToWrite ?? (await readStaffAccessJson(updated.id));

  return { ...updated, accessJson };
}
