export {
  getAggregatorChannelConfig as getSalesChannelSettings,
  listAggregatorPayouts,
  createAggregatorPayout,
  reconcileAggregatorPayout,
} from "@/services/restaurant/aggregator.service";

import { prisma } from "@/lib/db/prisma";
import type {
  AggregatorChannelConfig,
} from "@/services/restaurant/aggregator.service";
import {
  getAggregatorChannelConfig,
  updateAggregatorChannelConfig,
} from "@/services/restaurant/aggregator.service";
import type { AggregatorPayoutStatus, SalesChannel } from "@prisma/client";

export async function updateSalesChannelSettings(input: {
  organizationId: string;
  userId: string;
  channels?: Partial<Record<SalesChannel, AggregatorChannelConfig>>;
  channel?: SalesChannel;
  config?: AggregatorChannelConfig;
}) {
  if (input.channel && input.config) {
    await updateAggregatorChannelConfig({
      organizationId: input.organizationId,
      userId: input.userId,
      channel: input.channel,
      config: input.config,
    });
  }
  if (input.channels) {
    for (const [channel, config] of Object.entries(input.channels)) {
      if (!config) continue;
      await updateAggregatorChannelConfig({
        organizationId: input.organizationId,
        userId: input.userId,
        channel: channel as SalesChannel,
        config,
      });
    }
  }
  return getAggregatorChannelConfig(input.organizationId);
}

export async function getAggregatorPayout(input: {
  organizationId: string;
  payoutId: string;
}) {
  const row = await prisma.aggregatorPayout.findFirst({
    where: { id: input.payoutId, organizationId: input.organizationId },
  });
  if (!row) throw new Error("Payout not found");
  return row;
}

export async function updateAggregatorPayout(input: {
  organizationId: string;
  payoutId: string;
  userId: string;
  status?: AggregatorPayoutStatus;
  notes?: string | null;
  grossPaise?: bigint;
  commissionPaise?: bigint;
  taxesPaise?: bigint;
  netPayoutPaise?: bigint;
}) {
  const existing = await getAggregatorPayout({
    organizationId: input.organizationId,
    payoutId: input.payoutId,
  });
  return prisma.aggregatorPayout.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      notes: input.notes,
      grossPaise: input.grossPaise,
      commissionPaise: input.commissionPaise,
      taxesPaise: input.taxesPaise,
      netPayoutPaise: input.netPayoutPaise,
    },
  });
}

export async function deleteAggregatorPayout(input: {
  organizationId: string;
  payoutId: string;
}) {
  await getAggregatorPayout(input);
  await prisma.aggregatorPayout.delete({ where: { id: input.payoutId } });
}

export type { SalesChannel };
