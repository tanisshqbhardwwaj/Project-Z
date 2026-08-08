import { prisma } from "@/lib/db/prisma";

export async function listPayments(
  organizationId: string,
  options?: { projectId?: string; limit?: number }
) {
  return prisma.payment.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(options?.projectId && { projectId: options.projectId }),
    },
    include: {
      paidBy: { select: { name: true } },
      vendor: true,
      project: { select: { name: true } },
    },
    orderBy: { paymentDate: "desc" },
    take: options?.limit ?? 100,
  });
}

export async function listDocuments(
  organizationId: string,
  options?: { projectId?: string; limit?: number }
) {
  return prisma.document.findMany({
    where: {
      organizationId,
      ...(options?.projectId && { projectId: options.projectId }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    include: { uploadedBy: { select: { name: true } } },
  });
}
