import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { resolveBarcodeScan } from "@/services/shop.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");

    const code = new URL(request.url).searchParams.get("code");
    if (!code?.trim()) {
      throw new Error("code query parameter is required");
    }

    const result = await resolveBarcodeScan(ctx.organizationId, code);
    return apiSuccess(serializeBigInt(result));
  });
}
