import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const ctx = await getAuthContext(_request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    await requireModule(ctx.organizationId, "staff");
    const { id } = await params;
    const row = await prisma.staffPayroll.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        staff: { select: { name: true, roleTitle: true } },
        lines: true,
      },
    });
    if (!row) throw new Error("Payslip not found");
    return apiSuccess(serializeBigInt(row));
  });
}
