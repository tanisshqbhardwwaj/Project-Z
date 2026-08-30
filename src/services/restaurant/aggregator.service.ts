import { prisma } from "@/lib/db/prisma";
import type {
  AggregatorPayoutStatus,
  Prisma,
  SalesChannel,
} from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { parseOrgSettings } from "@/lib/org/require-module";
import { createAuditLog } from "../audit.service";
import { openRestaurantOrder, type RestaurantOrderLine } from "./restaurant-order.service";

export type AggregatorChannelConfig = {
  enabled: boolean;
  commissionPercent?: number;
  merchantId?: string;
  storeId?: string;
  autoAccept?: boolean;
};

export type AggregatorSettings = Partial<
  Record<SalesChannel, AggregatorChannelConfig>
>;

const AGGREGATOR_CHANNELS: SalesChannel[] = [
  "SWIGGY",
  "ZOMATO",
  "OTHER_AGGREGATOR",
];

function readAggregatorSettings(settings: unknown): AggregatorSettings {
  const parsed = parseOrgSettings(settings) as Record<string, unknown>;
  const raw = parsed.aggregatorChannels;
  if (!raw || typeof raw !== "object") return {};
  return raw as AggregatorSettings;
}

export async function getAggregatorChannelConfig(organizationId: string) {
  await requireModule(organizationId, "shop_sales");

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organization not found");

  const config = readAggregatorSettings(org.settings);
  return AGGREGATOR_CHANNELS.map((channel) => ({
    channel,
    ...(config[channel] ?? { enabled: false }),
  }));
}

export async function updateAggregatorChannelConfig(input: {
  organizationId: string;
  userId: string;
  channel: SalesChannel;
  config: AggregatorChannelConfig;
}) {
  await requireModule(input.organizationId, "shop_sales");

  if (!AGGREGATOR_CHANNELS.includes(input.channel)) {
    throw new Error("Channel is not an aggregator channel");
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organization not found");

  const base = parseOrgSettings(org.settings) as Record<string, unknown>;
  const current = readAggregatorSettings(org.settings);
  const next: AggregatorSettings = {
    ...current,
    [input.channel]: {
      enabled: input.config.enabled,
      commissionPercent: input.config.commissionPercent,
      merchantId: input.config.merchantId?.trim() || undefined,
      storeId: input.config.storeId?.trim() || undefined,
      autoAccept: input.config.autoAccept,
    },
  };

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      settings: {
        ...base,
        aggregatorChannels: next,
      } as Prisma.InputJsonValue,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "aggregator.channel.updated",
    entityType: "Organization",
    entityId: input.organizationId,
    after: { channel: input.channel, config: next[input.channel] },
  });

  return next[input.channel];
}

