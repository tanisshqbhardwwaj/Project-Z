import { handleApi, getAuthContext, apiSuccess } from "@/lib/api/context";
import { listActiveOrgAddonKeys } from "@/lib/billing/org-addon.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const addonKeys = await listActiveOrgAddonKeys(ctx.organizationId);
    return apiSuccess({ addonKeys });
  });
}
