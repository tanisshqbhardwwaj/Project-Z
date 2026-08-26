import { NextResponse } from "next/server";
import { getAuthContext, handleApi, apiSuccess, requirePermission } from "@/lib/api/context";
import { getVendorLedger } from "@/services/vendor.service";
import { serializeBigInt } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "financial.view");
    const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;

    const ledger = await getVendorLedger(id, ctx.organizationId, { projectId });
    if (!ledger) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Vendor not found" } },
        { status: 404 }
      );
    }

    return apiSuccess(serializeBigInt(ledger));
  });
}
