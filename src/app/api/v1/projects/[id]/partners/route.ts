import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
  apiSuccess,
} from "@/lib/api/context";
import {
  getProjectPartnersOverview,
  inviteProjectPartner,
  createProjectInviteLink,
  canManageProject,
} from "@/services/project.service";
import { prisma } from "@/lib/db/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";

const inviteSchema = z.object({ email: z.string().email() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);
    const overview = await getProjectPartnersOverview(id, ctx.organizationId, ctx.userId);
    return apiSuccess(serializeBigInt(overview));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const project = await prisma.project.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { createdById: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    const canInvite = await canManageProject(ctx.userId, ctx.organizationId, project);
    if (!canInvite) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the work order owner can invite partners" } },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === "link") {
      const { invite, url } = await createProjectInviteLink({
        projectId: id,
        organizationId: ctx.organizationId,
        invitedById: ctx.userId,
      });
      return apiSuccess(serializeBigInt({ invite, url }));
    }

    const { email } = inviteSchema.parse(body);
    const invite = await inviteProjectPartner({
      projectId: id,
      organizationId: ctx.organizationId,
      email,
      invitedById: ctx.userId,
      clientIp: getClientIp(request),
    });
    return NextResponse.json({ data: serializeBigInt(invite) }, { status: 201 });
  });
}
