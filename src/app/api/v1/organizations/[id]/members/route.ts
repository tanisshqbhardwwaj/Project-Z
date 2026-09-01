import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission, apiSuccess } from "@/lib/api/context";
import { inviteMember, getOrganizationMembers } from "@/services/org/organization.service";
import { getClientIp } from "@/lib/rate-limit";
import { serializeBigInt } from "@/lib/db/prisma";
import type { OrgRole } from "@prisma/client";
import {
  canCreateOrgTeamInvite,
  SHOP_STAFF_ONLY_INVITE_MESSAGE,
} from "@/lib/staff/shop-staff-gate";
import { emailFieldSchema } from "@/lib/validation/fields";

const inviteSchema = z.object({
  email: emailFieldSchema,
  role: z.enum(["PARTNER", "VIEWER", "ACCOUNTANT"]).default("PARTNER"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id") ?? id);
    requirePermission(ctx, "org.invite");
    const members = await getOrganizationMembers(ctx.organizationId);
    return apiSuccess(serializeBigInt(members));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id") ?? id);
    requirePermission(ctx, "org.invite");

    const body = await request.json();
    const data = inviteSchema.parse(body);
    if (!canCreateOrgTeamInvite(ctx.businessType)) {
      throw new ApiError(403, "SHOP_STAFF_ONLY", SHOP_STAFF_ONLY_INVITE_MESSAGE);
    }
    const { invite } = await inviteMember({
      organizationId: ctx.organizationId,
      email: data.email,
      role: data.role as OrgRole,
      invitedById: ctx.userId,
      clientIp: getClientIp(request),
    });

    return NextResponse.json({ data: serializeBigInt(invite) }, { status: 201 });
  });
}
