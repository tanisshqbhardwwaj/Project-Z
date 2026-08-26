import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type { AuthContext } from "@/lib/api/context";
import type { Prisma } from "@prisma/client";
import { OUTBOX_MAX_ATTEMPTS, nextOutboxFailure } from "@/lib/sync/outbox-policy";
import { applySyncPush } from "@/services/shop-sync.service";

export async function enqueueSyncOutbox(input: {
  organizationId: string;
  kind: string;
  payload: Record<string, unknown>;
}) {
  return prisma.syncOutbox.create({
    data: {
      organizationId: input.organizationId,
      kind: input.kind,
      payload: input.payload as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });
}

/** Apply queued desktop/server mutations. 8 failures → FAILED (dead-letter). */
export async function processPendingOutbox(ctx: AuthContext, limit = 20) {
  const items = await prisma.syncOutbox.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    const nextAttempts = item.attempts + 1;
    await prisma.syncOutbox.update({
      where: { id: item.id },
      data: { status: "PROCESSING", attempts: nextAttempts },
    });

    const payload =
      item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
        ? (item.payload as Record<string, unknown>)
        : {};

    try {
      const [result] = await applySyncPush({
        ctx,
        items: [{ id: item.id, kind: item.kind, payload }],
      });
      if (!result || result.status === "error") {
        throw new Error(result?.error ?? "Sync apply failed");
      }
      await prisma.syncOutbox.update({
        where: { id: item.id },
        data: { status: "COMPLETED", processedAt: new Date(), lastError: null },
      });
      processed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const failure = nextOutboxFailure(item.attempts);
      await prisma.syncOutbox.update({
        where: { id: item.id },
        data: {
          status: failure.status === "DEAD" ? "FAILED" : "PENDING",
          attempts: failure.attempts,
          lastError: message,
        },
      });
      failed += 1;
      logger.error("desktop.outbox.item_failed", {
        id: item.id,
        kind: item.kind,
        attempts: nextAttempts,
        max: OUTBOX_MAX_ATTEMPTS,
        error: message,
      });
    }
  }

  return { processed, failed, scanned: items.length };
}

export function isLocalMode(): boolean {
  return process.env.PROJECT_Z_LOCAL_MODE === "true" || process.env.PROJECT_Z_DESKTOP === "true";
}

export function localDataRoot(): string | null {
  return process.env.PROJECT_Z_DATA_DIR ?? null;
}
