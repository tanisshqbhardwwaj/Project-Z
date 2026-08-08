import { NextResponse } from "next/server";
import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    await getAuthContext(request.headers.get("X-Organization-Id"));

    const extraction = await prisma.aIExtraction.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!extraction?.document) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    const url = await getSignedDownloadUrl(extraction.document.storageKey, 3600);
    return apiSuccess({
      url,
      mimeType: extraction.document.mimeType,
      fileName: extraction.document.fileName,
    });
  });
}
