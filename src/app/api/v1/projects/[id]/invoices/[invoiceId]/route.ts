import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
  apiSuccess,
  ApiError,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getProjectInvoice } from "@/services/project-invoice.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  return handleApi(async () => {
    const { id, invoiceId } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    await requireProjectAccess(ctx, id);

    const invoice = await getProjectInvoice(id, invoiceId, ctx.organizationId);
    if (!invoice) {
      throw new ApiError(404, "NOT_FOUND", "Invoice not found");
    }
    return apiSuccess(serializeBigInt(invoice));
  });
}
