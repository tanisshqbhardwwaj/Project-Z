import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getOrgDashboard } from "@/services/dashboard.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const dashboard = await getOrgDashboard(ctx.organizationId);
    return apiSuccess(serializeBigInt(dashboard));
  });
}
