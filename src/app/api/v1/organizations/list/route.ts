import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { modulesPayloadForClient } from "@/lib/org/require-module";

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
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            businessType: true,
            shopSector: true,
            enableStaff: true,
            timezone: true,
            settings: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const primaryOrgId = memberships[0]?.organizationId ?? null;

    const staffLinks = await prisma.staffMember.findMany({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        organizationId: { in: memberships.map((m) => m.organizationId) },
      },
      select: { id: true, name: true, organizationId: true },
    });
    const staffByOrg = new Map(staffLinks.map((s) => [s.organizationId, s]));

    return apiSuccess({
      organizations: serializeBigInt(
        memberships.map((m) => {
          const { enabledModules, settings } = modulesPayloadForClient({
            businessType: m.organization.businessType,
            shopSector: m.organization.shopSector,
            settings: m.organization.settings,
            enableStaff: m.organization.enableStaff,
          });
          const isPrimary = m.organizationId === primaryOrgId;
          const canDelete =
            !isPrimary && m.role === "OWNER" && memberships.length > 1;
          const linkedStaff = staffByOrg.get(m.organizationId);
          return {
            id: m.organization.id,
            name: m.organization.name,
            businessType: m.organization.businessType,
            shopSector: m.organization.shopSector,
            enableStaff: m.organization.enableStaff,
            timezone: m.organization.timezone,
            enabledModules,
            orgSettings: settings,
            role: m.role,
            isPrimary,
            canDelete,
            linkedStaff: linkedStaff
              ? { id: linkedStaff.id, name: linkedStaff.name }
              : null,
          };
        })
      ),
      activeOrganizationId: session.user.activeOrganizationId ?? memberships[0]?.organizationId,
      canCreateMore: memberships.length < MAX_ORGANIZATIONS,
    });
  });
}
