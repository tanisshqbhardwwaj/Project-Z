import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { writeActiveOrgCookie } from "@/lib/org/active-org-cookie";
import { z } from "zod";

const schema = z.object({ organizationId: z.string().uuid() });

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const body = await request.json();
    const { organizationId } = schema.parse(body);

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!member || member.status !== "ACTIVE") {
      throw new ApiError(403, "FORBIDDEN", "Not a member of this organization");
    }

    await writeActiveOrgCookie(organizationId);

    return apiSuccess({ activeOrganizationId: organizationId });
  });
}
