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

<<<<<<< Updated upstream
    return apiSuccess({
      organizations: serializeBigInt(
        memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        }))
=======
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

    const activeMembership =
      memberships.find(
        (m) =>
          m.organizationId === session.user.activeOrganizationId &&
          m.organization.subscriptionStatus !== "CANCELLED"
      ) ??
      memberships.find((m) => m.organization.subscriptionStatus !== "CANCELLED") ??
      memberships[0];

    return apiSuccess({
      organizations: serializeBigInt(
        memberships.map((m) => {
          const { enabledModules, settings } = modulesPayloadForClient({
            businessType: m.organization.businessType,
            shopSector: m.organization.shopSector,
            settings: m.organization.settings,
            enableStaff: m.organization.enableStaff,
            plan: m.organization.plan,
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
            plan: m.organization.plan,
            subscriptionStatus: m.organization.subscriptionStatus,
            isPrimary,
            canDelete,
            linkedStaff: linkedStaff
              ? { id: linkedStaff.id, name: linkedStaff.name }
              : null,
          };
        })
>>>>>>> Stashed changes
      ),
      activeOrganizationId: activeMembership?.organizationId ?? null,
      canCreateMore: memberships.length < MAX_ORGANIZATIONS,
    });
  });
}
