import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission, apiSuccess } from "@/lib/api/context";
import { createInviteLink } from "@/services/organization.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";
import type { OrgRole } from "@prisma/client";

const schema = z.object({
  role: z.enum(["PARTNER", "VIEWER", "ACCOUNTANT", "CASHIER"]).default("PARTNER"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id") ?? id);
    requirePermission(ctx, "org.invite");

    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);

    const { invite, url } = await createInviteLink({
      organizationId: ctx.organizationId,
      role: data.role as OrgRole,
      invitedById: ctx.userId,
    });

    return apiSuccess(serializeBigInt({ invite, url }));
  });
}