export async function createAggregatorPayout(input: {
  organizationId: string;
  createdById: string;
  channel: SalesChannel;
  periodStart: Date;
  periodEnd: Date;
  grossRupees: number;
  commissionRupees?: number;
  taxesRupees?: number;
  netPayoutRupees?: number;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_sales");

  const grossPaise = rupeesToPaise(input.grossRupees);
  const commissionPaise = rupeesToPaise(input.commissionRupees ?? 0);
  const taxesPaise = rupeesToPaise(input.taxesRupees ?? 0);
  const netPayoutPaise =
    input.netPayoutRupees != null
      ? rupeesToPaise(input.netPayoutRupees)
      : grossPaise - commissionPaise - taxesPaise;

  const payout = await prisma.aggregatorPayout.create({
    data: {
      organizationId: input.organizationId,
      channel: input.channel,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      grossPaise,
      commissionPaise,
      taxesPaise,
      netPayoutPaise,
      status: "PENDING",
      notes: input.notes?.trim() || null,
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "aggregator.payout.created",
    entityType: "AggregatorPayout",
    entityId: payout.id,
    after: payout,
  });

  return payout;
}

export async function reconcileAggregatorPayout(input: {
  organizationId: string;
  payoutId: string;
  userId: string;
}) {
  await requireModule(input.organizationId, "shop_sales");

  const payout = await prisma.aggregatorPayout.findFirst({
    where: { id: input.payoutId, organizationId: input.organizationId },
  });
  if (!payout) throw new Error("Payout not found");

  const sales = await prisma.shopSale.findMany({
    where: {
      organizationId: input.organizationId,
      channel: payout.channel,
      createdAt: { gte: payout.periodStart, lte: payout.periodEnd },
    },
    select: {
      totalPaise: true,
      channelCommissionPaise: true,
      channelPayoutPaise: true,
    },
  });

  const salesGrossPaise = sales.reduce((sum, row) => sum + row.totalPaise, BigInt(0));
  const salesCommissionPaise = sales.reduce(
    (sum, row) => sum + (row.channelCommissionPaise ?? BigInt(0)),
    BigInt(0)
  );
  const salesNetPaise = sales.reduce(
    (sum, row) =>
      sum +
      (row.channelPayoutPaise ??
        row.totalPaise - (row.channelCommissionPaise ?? BigInt(0))),
    BigInt(0)
  );

  const grossDiff = payout.grossPaise - salesGrossPaise;
  const netDiff = payout.netPayoutPaise - salesNetPaise;
  const commissionDiff = payout.commissionPaise - salesCommissionPaise;
  const matched =
    grossDiff === BigInt(0) && netDiff === BigInt(0) && commissionDiff === BigInt(0);

  const status: AggregatorPayoutStatus = matched ? "MATCHED" : "DISCREPANCY";

  const updated = await prisma.aggregatorPayout.update({
    where: { id: payout.id },
    data: {
      status,
      notes: matched
        ? payout.notes
        : [
            payout.notes,
            `Reconcile: gross diff ${Number(grossDiff) / 100} INR, net diff ${Number(netDiff) / 100} INR`,
          ]
            .filter(Boolean)
            .join(" | "),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "aggregator.payout.reconciled",
    entityType: "AggregatorPayout",
    entityId: updated.id,
    after: {
      status,
      salesCount: sales.length,
      salesGrossPaise: salesGrossPaise.toString(),
      salesNetPaise: salesNetPaise.toString(),
    },
  });

  return {
    payout: updated,
    matched,
    salesCount: sales.length,
    salesGrossPaise: salesGrossPaise.toString(),
    salesCommissionPaise: salesCommissionPaise.toString(),
    salesNetPaise: salesNetPaise.toString(),
    grossDiffPaise: grossDiff.toString(),
    netDiffPaise: netDiff.toString(),
  };
}

export async function listAggregatorPayouts(input: {
  organizationId: string;
  channel?: SalesChannel;
  status?: AggregatorPayoutStatus;
  limit?: number;
}) {
  await requireModule(input.organizationId, "shop_sales");

  return prisma.aggregatorPayout.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.channel && { channel: input.channel }),
      ...(input.status && { status: input.status }),
    },
    orderBy: { periodStart: "desc" },
    take: input.limit ?? 100,
  });
}

export async function ingestAggregatorOrder(input: {
  organizationId: string;
  branchId: string;
  createdById: string;
  channel: SalesChannel;
  channelOrderId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  items: Array<Omit<RestaurantOrderLine, "lineId" | "firedQty">>;
  channelCommissionRupees?: number;
  notes?: string | null;
  fireKot?: boolean;
}) {
  await requireModule(input.organizationId, "shop_sales");

  if (!AGGREGATOR_CHANNELS.includes(input.channel)) {
    throw new Error("Channel is not an aggregator channel");
  }

  const duplicate = await prisma.restaurantOrder.findFirst({
    where: {
      organizationId: input.organizationId,
      channel: input.channel,
      channelOrderId: input.channelOrderId,
      status: { not: "CANCELLED" },
    },
  });
  if (duplicate) return duplicate;

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  const channelConfig = readAggregatorSettings(org?.settings)[input.channel];
  const commissionPercent = channelConfig?.commissionPercent ?? 0;
  const orderTotalRupees = input.items.reduce(
    (sum, line) => sum + line.priceRupees * line.qty,
    0
  );
  const computedCommission =
    input.channelCommissionRupees ??
    (commissionPercent > 0 ? (orderTotalRupees * commissionPercent) / 100 : 0);

  const order = await openRestaurantOrder({
    organizationId: input.organizationId,
    branchId: input.branchId,
    createdById: input.createdById,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    orderType: "DELIVERY",
    deliveryAddress: input.deliveryAddress,
    channel: input.channel,
    channelOrderId: input.channelOrderId,
    notes: input.notes,
    items: input.items.map((item) => ({
      ...item,
      lineId: crypto.randomUUID(),
      firedQty: 0,
    })),
  });

  const updated = await prisma.restaurantOrder.update({
    where: { id: order.id },
    data: {
      channelCommissionPaise: rupeesToPaise(computedCommission),
    },
  });

  if (input.fireKot !== false) {
    const { fireRestaurantKot } = await import("./restaurant-order.service");
    await fireRestaurantKot({
      organizationId: input.organizationId,
      orderId: updated.id,
      userId: input.createdById,
    }).catch(() => null);
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "aggregator.order.ingested",
    entityType: "RestaurantOrder",
    entityId: updated.id,
    after: updated,
  });

  return updated;
}
