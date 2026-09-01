import { prisma } from "@/lib/db/prisma";
import type {
  ContractBillingCycle,
  ContractStatus,
  ContractVisitStatus,
  Prisma,
} from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { addDaysToDayKey, dayKeyToUtcDate, utcDateToDayKey } from "@/lib/date/org-day";
import { createAuditLog } from "../shared/audit.service";

function billingCycleMonths(cycle: ContractBillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return 1;
    case "QUARTERLY":
      return 3;
    case "HALF_YEARLY":
      return 6;
    case "YEARLY":
      return 12;
    default:
      return 12;
  }
}

function parseServiceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

export async function listServiceContracts(input: {
  organizationId: string;
  customerId?: string;
  status?: ContractStatus;
}) {
  await requireModule(input.organizationId, "service_contracts");

  return prisma.serviceContract.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.customerId && { customerId: input.customerId }),
      ...(input.status && { status: input.status }),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      _count: { select: { visits: true } },
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });
}

export async function getServiceContract(organizationId: string, contractId: string) {
  await requireModule(organizationId, "service_contracts");

  const row = await prisma.serviceContract.findFirst({
    where: { id: contractId, organizationId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      visits: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!row) throw new Error("Contract not found");
  return row;
}

export async function createServiceContract(input: {
  organizationId: string;
  createdById: string;
  customerId: string;
  name: string;
  serviceIds: string[];
  startDate: Date;
  endDate: Date;
  billingCycle?: ContractBillingCycle;
  amountRupees: number;
  visitsIncluded?: number | null;
  nextServiceDate?: Date | null;
  reminderDaysBefore?: number;
}) {
  await requireModule(input.organizationId, "service_contracts");

  if (input.endDate <= input.startDate) {
    throw new Error("End date must be after start date");
  }
  if (input.serviceIds.length === 0) throw new Error("Select at least one service");

  const customer = await prisma.shopCustomer.findFirst({
    where: { id: input.customerId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!customer) throw new Error("Customer not found");

  const contract = await prisma.serviceContract.create({
    data: {
      organizationId: input.organizationId,
      customerId: input.customerId,
      name: input.name.trim(),
      serviceIdsJson: input.serviceIds as Prisma.InputJsonValue,
      startDate: input.startDate,
      endDate: input.endDate,
      billingCycle: input.billingCycle ?? "YEARLY",
      amountPaise: rupeesToPaise(input.amountRupees),
      visitsIncluded: input.visitsIncluded ?? null,
      nextServiceDate: input.nextServiceDate ?? input.startDate,
      reminderDaysBefore: input.reminderDaysBefore ?? 7,
      status: "ACTIVE",
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.contract.created",
    entityType: "ServiceContract",
    entityId: contract.id,
    after: contract,
  });

  return contract;
}

export async function updateServiceContract(input: {
  organizationId: string;
  contractId: string;
  userId: string;
  name?: string;
  serviceIds?: string[];
  startDate?: Date;
  endDate?: Date;
  billingCycle?: ContractBillingCycle;
  amountRupees?: number;
  visitsIncluded?: number | null;
  nextServiceDate?: Date | null;
  reminderDaysBefore?: number;
  status?: ContractStatus;
}) {
  await requireModule(input.organizationId, "service_contracts");

  const existing = await prisma.serviceContract.findFirst({
    where: { id: input.contractId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Contract not found");

  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate <= startDate) throw new Error("End date must be after start date");

  const contract = await prisma.serviceContract.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.serviceIds && { serviceIdsJson: input.serviceIds as Prisma.InputJsonValue }),
      ...(input.startDate && { startDate: input.startDate }),
      ...(input.endDate && { endDate: input.endDate }),
      ...(input.billingCycle && { billingCycle: input.billingCycle }),
      ...(input.amountRupees !== undefined && {
        amountPaise: rupeesToPaise(input.amountRupees),
      }),
      ...(input.visitsIncluded !== undefined && { visitsIncluded: input.visitsIncluded }),
      ...(input.nextServiceDate !== undefined && {
        nextServiceDate: input.nextServiceDate,
      }),
      ...(input.reminderDaysBefore !== undefined && {
        reminderDaysBefore: input.reminderDaysBefore,
      }),
      ...(input.status && { status: input.status }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.contract.updated",
    entityType: "ServiceContract",
    entityId: contract.id,
    before: existing,
    after: contract,
  });

  return contract;
}

export async function cancelServiceContract(input: {
  organizationId: string;
  contractId: string;
  userId: string;
}) {
  return updateServiceContract({
    organizationId: input.organizationId,
    contractId: input.contractId,
    userId: input.userId,
    status: "CANCELLED",
  });
}

export async function generateContractVisits(input: {
  organizationId: string;
  contractId: string;
  userId: string;
  fromDate?: Date;
  count?: number;
}) {
  await requireModule(input.organizationId, "service_contracts");

  const contract = await getServiceContract(input.organizationId, input.contractId);
  if (contract.status !== "ACTIVE") throw new Error("Contract is not active");

  const visitsToCreate = input.count ?? contract.visitsIncluded ?? 4;
  const startFrom = input.fromDate ?? contract.nextServiceDate ?? contract.startDate;
  const monthsStep = billingCycleMonths(contract.billingCycle);

  const existingDueKeys = new Set(
    contract.visits.map((v) => utcDateToDayKey(v.dueDate))
  );

  const created = [];
  let cursor = utcDateToDayKey(startFrom);

  for (let i = 0; i < visitsToCreate; i++) {
    if (dayKeyToUtcDate(cursor) > contract.endDate) break;
    if (!existingDueKeys.has(cursor)) {
      const visit = await prisma.serviceContractVisit.create({
        data: {
          organizationId: input.organizationId,
          contractId: contract.id,
          dueDate: dayKeyToUtcDate(cursor),
          status: "SCHEDULED" as ContractVisitStatus,
        },
      });
      created.push(visit);
      existingDueKeys.add(cursor);
    }
    const [y, m, d] = cursor.split("-").map(Number);
    const nextMonth = m + monthsStep;
    const nextYear = y + Math.floor((nextMonth - 1) / 12);
    const normalizedMonth = ((nextMonth - 1) % 12) + 1;
    cursor = `${nextYear}-${String(normalizedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const nextVisit = await prisma.serviceContractVisit.findFirst({
    where: {
      organizationId: input.organizationId,
      contractId: contract.id,
      status: "SCHEDULED",
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: "asc" },
  });

  if (nextVisit) {
    await prisma.serviceContract.update({
      where: { id: contract.id },
      data: { nextServiceDate: nextVisit.dueDate },
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.contract.visits_generated",
    entityType: "ServiceContract",
    entityId: contract.id,
    after: { createdCount: created.length },
  });

  return created;
}

export async function listContractsDueForRenewal(input: {
  organizationId: string;
  withinDays?: number;
  asOf?: Date;
}) {
  await requireModule(input.organizationId, "service_contracts");

  const asOf = input.asOf ?? new Date();
  const withinDays = input.withinDays ?? 30;
  const horizon = addDaysToDayKey(utcDateToDayKey(asOf), withinDays);
  const horizonDate = dayKeyToUtcDate(horizon);

  const contracts = await prisma.serviceContract.findMany({
    where: {
      organizationId: input.organizationId,
      status: "ACTIVE",
      endDate: { lte: horizonDate, gte: asOf },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { endDate: "asc" },
  });

  return contracts.map((contract) => {
    const daysUntilEnd = Math.ceil(
      (contract.endDate.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...contract,
      serviceIds: parseServiceIds(contract.serviceIdsJson),
      daysUntilEnd,
      renewalDue: daysUntilEnd <= contract.reminderDaysBefore,
    };
  });
}

export async function detectContractRenewals(input: {
  organizationId: string;
  withinDays?: number;
  asOf?: Date;
}) {
  const rows = await listContractsDueForRenewal(input);
  return rows.filter((row) => row.renewalDue);
}

export async function markContractVisitStatus(input: {
  organizationId: string;
  visitId: string;
  userId: string;
  status: ContractVisitStatus;
  appointmentId?: string | null;
}) {
  await requireModule(input.organizationId, "service_contracts");

  const visit = await prisma.serviceContractVisit.findFirst({
    where: { id: input.visitId, organizationId: input.organizationId },
  });
  if (!visit) throw new Error("Visit not found");

  const updated = await prisma.serviceContractVisit.update({
    where: { id: visit.id },
    data: {
      status: input.status,
      ...(input.appointmentId !== undefined && { appointmentId: input.appointmentId }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.contract.visit_updated",
    entityType: "ServiceContractVisit",
    entityId: updated.id,
    after: updated,
  });

  return updated;
}
