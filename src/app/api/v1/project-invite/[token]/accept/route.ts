import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { acceptProjectInvite } from "@/services/projects/project.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Please log in to accept this invitation");
    }

    const { token } = await params;
    const result = await acceptProjectInvite(token, session.user.id);
    return apiSuccess(serializeBigInt(result));
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleApi(async () => {
    const { token } = await params;
    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: {
          select: { name: true, deletedAt: true, workOrder: { select: { workOrderNumber: true } } },
        },
        organization: { select: { name: true } },
      },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new ApiError(404, "NOT_FOUND", "Invalid or expired invitation");
    }

    return apiSuccess({
      projectName: invite.project.name,
      workOrderNumber: invite.project.workOrder?.workOrderNumber ?? null,
      organizationName: invite.organization.name,
    });
  });
}
