import { prisma } from "@/lib/db/prisma";
import type { KotStatus } from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { parseKotPayload } from "@/lib/shop/invoices/kot";
import { createAuditLog } from "../shared/audit.service";

const ACTIVE_KOT_STATUSES: KotStatus[] = ["NEW", "PREPARING", "READY"];

export async function listRestaurantKots(input: {
  organizationId: string;
  branchId?: string;
  status?: KotStatus | KotStatus[];
  limit?: number;
}) {
  await requireModule(input.organizationId, "restaurant_kitchen");

  const statuses = input.status
    ? Array.isArray(input.status)
      ? input.status
      : [input.status]
    : ACTIVE_KOT_STATUSES;

  return prisma.restaurantKot.findMany({
    where: {
      organizationId: input.organizationId,
      status: { in: statuses },
      ...(input.branchId && {
        order: { branchId: input.branchId },
      }),
    },
    include: {
      order: {
        select: {
          id: true,
          branchId: true,
          tableId: true,
          customerName: true,
          orderType: true,
          table: { select: { id: true, name: true, area: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: input.limit ?? 100,
  });
}

export async function getRestaurantKot(organizationId: string, kotId: string) {
  await requireModule(organizationId, "restaurant_kitchen");

  const row = await prisma.restaurantKot.findFirst({
    where: { id: kotId, organizationId },
    include: {
      order: {
        include: {
          table: { select: { id: true, name: true, area: true } },
          waiter: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) throw new Error("KOT not found");

  return {
    ...row,
    parsedKot: parseKotPayload(row.kotJson),
  };
}

export async function updateRestaurantKotStatus(input: {
  organizationId: string;
  kotId: string;
  userId: string;
  status: KotStatus;
}) {
  await requireModule(input.organizationId, "restaurant_kitchen");

  const existing = await prisma.restaurantKot.findFirst({
    where: { id: input.kotId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("KOT not found");

  const kot = await prisma.restaurantKot.update({
    where: { id: existing.id },
    data: { status: input.status },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.kot.status_updated",
    entityType: "RestaurantKot",
    entityId: kot.id,
    before: existing,
    after: kot,
  });

  return kot;
}

export async function markRestaurantKotPreparing(input: {
  organizationId: string;
  kotId: string;
  userId: string;
}) {
  return updateRestaurantKotStatus({
    organizationId: input.organizationId,
    kotId: input.kotId,
    userId: input.userId,
    status: "PREPARING",
  });
}

export async function markRestaurantKotReady(input: {
  organizationId: string;
  kotId: string;
  userId: string;
}) {
  return updateRestaurantKotStatus({
    organizationId: input.organizationId,
    kotId: input.kotId,
    userId: input.userId,
    status: "READY",
  });
}

export async function markRestaurantKotServed(input: {
  organizationId: string;
  kotId: string;
  userId: string;
}) {
  return updateRestaurantKotStatus({
    organizationId: input.organizationId,
    kotId: input.kotId,
    userId: input.userId,
    status: "SERVED",
  });
}

export async function cancelRestaurantKot(input: {
  organizationId: string;
  kotId: string;
  userId: string;
}) {
  return updateRestaurantKotStatus({
    organizationId: input.organizationId,
    kotId: input.kotId,
    userId: input.userId,
    status: "CANCELLED",
  });
}

export async function listKitchenDisplayOrders(input: {
  organizationId: string;
  branchId: string;
}) {
  const kots = await listRestaurantKots({
    organizationId: input.organizationId,
    branchId: input.branchId,
    status: ["NEW", "PREPARING", "READY"],
    limit: 200,
  });

  return kots.map((kot) => ({
    ...kot,
    parsedKot: parseKotPayload(kot.kotJson),
  }));
}
