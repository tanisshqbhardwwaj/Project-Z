import type {
  ContractBillingCycle,
  ContractStatus,
  ContractVisitStatus,
} from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import {
  cancelServiceContract,
  createServiceContract as createContract,
  generateContractVisits,
  getServiceContract,
  listServiceContracts as listContracts,
  markContractVisitStatus,
  updateServiceContract as updateContract,
} from "./service-contract.service";

export { getServiceContract };

export async function listServiceContracts(input: {
  organizationId: string;
  customerId?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listContracts({
    organizationId: input.organizationId,
    customerId: input.customerId,
    status: input.status as ContractStatus | undefined,
  });
  const startIdx = input.cursor
    ? Math.max(0, rows.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(rows.slice(startIdx, startIdx + limit + 1), limit);
}

export async function createServiceContract(input: {
  organizationId: string;
  userId: string;
  customerId: string;
  name: string;
  serviceIds: string[];
  startDate: string | Date;
  endDate: string | Date;
  billingCycle?: ContractBillingCycle;
  amountRupees: number;
  visitsIncluded?: number | null;
  nextServiceDate?: string | Date | null;
  reminderDaysBefore?: number;
}) {
  return createContract({
    organizationId: input.organizationId,
    createdById: input.userId,
    customerId: input.customerId,
    name: input.name,
    serviceIds: input.serviceIds,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    billingCycle: input.billingCycle,
    amountRupees: input.amountRupees,
    visitsIncluded: input.visitsIncluded,
    nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : null,
    reminderDaysBefore: input.reminderDaysBefore,
  });
}

export async function updateServiceContract(input: {
  organizationId: string;
  userId: string;
  contractId: string;
  name?: string;
  serviceIds?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  billingCycle?: ContractBillingCycle;
  amountRupees?: number;
  visitsIncluded?: number | null;
  nextServiceDate?: string | Date | null;
  reminderDaysBefore?: number;
  status?: ContractStatus;
}) {
  return updateContract({
    organizationId: input.organizationId,
    contractId: input.contractId,
    userId: input.userId,
    name: input.name,
    serviceIds: input.serviceIds,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    billingCycle: input.billingCycle,
    amountRupees: input.amountRupees,
    visitsIncluded: input.visitsIncluded,
    nextServiceDate:
      input.nextServiceDate !== undefined
        ? input.nextServiceDate
          ? new Date(input.nextServiceDate)
          : null
        : undefined,
    reminderDaysBefore: input.reminderDaysBefore,
    status: input.status,
  });
}

export async function deleteServiceContract(
  organizationId: string,
  userId: string,
  contractId: string
) {
  return cancelServiceContract({
    organizationId,
    contractId,
    userId,
  });
}

export async function listContractVisits(input: {
  organizationId: string;
  contractId: string;
  status?: string;
  from?: Date;
  to?: Date;
}) {
  await requireModule(input.organizationId, "service_contracts");

  return prisma.serviceContractVisit.findMany({
    where: {
      organizationId: input.organizationId,
      contractId: input.contractId,
      ...(input.status && { status: input.status as ContractVisitStatus }),
      ...(input.from || input.to
        ? {
            dueDate: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }
        : {}),
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function scheduleContractVisit(input: {
  organizationId: string;
  userId: string;
  contractId: string;
  dueDate?: string | Date;
  count?: number;
}) {
  const visits = await generateContractVisits({
    organizationId: input.organizationId,
    contractId: input.contractId,
    userId: input.userId,
    fromDate: input.dueDate ? new Date(input.dueDate) : undefined,
    count: input.count ?? 1,
  });
  return visits[0] ?? null;
}

export { markContractVisitStatus };
