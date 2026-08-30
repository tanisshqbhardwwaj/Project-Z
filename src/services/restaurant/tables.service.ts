import type { RestaurantTableStatus } from "@prisma/client";
import {
  createRestaurantTable as createTable,
  deleteRestaurantTable as deleteTable,
  getRestaurantTable,
  listRestaurantTables,
  updateRestaurantTable as updateTable,
  updateRestaurantTableStatus,
} from "./restaurant-table.service";

export {
  listRestaurantTables,
  getRestaurantTable,
  updateRestaurantTableStatus,
};

export async function createRestaurantTable(input: {
  organizationId: string;
  branchId: string;
  name: string;
  area?: string | null;
  seats?: number;
  sortOrder?: number;
  userId?: string;
}) {
  return createTable({
    ...input,
    userId: input.userId ?? input.organizationId,
  });
}

export async function updateRestaurantTable(input: {
  organizationId: string;
  tableId: string;
  name?: string;
  area?: string | null;
  seats?: number;
  sortOrder?: number;
  status?: RestaurantTableStatus;
  userId?: string;
}) {
  if (input.status) {
    return updateRestaurantTableStatus({
      organizationId: input.organizationId,
      tableId: input.tableId,
      userId: input.userId ?? input.organizationId,
      status: input.status,
    });
  }

  return updateTable({
    organizationId: input.organizationId,
    tableId: input.tableId,
    userId: input.userId ?? input.organizationId,
    name: input.name,
    area: input.area,
    seats: input.seats,
    sortOrder: input.sortOrder,
  });
}

export async function deleteRestaurantTable(
  organizationId: string,
  tableId: string
) {
  return deleteTable({
    organizationId,
    tableId,
  });
}
