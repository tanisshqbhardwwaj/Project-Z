import { prisma } from "@/lib/db/prisma";
import type {
  Prisma,
  RestaurantOrderStatus,
  SalesChannel,
  ShopOrderType,
} from "@prisma/client";
import { requireModule } from "@/lib/org/require-module";
import { buildKotPayload } from "@/lib/shop/invoices/kot";
import { createAuditLog } from "../shared/audit.service";
import { createShopSale, type ShopSaleItem } from "../shop/shop.service";

export type RestaurantOrderLine = {
  lineId: string;
  name: string;
  qty: number;
  priceRupees: number;
  inventoryItemId?: string;
  productId?: string;
  size?: string;
  variantLabel?: string;
  unit?: string;
  itemKind?: string;
  notes?: string;
  firedQty?: number;
};

function newLineId(): string {
  return crypto.randomUUID();
}

function parseOrderLines(raw: unknown): RestaurantOrderLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const o = row as Record<string, unknown>;
      return {
        lineId: typeof o.lineId === "string" ? o.lineId : newLineId(),
        name: String(o.name ?? ""),
        qty: Number(o.qty ?? 1),
        priceRupees: Number(o.priceRupees ?? 0),
        inventoryItemId:
          typeof o.inventoryItemId === "string" ? o.inventoryItemId : undefined,
        productId: typeof o.productId === "string" ? o.productId : undefined,
        size: typeof o.size === "string" ? o.size : undefined,
        variantLabel:
          typeof o.variantLabel === "string" ? o.variantLabel : undefined,
        unit: typeof o.unit === "string" ? o.unit : undefined,
        itemKind: typeof o.itemKind === "string" ? o.itemKind : undefined,
        notes: typeof o.notes === "string" ? o.notes : undefined,
        firedQty: Number(o.firedQty ?? 0),
      };
    })
    .filter((line) => line.name.length > 0 && line.qty > 0);
}

function serializeOrderLines(lines: RestaurantOrderLine[]): Prisma.InputJsonValue {
  return lines as unknown as Prisma.InputJsonValue;
}

export async function listRestaurantOrders(input: {
  organizationId: string;
  branchId: string;
  status?: RestaurantOrderStatus | RestaurantOrderStatus[];
  tableId?: string;
  limit?: number;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const statuses = input.status
    ? Array.isArray(input.status)
      ? input.status
      : [input.status]
    : undefined;

  return prisma.restaurantOrder.findMany({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      ...(statuses && { status: { in: statuses } }),
      ...(input.tableId && { tableId: input.tableId }),
    },
    include: {
      table: { select: { id: true, name: true, area: true } },
      waiter: { select: { id: true, name: true } },
      kots: { orderBy: { roundNumber: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 100,
  });
}

export async function getRestaurantOrder(organizationId: string, orderId: string) {
  await requireModule(organizationId, "restaurant_tables");

  const row = await prisma.restaurantOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      table: true,
      waiter: { select: { id: true, name: true } },
      kots: { orderBy: { roundNumber: "asc" } },
      sale: { select: { id: true, billNumber: true, totalPaise: true } },
    },
  });
  if (!row) throw new Error("Order not found");
  return row;
}

export async function openRestaurantOrder(input: {
  organizationId: string;
  branchId: string;
  createdById: string;
  tableId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  waiterId?: string | null;
  orderType?: ShopOrderType;
  deliveryAddress?: string | null;
  channel?: SalesChannel;
  channelOrderId?: string | null;
  notes?: string | null;
  items?: RestaurantOrderLine[];
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  if (input.tableId) {
    const table = await prisma.restaurantTable.findFirst({
      where: {
        id: input.tableId,
        organizationId: input.organizationId,
        branchId: input.branchId,
      },
    });
    if (!table) throw new Error("Table not found");

    const existingOpen = await prisma.restaurantOrder.findFirst({
      where: {
        organizationId: input.organizationId,
        tableId: input.tableId,
        status: "OPEN",
      },
    });
    if (existingOpen) throw new Error("Table already has an open order");

    await prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    });
  }

  const order = await prisma.restaurantOrder.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      tableId: input.tableId ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      waiterId: input.waiterId ?? null,
      orderType: input.orderType ?? "DINE_IN",
      deliveryAddress: input.deliveryAddress?.trim() || null,
      channel: input.channel ?? "DIRECT",
      channelOrderId: input.channelOrderId ?? null,
      notes: input.notes?.trim() || null,
      itemsJson: serializeOrderLines(input.items ?? []),
      status: "OPEN",
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "restaurant.order.opened",
    entityType: "RestaurantOrder",
    entityId: order.id,
    after: order,
  });

  return order;
}

