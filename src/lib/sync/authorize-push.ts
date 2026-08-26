import type { AuthContext } from "@/lib/api/context";
import { ApiError } from "@/lib/api/context";
import {
  isSyncKind,
  roleMayPushKind,
} from "@/lib/sync/push-policy";
import {
  requireShopBilling,
  requireShopReturns,
} from "@/lib/staff/shop-access";

export {
  CASHIER_SYNC_KINDS,
  cashierMayPushKind,
  isSyncKind,
  roleMayPushKind,
} from "@/lib/sync/push-policy";

export async function assertSyncPushKindAllowed(
  ctx: AuthContext,
  kind: string
): Promise<void> {
  if (!isSyncKind(kind)) {
    throw new ApiError(400, "UNKNOWN_KIND", `Unknown sync kind: ${kind}`);
  }

  if (ctx.role === "CASHIER") {
    if (kind === "sale.create") {
      await requireShopBilling(ctx);
      return;
    }
    if (kind === "return.create") {
      await requireShopReturns(ctx);
      return;
    }
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Cashiers can only sync sales and returns"
    );
  }

  if (!roleMayPushKind(ctx.role, kind)) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to sync this action");
  }
}
