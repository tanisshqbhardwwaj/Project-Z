import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { acceptInvite } from "@/services/organization.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { prisma } from "@/lib/db/prisma";

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

    const count = await prisma.organizationMember.count({
      where: { userId: session.user.id, status: "ACTIVE" },
    });
    if (count >= MAX_ORGANIZATIONS) {
      throw new ApiError(
        409,
        "ORG_LIMIT",
        `You can belong to at most ${MAX_ORGANIZATIONS} organizations`
      );
    }

    const result = await acceptInvite(token, session.user.id);
    return apiSuccess(serializeBigInt(result));
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleApi(async () => {
    const { token } = await params;
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ApiError(404, "NOT_FOUND", "Invalid or expired invitation");
    }

    return apiSuccess({
      email: invite.email,
      organizationName: invite.organization.name,
      role: invite.role,
    });
  });
}
