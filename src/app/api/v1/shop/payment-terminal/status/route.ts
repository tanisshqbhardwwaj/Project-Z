import { z } from "zod";
import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { requireShopBilling } from "@/lib/staff/shop-access";
import { getTerminalPaymentStatus } from "@/services/shop/shop-payment-terminal.service";

const schema = z.object({
  externalId: z.string().min(1),
  txnDate: z.string().min(1),
  merchantTxnId: z.string().min(1),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);

    const body = schema.parse(await request.json());
    const result = await getTerminalPaymentStatus(ctx.organizationId, body);
    return apiSuccess(result);
  });
}
