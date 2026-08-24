import { prisma } from "@/lib/db/prisma";
import type { AuthContext } from "@/lib/api/context";
import { ApiError } from "@/lib/api/context";
import { canManageOrg } from "@/lib/permissions/rbac";
import {
  parseStaffAccess,
  type StaffAccessKey,
} from "@/lib/staff/access";
import { readStaffAccessJson } from "@/lib/staff/access-storage";

export async function getLinkedStaffRecord(
  organizationId: string,
  userId: string
) {
  const staff = await prisma.staffMember.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
    select: { id: true, email: true },
  });
  if (!staff) return null;
  const accessJson = await readStaffAccessJson(staff.id);
  return { id: staff.id, accessJson, email: staff.email };
}

/** Cashiers need an explicit staff toggle; owners and other roles use RBAC only. */
export async function requireStaffAccess(
  ctx: AuthContext,
  capability: StaffAccessKey
) {
  if (canManageOrg(ctx.role)) return;
  if (ctx.role !== "CASHIER") return;

  const staff = await getLinkedStaffRecord(ctx.organizationId, ctx.userId);
  if (!staff) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your login is not linked to a staff profile"
    );
  }

  const access = parseStaffAccess(staff.accessJson);
  if (!access[capability]) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your owner has not granted this permission on your staff profile"
    );
  }
}
