import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { readActiveOrgCookie } from "@/lib/org/active-org-cookie";

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  businessType: true,
  shopSector: true,
  enableStaff: true,
  timezone: true,
  settings: true,
} as const;

export async function getSessionAndOrg() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cookieOrgId = await readActiveOrgCookie();
  const activeOrgId = cookieOrgId ?? session.user.activeOrganizationId;

  const membership = activeOrgId
    ? await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrgId,
            userId: session.user.id,
          },
        },
        include: { organization: { select: organizationSelect } },
      })
    : null;

  const resolved =
    membership?.status === "ACTIVE"
      ? membership
      : await prisma.organizationMember.findFirst({
          where: { userId: session.user.id, status: "ACTIVE" },
          include: { organization: { select: organizationSelect } },
          orderBy: { joinedAt: "asc" },
        });

  if (!resolved) redirect("/onboarding");

  return {
    session,
    userId: session.user.id,
    organizationId: resolved.organizationId,
    organization: resolved.organization,
    role: resolved.role,
  };
}
