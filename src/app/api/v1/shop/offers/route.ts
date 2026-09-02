import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requireOwner,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createOffer,
  listOffers,
} from "@/services/shop/shop-offer.service";

const createOfferSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  discountType: z.enum([
    "PERCENT",
    "FIXED_AMOUNT",
    "PRODUCT_PERCENT",
    "PRODUCT_FIXED",
    "CATEGORY_PERCENT",
    "CATEGORY_FIXED",
    "BUY_X_GET_Y",
    "BUY_X_GET_X",
    "CART_MIN_FLAT",
  ]),
  discountValue: z.number().min(0),
  productIds: z.array(z.string().uuid()).optional(),
  categoryKeys: z.array(z.string()).optional(),
  minQuantity: z.number().int().positive().optional().nullable(),
  minPurchaseRupees: z.number().min(0).optional().nullable(),
  buyQuantity: z.number().int().positive().optional().nullable(),
  getQuantity: z.number().int().positive().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
}).superRefine((data, ctx) => {
  const isBogo =
    data.discountType === "BUY_X_GET_Y" || data.discountType === "BUY_X_GET_X";
  const isPercent = data.discountType.includes("PERCENT");
  const needsProducts =
    data.discountType.startsWith("PRODUCT") || isBogo;
  const needsCategory = data.discountType.startsWith("CATEGORY");

  if (!isBogo && !(data.discountValue > 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["discountValue"],
      message: "Discount value must be greater than zero",
    });
  }
  if (isPercent && data.discountValue > 100) {
    ctx.addIssue({
      code: "custom",
      path: ["discountValue"],
      message: "Percentage discount cannot be more than 100%",
    });
  }
  if (isBogo && (!data.buyQuantity || !data.getQuantity)) {
    ctx.addIssue({
      code: "custom",
      path: ["buyQuantity"],
      message: "Set both buy quantity and free quantity",
    });
  }
  if (needsProducts && !data.productIds?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["productIds"],
      message: "Select at least one product for this offer",
    });
  }
  if (needsCategory && !data.categoryKeys?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["categoryKeys"],
      message: "Select a category for this offer",
    });
  }
  if (data.discountType === "CART_MIN_FLAT" && !((data.minPurchaseRupees ?? 0) > 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["minPurchaseRupees"],
      message: "Set the minimum purchase amount",
    });
  }
  if (new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must be after the start date",
    });
  }
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get("filter") ?? "all") as
      | "active"
      | "upcoming"
      | "expired"
      | "all";
    const rows = await listOffers(ctx.organizationId, filter);
    return apiSuccess(serializeBigInt(rows));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requireOwner(ctx);
    const body = await request.json();
    const data = createOfferSchema.parse(body);
    const row = await createOffer({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: data.name,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      productIds: data.productIds,
      categoryKeys: data.categoryKeys,
      minQuantity: data.minQuantity,
      minPurchaseRupees: data.minPurchaseRupees,
      buyQuantity: data.buyQuantity,
      getQuantity: data.getQuantity,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: data.isActive,
      priority: data.priority,
    });
    return apiSuccess(serializeBigInt(row));
  });
}