export async function addRestaurantOrderItems(input: {
  organizationId: string;
  orderId: string;
  userId: string;
  items: Array<Omit<RestaurantOrderLine, "lineId" | "firedQty"> & { lineId?: string }>;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const order = await prisma.restaurantOrder.findFirst({
    where: { id: input.orderId, organizationId: input.organizationId },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "OPEN") throw new Error("Only open orders can be edited");

  if (input.items.length === 0) throw new Error("Add at least one item");

  const existing = parseOrderLines(order.itemsJson);
  const appended = input.items.map((item) => ({
    lineId: item.lineId ?? newLineId(),
    name: item.name,
    qty: item.qty,
    priceRupees: item.priceRupees,
    inventoryItemId: item.inventoryItemId,
    productId: item.productId,
    size: item.size,
    variantLabel: item.variantLabel,
    unit: item.unit,
    itemKind: item.itemKind,
    notes: item.notes,
    firedQty: 0,
  }));

  const updated = await prisma.restaurantOrder.update({
    where: { id: order.id },
    data: {
      itemsJson: serializeOrderLines([...existing, ...appended]),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.order.items_added",
    entityType: "RestaurantOrder",
    entityId: updated.id,
    after: { addedCount: appended.length },
  });

  return updated;
}

export async function fireRestaurantKot(input: {
  organizationId: string;
  orderId: string;
  userId: string;
  lineIds?: string[];
}) {
  await requireModule(input.organizationId, "restaurant_kitchen");

  const order = await getRestaurantOrder(input.organizationId, input.orderId);
  if (order.status !== "OPEN" && order.status !== "BILLED") {
    throw new Error("Cannot fire KOT for a closed order");
  }

  const lines = parseOrderLines(order.itemsJson);
  const targets = lines.filter((line) => {
    const pending = line.qty - (line.firedQty ?? 0);
    if (pending <= 0) return false;
    if (input.lineIds?.length) return input.lineIds.includes(line.lineId);
    return true;
  });

  if (targets.length === 0) throw new Error("No pending items to fire");

  const kotLines = targets.map((line) => ({
    name: line.name,
    qty: line.qty - (line.firedQty ?? 0),
    size: line.size,
    variantLabel: line.variantLabel,
    unit: line.unit,
    itemKind: line.itemKind as import("@/lib/shop/branch/sector-mode").ShopItemKind | undefined,
  }));

  const roundNumber =
    (order.kots.reduce((max, kot) => Math.max(max, kot.roundNumber), 0) || 0) + 1;

  const kotPayload = buildKotPayload({
    ticketNo: roundNumber,
    billNumber: order.sale?.billNumber ?? null,
    customerName: order.customerName,
    lines: kotLines,
  });

  const kot = await prisma.restaurantKot.create({
    data: {
      organizationId: input.organizationId,
      orderId: order.id,
      roundNumber,
      status: "NEW",
      itemsJson: kotLines as unknown as Prisma.InputJsonValue,
      kotJson: kotPayload as unknown as Prisma.InputJsonValue,
    },
  });

  const updatedLines = lines.map((line) => {
    const target = targets.find((t) => t.lineId === line.lineId);
    if (!target) return line;
    return { ...line, firedQty: line.qty };
  });

  await prisma.restaurantOrder.update({
    where: { id: order.id },
    data: { itemsJson: serializeOrderLines(updatedLines) },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.kot.fired",
    entityType: "RestaurantKot",
    entityId: kot.id,
    after: kot,
  });

  return kot;
}

export async function settleRestaurantOrder(input: {
  organizationId: string;
  orderId: string;
  branchId: string;
  createdById: string;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "BANK" | "OTHER" | "CREDIT";
  paidRupees?: number;
  issueInvoice?: boolean;
  discountRupees?: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const order = await getRestaurantOrder(input.organizationId, input.orderId);
  if (order.status === "SETTLED" || order.status === "CANCELLED") {
    throw new Error("Order is already closed");
  }

  const lines = parseOrderLines(order.itemsJson);
  if (lines.length === 0) throw new Error("Order has no items");

  const saleItems: ShopSaleItem[] = lines.map((line) => ({
    name: line.name,
    qty: line.qty,
    priceRupees: line.priceRupees,
    inventoryItemId: line.inventoryItemId,
    productId: line.productId,
    size: line.size,
    variantLabel: line.variantLabel,
    unit: line.unit,
    itemKind: line.itemKind as ShopSaleItem["itemKind"],
    staffId: order.waiterId ?? undefined,
  }));

  const totalRupees = saleItems.reduce(
    (sum, line) => sum + line.priceRupees * line.qty,
    0
  );

  const sale = await createShopSale({
    organizationId: input.organizationId,
    branchId: input.branchId,
    createdById: input.createdById,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    staffId: order.waiterId,
    items: saleItems,
    totalRupees,
    paidRupees: input.paidRupees ?? totalRupees,
    discountRupees: input.discountRupees,
    paymentMethod: input.paymentMethod ?? "CASH",
    issueInvoice: input.issueInvoice ?? true,
    notes: input.notes ?? order.notes,
  });

  await prisma.shopSale.update({
    where: { id: sale.id },
    data: {
      restaurantOrderId: order.id,
      tableId: order.tableId,
      orderType: order.orderType,
      deliveryAddress: order.deliveryAddress,
      channel: order.channel,
      channelOrderId: order.channelOrderId,
      channelCommissionPaise: order.channelCommissionPaise,
    },
  });

  const updatedOrder = await prisma.restaurantOrder.update({
    where: { id: order.id },
    data: { status: "SETTLED" },
  });

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "restaurant.order.settled",
    entityType: "RestaurantOrder",
    entityId: updatedOrder.id,
    after: { saleId: sale.id },
  });

  return { order: updatedOrder, sale };
}

export async function cancelRestaurantOrder(input: {
  organizationId: string;
  orderId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const order = await prisma.restaurantOrder.findFirst({
    where: { id: input.orderId, organizationId: input.organizationId },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === "SETTLED") throw new Error("Settled orders cannot be cancelled");

  const updated = await prisma.restaurantOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  if (order.tableId) {
    const openOnTable = await prisma.restaurantOrder.count({
      where: {
        organizationId: input.organizationId,
        tableId: order.tableId,
        status: { in: ["OPEN", "BILLED"] },
        NOT: { id: order.id },
      },
    });
    if (openOnTable === 0) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "FREE" },
      });
    }
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.order.cancelled",
    entityType: "RestaurantOrder",
    entityId: updated.id,
    before: order,
    after: updated,
  });

  return updated;
}

