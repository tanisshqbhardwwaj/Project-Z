import { getAuthContext, handleApi, apiSuccess, requirePermission } from "@/lib/api/context";
import { testTerminalConnection } from "@/services/shop/shop-payment-terminal.service";

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "org.manage");
    void request;

    const message = await testTerminalConnection(ctx.organizationId);
    return apiSuccess({ message });
  });
}
