import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requireProjectAccess, apiSuccess, ApiError } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));

    const document = await prisma.document.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!document) {
      throw new ApiError(404, "NOT_FOUND", "Document not found");
    }

    if (document.projectId) {
      await requireProjectAccess(ctx, document.projectId);
    }

    const url = await getSignedDownloadUrl(document.storageKey, 3600);
    return apiSuccess({
      url,
      mimeType: document.mimeType,
      fileName: document.fileName,
    });
  });
}
