import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getAuditLogs } from "@/services/audit.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);

    const logs = await getAuditLogs(ctx.organizationId, {
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess(serializeBigInt(logs));
  });
}
