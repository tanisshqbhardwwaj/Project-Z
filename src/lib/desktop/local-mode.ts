import { prisma } from "@/lib/db/prisma";
import type { SyncOutboxStatus } from "@prisma/client";

export async function enqueueSyncOutbox(input: {
  organizationId: string;
  kind: string;
  payload: Record<string, unknown>;
}) {
  return prisma.syncOutbox.create({
    data: {
      organizationId: input.organizationId,
      kind: input.kind,
      payload: input.payload,
      status: "PENDING",
    },
  });
}

export async function processPendingOutbox(limit = 20) {
  const items = await prisma.syncOutbox.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const item of items) {
    await prisma.syncOutbox.update({
      where: { id: item.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    try {
      // Cloud push handled by desktop backup service in later phases.
      await prisma.syncOutbox.update({
        where: { id: item.id },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
    } catch (e) {
      await prisma.syncOutbox.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          lastError: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}

export function isLocalMode(): boolean {
  return process.env.PROJECT_Z_LOCAL_MODE === "true" || process.env.PROJECT_Z_DESKTOP === "true";
}

export function localDataRoot(): string | null {
  return process.env.PROJECT_Z_DATA_DIR ?? null;
}
