import { prisma } from "@/lib/db/prisma";

export async function createNotification(input: {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
    },
  });
}

export async function getNotifications(userId: string, organizationId: string) {
  return prisma.notification.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string, organizationId: string) {
  return prisma.notification.count({
    where: { userId, organizationId, readAt: null },
  });
}
