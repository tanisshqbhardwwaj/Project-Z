import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { hasPermission } from "@/lib/permissions/rbac";
import { serializeBigInt } from "@/lib/db/prisma";
import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { resolveShopLabelBranding } from "@/lib/org/shop-settings";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    if (
      !hasPermission(ctx.role, "shop.inventory.manage") &&
      !hasPermission(ctx.role, "shop.sales")
    ) {
      requirePermission(ctx, "shop.inventory.manage");
    }

    const { id } = await context.params;
    await requireModule(ctx.organizationId, "shop_inventory");

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, settings: true },
    });
    if (!org) throw new Error("Organization not found");

    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!item) throw new Error("Inventory item not found");

    const branding = resolveShopLabelBranding(org.name, org.settings);

    return apiSuccess({
      item: serializeBigInt(item),
      branding,
    });
  });
}
