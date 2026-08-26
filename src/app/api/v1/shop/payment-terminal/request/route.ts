import { z } from "zod";
import { getAuthContext, handleApi, apiSuccess } from "@/lib/api/context";
import { requireShopBilling } from "@/lib/staff/shop-access";
import { createTerminalPaymentRequest } from "@/services/shop-payment-terminal.service";

const schema = z.object({
  amountPaise: z.string().regex(/^\d+$/),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireShopBilling(ctx);

    const body = schema.parse(await request.json());
    const amountPaise = BigInt(body.amountPaise);
    if (amountPaise <= BigInt(0)) {
      throw new Error("Amount must be greater than zero");
    }

    const result = await createTerminalPaymentRequest(ctx.organizationId, amountPaise);
    return apiSuccess(result);
  });
}
