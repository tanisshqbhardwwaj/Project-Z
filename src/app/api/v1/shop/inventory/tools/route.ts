import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  bulkGenerateBarcodes,
  bulkImportInventoryItems,
  bulkUpdatePrices,
  mergeInventoryItems,
  receiveStock,
} from "@/services/shop/shop.service";
import { csvRowsToImport, parseCsvText } from "@/lib/shop/inventory/inventory-bulk-csv";
import { prisma } from "@/lib/db/prisma";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";

const bulkImportSchema = z.object({
  action: z.literal("bulk-import"),
  csv: z.string().min(1),
});

const bulkBarcodesSchema = z.object({
  action: z.literal("bulk-barcodes"),
  itemIds: z.array(z.string().uuid()).optional(),
  onlyMissing: z.boolean().optional(),
});

const bulkPricesSchema = z.object({
  action: z.literal("bulk-prices"),
  itemIds: z.array(z.string().uuid()).optional(),
  category: z.string().max(40).optional().nullable(),
  mode: z.enum(["set", "increase_percent", "decrease_percent", "add", "subtract"]),
  value: z.number().min(0),
});

const receiveStockSchema = z.object({
  action: z.literal("receive-stock"),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        addQty: z.number().positive(),
        costRupees: z.number().min(0).optional().nullable(),
      })
    )
    .min(1),
});

const mergeSchema = z.object({
  action: z.literal("merge"),
  keepItemId: z.string().uuid(),
  mergeItemIds: z.array(z.string().uuid()).min(1),
  combineStock: z.boolean().optional(),
});

const toolsSchema = z.discriminatedUnion("action", [
  bulkImportSchema,
  bulkBarcodesSchema,
  bulkPricesSchema,
  receiveStockSchema,
  mergeSchema,
]);

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.inventory.manage");

    const body = await request.json();
    const data = toolsSchema.parse(body);

    if (data.action === "bulk-import") {
      const rows = parseCsvText(data.csv);
      const { items, errors: parseErrors } = csvRowsToImport(rows);
      if (items.length === 0) {
        return NextResponse.json(
          { error: parseErrors[0] ?? "No valid rows in CSV" },
          { status: 400 }
        );
      }

      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
        select: { shopSector: true, settings: true },
      });
      const businessTypes = resolveShopBusinessTypes(org.settings, org.shopSector);

      const result = await bulkImportInventoryItems({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        items,
        businessTypes,
      });

      return apiSuccess({
        ...result,
        parseErrors,
      });
    }

    if (data.action === "bulk-barcodes") {
      const result = await bulkGenerateBarcodes({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        itemIds: data.itemIds,
        onlyMissing: data.onlyMissing,
      });
      return apiSuccess(result);
    }

    if (data.action === "bulk-prices") {
      const result = await bulkUpdatePrices({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        itemIds: data.itemIds,
        category: data.category,
        mode: data.mode,
        value: data.value,
      });
      return apiSuccess(result);
    }

    if (data.action === "receive-stock") {
      const result = await receiveStock({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        lines: data.lines,
      });
      return apiSuccess(result);
    }

    if (data.action === "merge") {
      if (ctx.role !== "OWNER" && ctx.role !== "PARTNER") {
        return NextResponse.json(
          { error: "Only shop owners or partners can merge duplicate products" },
          { status: 403 }
        );
      }

      const result = await mergeInventoryItems({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        keepItemId: data.keepItemId,
        mergeItemIds: data.mergeItemIds,
        combineStock: data.combineStock,
      });
      return apiSuccess(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  });
}