export async function updateRestaurantOrder(input: {
  organizationId: string;
  orderId: string;
  userId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  waiterId?: string | null;
  notes?: string | null;
  status?: RestaurantOrderStatus;
  items?: RestaurantOrderLine[];
}) {
  await requireModule(input.organizationId, "restaurant_tables");

  const existing = await prisma.restaurantOrder.findFirst({
    where: { id: input.orderId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Order not found");
  if (existing.status === "SETTLED" || existing.status === "CANCELLED") {
    throw new Error("Closed orders cannot be edited");
  }

  const updated = await prisma.restaurantOrder.update({
    where: { id: existing.id },
    data: {
      ...(input.customerName !== undefined && {
        customerName: input.customerName?.trim() || null,
      }),
      ...(input.customerPhone !== undefined && {
        customerPhone: input.customerPhone?.trim() || null,
      }),
      ...(input.waiterId !== undefined && { waiterId: input.waiterId }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.status && { status: input.status }),
      ...(input.items && { itemsJson: serializeOrderLines(input.items) }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "restaurant.order.updated",
    entityType: "RestaurantOrder",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function deleteRestaurantOrder(
  organizationId: string,
  userId: string,
  orderId: string
) {
  return cancelRestaurantOrder({
    organizationId,
    orderId,
    userId,
  });
}

export async function createRestaurantOrder(input: {
  organizationId: string;
  branchId: string;
  userId: string;
  tableId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  waiterId?: string | null;
  orderType?: ShopOrderType;
  deliveryAddress?: string | null;
  channel?: SalesChannel;
  channelOrderId?: string | null;
  notes?: string | null;
  items?: RestaurantOrderLine[];
}) {
  return openRestaurantOrder({
    organizationId: input.organizationId,
    branchId: input.branchId,
    createdById: input.userId,
    tableId: input.tableId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    waiterId: input.waiterId,
    orderType: input.orderType,
    deliveryAddress: input.deliveryAddress,
    channel: input.channel,
    channelOrderId: input.channelOrderId,
    notes: input.notes,
    items: input.items,
  });
}
