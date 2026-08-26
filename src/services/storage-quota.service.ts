import { prisma } from "@/lib/db/prisma";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import { ApiError } from "@/lib/api/context";

export class StorageQuotaError extends ApiError {
  constructor(message = "Cloud storage quota exceeded. Billing still works — delete photos or upgrade.") {
    super(403, "STORAGE_FULL", message);
  }
}

export async function assertCloudStorageAllowed(organizationId: string, additionalBytes: bigint) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { storageUsedBytes: true, storageQuotaBytes: true, subscriptionStatus: true },
  });
  if (!org) throw new Error("Organization not found");
  if (!subscriptionAllowsCloudSync(org.subscriptionStatus)) {
    throw new ApiError(403, "CLOUD_DISABLED", "Cloud storage is not available for this subscription.");
  }
  const used = org.storageUsedBytes;
  const quota = org.storageQuotaBytes;
  if (used + additionalBytes > quota) {
    throw new StorageQuotaError();
  }
}

export async function recordStorageUpload(input: {
  organizationId: string;
  storageKey: string;
  byteSize: bigint;
  category?: string;
}) {
  await assertCloudStorageAllowed(input.organizationId, input.byteSize);

  await prisma.$transaction(async (tx) => {
    await tx.storageObject.create({
      data: {
        organizationId: input.organizationId,
        storageKey: input.storageKey,
        byteSize: input.byteSize,
        category: input.category ?? "file",
      },
    });
    await tx.organization.update({
      where: { id: input.organizationId },
      data: { storageUsedBytes: { increment: input.byteSize } },
    });
  });
}

export async function recordStorageDelete(organizationId: string, storageKey: string) {
  const obj = await prisma.storageObject.findUnique({ where: { storageKey } });
  if (!obj || obj.organizationId !== organizationId) return;

  await prisma.$transaction(async (tx) => {
    await tx.storageObject.delete({ where: { storageKey } });
    await tx.organization.update({
      where: { id: organizationId },
      data: { storageUsedBytes: { decrement: obj.byteSize } },
    });
  });
}

export async function getStorageUsageBreakdown(organizationId: string) {
  const [grouped, org, documents] = await Promise.all([
    prisma.storageObject.groupBy({
      by: ["category"],
      where: { organizationId },
      _sum: { byteSize: true },
      _count: true,
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { storageUsedBytes: true, storageQuotaBytes: true },
    }),
    prisma.document.findMany({
      where: { organizationId },
      select: { storageKey: true, sizeBytes: true },
    }),
  ]);

  const trackedKeys = new Set(
    (
      await prisma.storageObject.findMany({
        where: { organizationId },
        select: { storageKey: true },
      })
    ).map((row) => row.storageKey)
  );

  const byCategory = new Map<string, { bytes: bigint; count: number }>();
  for (const g of grouped) {
    byCategory.set(g.category, {
      bytes: g._sum.byteSize ?? BigInt(0),
      count: g._count,
    });
  }

  let untrackedDocBytes = BigInt(0);
  let untrackedDocCount = 0;
  for (const doc of documents) {
    if (trackedKeys.has(doc.storageKey)) continue;
    untrackedDocBytes += BigInt(doc.sizeBytes);
    untrackedDocCount += 1;
  }
  if (untrackedDocCount > 0) {
    const existing = byCategory.get("document") ?? { bytes: BigInt(0), count: 0 };
    byCategory.set("document", {
      bytes: existing.bytes + untrackedDocBytes,
      count: existing.count + untrackedDocCount,
    });
  }

  let used = BigInt(0);
  for (const row of byCategory.values()) used += row.bytes;

  if (org && org.storageUsedBytes !== used) {
    await prisma.organization
      .update({
        where: { id: organizationId },
        data: { storageUsedBytes: used },
      })
      .catch(() => undefined);
  }

  return {
    usedBytes: used.toString(),
    quotaBytes: org?.storageQuotaBytes?.toString() ?? "0",
    byCategory: [...byCategory.entries()].map(([category, row]) => ({
      category,
      bytes: row.bytes.toString(),
      count: row.count,
    })),
  };
}

export async function evictOldestBackups(organizationId: string, targetFreeBytes: bigint) {
  const backups = await prisma.storageObject.findMany({
    where: { organizationId, category: "backup" },
    orderBy: { createdAt: "asc" },
  });
  let freed = BigInt(0);
  for (const b of backups) {
    if (freed >= targetFreeBytes) break;
    await recordStorageDelete(organizationId, b.storageKey);
    freed += b.byteSize;
  }
  return freed;
}
