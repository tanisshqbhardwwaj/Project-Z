import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission, apiSuccess } from "@/lib/api/context";
import { inviteMember, getOrganizationMembers } from "@/services/organization.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";
import type { OrgRole } from "@prisma/client";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["PARTNER", "VIEWER", "ACCOUNTANT", "CASHIER"]).default("PARTNER"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id") ?? id);
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
    const invite = await inviteMember({
      organizationId: ctx.organizationId,
      email: data.email,
      role: data.role as OrgRole,
      invitedById: ctx.userId,
    });

    return NextResponse.json({ data: serializeBigInt(invite) }, { status: 201 });
  });
}
