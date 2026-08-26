import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getSignedDownloadUrl } from "@/lib/storage";
import { getOrgScopedExtraction } from "@/services/extraction.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));

    const extraction = await getOrgScopedExtraction(id, ctx.organizationId);

    const url = await getSignedDownloadUrl(extraction.document.storageKey, 3600);
    return apiSuccess({
      url,
      mimeType: extraction.document.mimeType,
      fileName: extraction.document.fileName,
    });
  });
}
