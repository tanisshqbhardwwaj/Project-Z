import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canViewAllProjects } from "@/lib/permissions/rbac";

/**
 * Returns project IDs the user may see.
 * `null` means org-wide access (OWNER / ACCOUNTANT).
 */
export async function getAccessibleProjectIds(
  organizationId: string,
  userId: string,
  role: OrgRole
): Promise<string[] | null> {
  if (canViewAllProjects(role)) return null;

  const members = await prisma.projectMember.findMany({
    where: {
      userId,
      project: { organizationId, deletedAt: null },
    },
    select: { projectId: true },
  });

  return members.map((m) => m.projectId);
}

/** Prisma `where` fragment to restrict rows to accessible projects. */
export function projectIdScope(accessibleProjectIds: string[] | null): {
  projectId?: { in: string[] };
} {
  if (accessibleProjectIds === null) return {};
  return { projectId: { in: accessibleProjectIds } };
}
