import { handleApi, apiSuccess, getAuthContext, requireOwner, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { subscriptionAllowsCloudSync } from "@/lib/billing/entitlements";
import {
  assertCloudStorageAllowed,
  evictOldestBackups,
  recordStorageUpload,
} from "@/services/shared/storage-quota.service";
import { uploadFile, buildStorageKey } from "@/lib/storage/index";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { subscriptionStatus: true },
    });
    if (!org) throw new ApiError(404, "NOT_FOUND", "Organization not found");
    if (!subscriptionAllowsCloudSync(org.subscriptionStatus)) {
      throw new ApiError(403, "CLOUD_DISABLED", "Cloud backup is not available.");
    }

    const body = Buffer.from(await request.arrayBuffer());
    if (body.length === 0) {
      throw new ApiError(400, "NO_DATA", "Empty backup payload");
    }

    const size = BigInt(body.length);
    try {
      await assertCloudStorageAllowed(ctx.organizationId, size);
    } catch (e) {
      if (e instanceof Error && "code" in e && (e as { code: string }).code === "STORAGE_FULL") {
        await evictOldestBackups(ctx.organizationId, size);
        await assertCloudStorageAllowed(ctx.organizationId, size);
      } else {
        throw e;
      }
    }

    const key = buildStorageKey(ctx.organizationId, "backups", "shop-backup.db");
    await uploadFile(key, body, "application/octet-stream", {
      organizationId: ctx.organizationId,
      category: "backup",
    });

    return apiSuccess({ storageKey: key, byteSize: body.length });
  });
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"), {
      allowCancelled: true,
    });
    requireOwner(ctx);

    const latest = await prisma.storageObject.findFirst({
      where: { organizationId: ctx.organizationId, category: "backup" },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      latest: latest
        ? { storageKey: latest.storageKey, createdAt: latest.createdAt, byteSize: latest.byteSize.toString() }
        : null,
    });
  });
}
