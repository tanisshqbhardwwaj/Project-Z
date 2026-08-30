import type { RestaurantOrderStatus, SalesChannel, ShopOrderType } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import { isBranchAll } from "@/lib/shop/branch-context";
import {
  addRestaurantOrderItems,
  cancelRestaurantOrder,
  createRestaurantOrder,
  deleteRestaurantOrder,
  fireRestaurantKot,
  getRestaurantOrder,
  listRestaurantOrders as listOrders,
  openRestaurantOrder,
  settleRestaurantOrder,
  updateRestaurantOrder,
} from "./restaurant-order.service";

export {
  getRestaurantOrder,
  createRestaurantOrder,
  updateRestaurantOrder,
  deleteRestaurantOrder,
  addRestaurantOrderItems,
  fireRestaurantKot,
  settleRestaurantOrder,
  openRestaurantOrder,
  cancelRestaurantOrder,
};

export async function listRestaurantOrders(input: {
  organizationId: string;
  branchId: string;
  tableId?: string;
  status?: string;
  orderType?: string;
  channel?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listOrders({
    organizationId: input.organizationId,
    branchId:
      input.branchId && !isBranchAll(input.branchId) ? input.branchId : input.branchId,
    tableId: input.tableId,
    status: input.status as RestaurantOrderStatus | undefined,
    limit: limit + 1,
  });

  const filtered = rows.filter((row) => {
    if (input.orderType && row.orderType !== (input.orderType as ShopOrderType)) {
      return false;
    }
    if (input.channel && row.channel !== (input.channel as SalesChannel)) {
      return false;
    }
    return true;
  });

  const startIdx = input.cursor
    ? Math.max(0, filtered.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(filtered.slice(startIdx, startIdx + limit + 1), limit);
}
