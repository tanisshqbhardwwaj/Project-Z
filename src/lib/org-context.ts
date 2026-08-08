import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export async function getSessionAndOrg() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const activeOrgId = session.user.activeOrganizationId;

  const membership = activeOrgId
    ? await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrgId,
            userId: session.user.id,
          },
        },
        include: { organization: true },
      })
    : null;

  const resolved =
    membership?.status === "ACTIVE"
      ? membership
      : await prisma.organizationMember.findFirst({
          where: { userId: session.user.id, status: "ACTIVE" },
          include: { organization: true },
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
