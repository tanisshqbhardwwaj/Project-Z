import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import { getShopBranchContext } from "@/lib/shop/branch-context";
import { requireReportFeature } from "@/lib/billing/require-report-feature";
import {
  getShopCashCount,
  listShopCashCounts,
  upsertShopCashCount,
} from "@/services/shop-cash-count.service";

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  countType: z.enum(["OPENING", "CLOSING"]).default("CLOSING"),
  denominations: z.record(z.string(), z.number().int().min(0)),
  openingFloatRupees: z.number().min(0).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.expense.view");
    await requireReportFeature(ctx.organizationId, "cash-denomination");
    const shopCtx = await getShopBranchContext(
      ctx,
      request.headers.get("X-Branch-Id")
    );

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const countType = (searchParams.get("countType") ?? "CLOSING") as
      | "OPENING"
      | "CLOSING";
    const list = searchParams.get("list");

    if (list === "1") {
      const rows = await listShopCashCounts(ctx.organizationId);
      return apiSuccess(serializeBigInt(rows));
    }

    const dateStr = date ?? new Date().toISOString().slice(0, 10);
    const data = await getShopCashCount(
      ctx.organizationId,
      dateStr,
      countType,
      shopCtx.branchId
    );
    return apiSuccess(serializeBigInt(data));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.expense.manage");
    await requireReportFeature(ctx.organizationId, "cash-denomination");

    const body = await request.json();
    const data = upsertSchema.parse(body);

    const record = await upsertShopCashCount({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      dateStr: data.date,
      countType: data.countType,
      denominations: data.denominations,
      openingFloatPaise:
        data.openingFloatRupees != null
          ? BigInt(Math.round(data.openingFloatRupees * 100))
          : undefined,
      notes: data.notes,
    });

    return apiSuccess(serializeBigInt(record));
  });
}
