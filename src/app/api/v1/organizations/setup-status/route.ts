import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { getOrgSetupStatus } from "@/services/org/org-setup-status.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const status = await getOrgSetupStatus(ctx.organizationId);
    return apiSuccess(status);
  });
}
