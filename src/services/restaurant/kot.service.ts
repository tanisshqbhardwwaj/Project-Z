import type { KotStatus } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import { isBranchAll } from "@/lib/shop/branch-context";
import {
  cancelRestaurantKot,
  getRestaurantKot,
  listRestaurantKots as listKots,
  updateRestaurantKotStatus,
} from "./restaurant-kot.service";

export { getRestaurantKot, cancelRestaurantKot };

export async function listRestaurantKots(input: {
  organizationId: string;
  branchId?: string;
  status?: string;
  orderId?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const statuses = input.status
    ? (input.status.split(",").map((s) => s.trim()) as KotStatus[])
    : undefined;

  const rows = await listKots({
    organizationId: input.organizationId,
    branchId:
      input.branchId && !isBranchAll(input.branchId) ? input.branchId : undefined,
    status: statuses,
    limit: limit + 1,
  });

  const filtered = input.orderId
    ? rows.filter((row) => row.orderId === input.orderId)
    : rows;

  const startIdx = input.cursor
    ? Math.max(0, filtered.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(filtered.slice(startIdx, startIdx + limit + 1), limit);
}

export async function updateRestaurantKot(input: {
  organizationId: string;
  userId: string;
  kotId: string;
  status?: KotStatus;
}) {
  if (!input.status) throw new Error("Status is required");
  return updateRestaurantKotStatus({
    organizationId: input.organizationId,
    kotId: input.kotId,
    userId: input.userId,
    status: input.status,
  });
}
