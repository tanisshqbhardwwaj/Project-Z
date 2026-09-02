import { prisma } from "@/lib/db/prisma";

const RETENTION = {
  auditLogDays: 365,
  notificationDays: 180,
  syncMutationDays: 90,
  syncOutboxCompletedDays: 30,
} as const;

export async function pruneStalePlatformData() {
  const now = new Date();
  const auditBefore = new Date(now);
  auditBefore.setDate(auditBefore.getDate() - RETENTION.auditLogDays);
  const notificationBefore = new Date(now);
  notificationBefore.setDate(notificationBefore.getDate() - RETENTION.notificationDays);
  const mutationBefore = new Date(now);
  mutationBefore.setDate(mutationBefore.getDate() - RETENTION.syncMutationDays);
  const outboxBefore = new Date(now);
  outboxBefore.setDate(outboxBefore.getDate() - RETENTION.syncOutboxCompletedDays);

  const [audit, notifications, mutations, outbox] = await Promise.all([
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditBefore } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: notificationBefore } } }),
    prisma.syncMutation.deleteMany({ where: { appliedAt: { lt: mutationBefore } } }),
    prisma.syncOutbox.deleteMany({
      where: { status: "COMPLETED", processedAt: { lt: outboxBefore } },
    }),
  ]);

  return {
    auditLogs: audit.count,
    notifications: notifications.count,
    syncMutations: mutations.count,
    syncOutbox: outbox.count,
  };
}
