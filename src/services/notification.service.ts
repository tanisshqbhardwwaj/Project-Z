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

function metadataAlertKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const key = (metadata as Record<string, unknown>).alertKey;
  return typeof key === "string" ? key : null;
}

export async function upsertUnreadAlertNotification(input: {
  organizationId: string;
  userId: string;
  type: string;
  alertKey: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  href?: string;
}) {
  const unread = await prisma.notification.findMany({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const existing = unread.find((n) => metadataAlertKey(n.metadata) === input.alertKey);
  const metadata = {
    ...input.metadata,
    alertKey: input.alertKey,
    ...(input.href ? { href: input.href } : {}),
  };

  if (existing) {
    return prisma.notification.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        body: input.body,
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    });
  }

  return createNotification({
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata,
  });
}

export async function resolveUnreadAlertNotifications(input: {
  organizationId: string;
  userId: string;
  type: string;
  alertKey: string;
}) {
  const unread = await prisma.notification.findMany({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      readAt: null,
    },
  });

  const ids = unread
    .filter((n) => metadataAlertKey(n.metadata) === input.alertKey)
    .map((n) => n.id);

  if (ids.length === 0) return { updated: 0 };

  const result = await prisma.notification.updateMany({
    where: { id: { in: ids }, organizationId: input.organizationId, userId: input.userId },
    data: { readAt: new Date() },
  });

  return { updated: result.count };
}

export async function getNotifications(userId: string, organizationId: string) {
  return prisma.notification.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(
  id: string,
  userId: string,
  organizationId: string
) {
  return prisma.notification.updateMany({
    where: { id, userId, organizationId },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string, organizationId: string) {
  return prisma.notification.count({
    where: { userId, organizationId, readAt: null },
  });
}
