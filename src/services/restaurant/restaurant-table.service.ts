import { prisma } from "@/lib/db/prisma";
import type { RestaurantTableStatus } from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../shared/audit.service";

export async function listRestaurantTables(input: {
  organizationId: string;
  branchId: string;
  status?: RestaurantTableStatus;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  return prisma.restaurantTable.findMany({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      ...(input.status && { status: input.status }),
    },
    include: {
      orders: {
        where: { status: "OPEN" },
        select: { id: true, createdAt: true, customerName: true },
        take: 1,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getRestaurantTable(
  organizationId: string,
  tableId: string
) {
  await requireModule(organizationId, "restaurant_tables");

  const row = await prisma.restaurantTable.findFirst({
    where: { id: tableId, organizationId },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLED"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!row) throw new Error("Table not found");
  return row;
}

export async function createRestaurantTable(input: {
  organizationId: string;
  branchId: string;
  name: string;
  area?: string | null;
  seats?: number;
  sortOrder?: number;
  userId: string;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const existing = await prisma.restaurantTable.findFirst({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      name: input.name.trim(),
    },
  });
  if (existing) throw new Error("A table with this name already exists");

  const table = await prisma.restaurantTable.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      name: input.name.trim(),
      area: input.area?.trim() || null,
      seats: input.seats ?? 4,
      sortOrder: input.sortOrder ?? 0,
      status: "FREE",
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.table.created",
    entityType: "RestaurantTable",
    entityId: table.id,
    after: table,
  });

  return table;
}

export async function updateRestaurantTable(input: {
  organizationId: string;
  tableId: string;
  userId?: string;
  name?: string;
  area?: string | null;
  seats?: number;
  sortOrder?: number;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const existing = await prisma.restaurantTable.findFirst({
    where: { id: input.tableId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Table not found");

  if (input.name && input.name.trim() !== existing.name) {
    const duplicate = await prisma.restaurantTable.findFirst({
      where: {
        organizationId: input.organizationId,
        branchId: existing.branchId,
        name: input.name.trim(),
        NOT: { id: existing.id },
      },
    });
    if (duplicate) throw new Error("A table with this name already exists");
  }

  const table = await prisma.restaurantTable.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.area !== undefined && { area: input.area?.trim() || null }),
      ...(input.seats !== undefined && { seats: input.seats }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId ?? input.organizationId,
    action: "restaurant.table.updated",
    entityType: "RestaurantTable",
    entityId: table.id,
    before: existing,
    after: table,
  });

  return table;
}

export async function updateRestaurantTableStatus(input: {
  organizationId: string;
  tableId: string;
  userId: string;
  status: RestaurantTableStatus;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const existing = await prisma.restaurantTable.findFirst({
    where: { id: input.tableId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Table not found");

  if (input.status === "FREE") {
    const openOrder = await prisma.restaurantOrder.findFirst({
      where: {
        organizationId: input.organizationId,
        tableId: existing.id,
        status: { in: ["OPEN", "BILLED"] },
      },
      select: { id: true },
    });
    if (openOrder) throw new Error("Table has an open order");
  }

  const table = await prisma.restaurantTable.update({
    where: { id: existing.id },
    data: { status: input.status },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.table.status_updated",
    entityType: "RestaurantTable",
    entityId: table.id,
    before: existing,
    after: table,
  });

  return table;
}

export async function deleteRestaurantTable(input: {
  organizationId: string;
  tableId: string;
  userId?: string;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const existing = await prisma.restaurantTable.findFirst({
    where: { id: input.tableId, organizationId: input.organizationId },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!existing) throw new Error("Table not found");
  if (existing.orders.length > 0) {
    throw new Error("Cannot delete a table with an open order");
  }

  await prisma.restaurantTable.delete({ where: { id: existing.id } });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId ?? input.organizationId,
    action: "restaurant.table.deleted",
    entityType: "RestaurantTable",
    entityId: existing.id,
    before: existing,
  });

  return { deleted: true, id: existing.id };
}
