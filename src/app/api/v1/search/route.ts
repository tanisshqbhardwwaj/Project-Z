import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { globalSearch } from "@/services/search.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const results = await globalSearch(ctx.organizationId, q);
    return apiSuccess(serializeBigInt(results));
  });
}
