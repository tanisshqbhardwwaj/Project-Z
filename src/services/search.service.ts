import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getAccessibleProjectIds,
  projectIdScope,
} from "@/lib/permissions/project-scope";

export async function globalSearch(
  organizationId: string,
  query: string,
  userId: string,
  role: OrgRole
) {
  const q = query.trim();
  if (!q) return { projects: [], vendors: [], expenses: [], payments: [] };

  const accessibleProjectIds = await getAccessibleProjectIds(
    organizationId,
    userId,
    role
  );
  const projectScope = projectIdScope(accessibleProjectIds);

  const [projects, vendors, expenses, payments] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(accessibleProjectIds !== null && { id: { in: accessibleProjectIds } }),
        OR: [{ name: { contains: q } }, { location: { contains: q } }],
      },
      take: 10,
    }),
    prisma.vendor.findMany({
      where: {
        organizationId,
        deletedAt: null,
        AND: [
          { OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
          ...(accessibleProjectIds !== null
            ? [
                {
                  OR: [
                    { expenses: { some: { deletedAt: null, ...projectScope } } },
                    { payments: { some: { deletedAt: null, ...projectScope } } },
                  ],
                },
              ]
            : []),
        ],
      },
      take: 10,
    }),
    prisma.expense.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...projectScope,
        OR: [{ description: { contains: q } }],
      },
      include: { project: { select: { name: true } }, vendor: { select: { name: true } } },
      take: 10,
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...projectScope,
        OR: [{ notes: { contains: q } }, { referenceNumber: { contains: q } }],
      },
      include: { vendor: { select: { name: true } } },
      take: 10,
    }),
  ]);

  return { projects, vendors, expenses, payments };
}
