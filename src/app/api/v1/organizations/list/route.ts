import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";

export async function GET() {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    return apiSuccess({
      organizations: serializeBigInt(
        memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        }))
      ),
      activeOrganizationId: session.user.activeOrganizationId ?? memberships[0]?.organizationId,
      canCreateMore: memberships.length < MAX_ORGANIZATIONS,
    });
  });
}
