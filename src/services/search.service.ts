import { prisma } from "@/lib/db/prisma";

export async function globalSearch(organizationId: string, query: string) {
  const q = query.trim();
  if (!q) return { projects: [], vendors: [], expenses: [], payments: [] };

  const [projects, vendors, expenses, payments] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ name: { contains: q } }, { location: { contains: q } }],
      },
      take: 10,
    }),
    prisma.vendor.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ name: { contains: q } }, { phone: { contains: q } }],
      },
      take: 10,
    }),
    prisma.expense.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ description: { contains: q } }],
      },
      include: { project: { select: { name: true } }, vendor: { select: { name: true } } },
      take: 10,
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ notes: { contains: q } }, { referenceNumber: { contains: q } }],
      },
      include: { vendor: { select: { name: true } } },
      take: 10,
    }),
  ]);

  return { projects, vendors, expenses, payments };
}
