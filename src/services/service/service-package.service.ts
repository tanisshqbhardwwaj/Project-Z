import { prisma } from "@/lib/db/prisma";
import type { PackageStatus, Prisma, ServicePackageType } from "@prisma/client";
import { rupeesToPaise } from "@/lib/finance/money";
import { requireModule } from "@/lib/org/require-module";
import { createAuditLog } from "../audit.service";
import { createShopSale } from "../shop.service";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function resolvePackageBalances(input: {
  type: ServicePackageType;
  sessionCount?: number | null;
  prepaidValuePaise?: bigint | null;
}) {
  if (input.type === "SESSION_PACK") {
    return {
      remainingSessions: input.sessionCount ?? 0,
      remainingValuePaise: null as bigint | null,
    };
  }
  if (input.type === "PREPAID_VALUE") {
    return {
      remainingSessions: null as number | null,
      remainingValuePaise: input.prepaidValuePaise ?? BigInt(0),
    };
  }
  return {
    remainingSessions: input.sessionCount ?? null,
    remainingValuePaise: input.prepaidValuePaise ?? null,
  };
}

function derivePackageStatus(input: {
  remainingSessions: number | null;
  remainingValuePaise: bigint | null;
  expiresAt: Date | null;
  now?: Date;
}): PackageStatus {
  const now = input.now ?? new Date();
  if (input.expiresAt && input.expiresAt < now) return "EXPIRED";
  if (input.remainingSessions != null && input.remainingSessions <= 0) {
    return "EXHAUSTED";
  }
  if (input.remainingValuePaise != null && input.remainingValuePaise <= BigInt(0)) {
    return "EXHAUSTED";
  }
  return "ACTIVE";
}

export async function listServicePackages(
  organizationId: string,
  options?: { activeOnly?: boolean }
) {
  await requireModule(organizationId, "service_packages");

  return prisma.servicePackage.findMany({
    where: {
      organizationId,
      ...(options?.activeOnly !== false ? { isActive: true } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getServicePackage(organizationId: string, packageId: string) {
  await requireModule(organizationId, "service_packages");

  const row = await prisma.servicePackage.findFirst({
    where: { id: packageId, organizationId },
    include: {
      _count: { select: { customerPackages: true } },
    },
  });
  if (!row) throw new Error("Package not found");
  return row;
}

export async function createServicePackage(input: {
  organizationId: string;
  createdById: string;
  name: string;
  type: ServicePackageType;
  priceRupees: number;
  sessionCount?: number | null;
  prepaidValueRupees?: number | null;
  validityDays?: number | null;
  includedServiceIds?: string[];
  isActive?: boolean;
}) {
  await requireModule(input.organizationId, "service_packages");

  if (input.type === "SESSION_PACK" && !input.sessionCount) {
    throw new Error("Session count is required for session packs");
  }
  if (input.type === "PREPAID_VALUE" && input.prepaidValueRupees == null) {
    throw new Error("Prepaid value is required for value packs");
  }

  const pkg = await prisma.servicePackage.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      type: input.type,
      pricePaise: rupeesToPaise(input.priceRupees),
      sessionCount: input.sessionCount ?? null,
      prepaidValuePaise:
        input.prepaidValueRupees != null
          ? rupeesToPaise(input.prepaidValueRupees)
          : null,
      validityDays: input.validityDays ?? null,
      includedServiceIdsJson: (input.includedServiceIds ?? []) as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
      createdById: input.createdById,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.package.created",
    entityType: "ServicePackage",
    entityId: pkg.id,
    after: pkg,
  });

  return pkg;
}

export async function updateServicePackage(input: {
  organizationId: string;
  packageId: string;
  userId: string;
  name?: string;
  type?: ServicePackageType;
  priceRupees?: number;
  sessionCount?: number | null;
  prepaidValueRupees?: number | null;
  validityDays?: number | null;
  includedServiceIds?: string[];
  isActive?: boolean;
}) {
  await requireModule(input.organizationId, "service_packages");

  const existing = await prisma.servicePackage.findFirst({
    where: { id: input.packageId, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Package not found");

  const pkg = await prisma.servicePackage.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.priceRupees !== undefined && {
        pricePaise: rupeesToPaise(input.priceRupees),
      }),
      ...(input.sessionCount !== undefined && { sessionCount: input.sessionCount }),
      ...(input.prepaidValueRupees !== undefined && {
        prepaidValuePaise:
          input.prepaidValueRupees != null
            ? rupeesToPaise(input.prepaidValueRupees)
            : null,
      }),
      ...(input.validityDays !== undefined && { validityDays: input.validityDays }),
      ...(input.includedServiceIds !== undefined && {
        includedServiceIdsJson: input.includedServiceIds as Prisma.InputJsonValue,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.package.updated",
    entityType: "ServicePackage",
    entityId: pkg.id,
    before: existing,
    after: pkg,
  });

  return pkg;
}

export async function deactivateServicePackage(input: {
  organizationId: string;
  packageId: string;
  userId: string;
}) {
  return updateServicePackage({
    organizationId: input.organizationId,
    packageId: input.packageId,
    userId: input.userId,
    isActive: false,
  });
}

export async function sellServicePackage(input: {
  organizationId: string;
  packageId: string;
  customerId: string;
  branchId: string;
  createdById: string;
  createSale?: boolean;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "BANK" | "OTHER" | "CREDIT";
  paidRupees?: number;
}) {
  await requireModule(input.organizationId, "service_packages");

  const pkg = await getServicePackage(input.organizationId, input.packageId);
  if (!pkg.isActive) throw new Error("Package is not active");

  const customer = await prisma.shopCustomer.findFirst({
    where: { id: input.customerId, organizationId: input.organizationId },
    select: { id: true, name: true, phone: true },
  });
  if (!customer) throw new Error("Customer not found");

  const purchasedAt = new Date();
  const expiresAt = pkg.validityDays
    ? addDays(purchasedAt, pkg.validityDays)
    : null;
  const balances = resolvePackageBalances({
    type: pkg.type,
    sessionCount: pkg.sessionCount,
    prepaidValuePaise: pkg.prepaidValuePaise,
  });

  let saleId: string | null = null;
  if (input.createSale !== false) {
    const priceRupees = Number(pkg.pricePaise) / 100;
    const sale = await createShopSale({
      organizationId: input.organizationId,
      branchId: input.branchId,
      createdById: input.createdById,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [
        {
          name: pkg.name,
          qty: 1,
          priceRupees,
        },
      ],
      totalRupees: priceRupees,
      paidRupees: input.paidRupees ?? priceRupees,
      paymentMethod: input.paymentMethod ?? "CASH",
      issueInvoice: true,
      notes: `Package purchase: ${pkg.name}`,
    });
    saleId = sale.id;
  }

  const customerPackage = await prisma.customerPackage.create({
    data: {
      organizationId: input.organizationId,
      customerId: customer.id,
      packageId: pkg.id,
      saleId,
      purchasedAt,
      expiresAt,
      remainingSessions: balances.remainingSessions,
      remainingValuePaise: balances.remainingValuePaise,
      status: "ACTIVE",
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.createdById,
    action: "service.package.sold",
    entityType: "CustomerPackage",
    entityId: customerPackage.id,
    after: customerPackage,
  });

  return { customerPackage, saleId };
}

export async function listCustomerPackages(input: {
  organizationId: string;
  customerId?: string;
  status?: PackageStatus;
}) {
  await requireModule(input.organizationId, "service_packages");

  return prisma.customerPackage.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.customerId && { customerId: input.customerId }),
      ...(input.status && { status: input.status }),
    },
    include: {
      package: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });
}

export async function redeemCustomerPackage(input: {
  organizationId: string;
  customerPackageId: string;
  userId: string;
  sessionsUsed?: number;
  valueUsedRupees?: number;
}) {
  await requireModule(input.organizationId, "service_packages");

  const row = await prisma.customerPackage.findFirst({
    where: { id: input.customerPackageId, organizationId: input.organizationId },
    include: { package: true },
  });
  if (!row) throw new Error("Customer package not found");
  if (row.status !== "ACTIVE") throw new Error("Package is not active");

  const now = new Date();
  if (row.expiresAt && row.expiresAt < now) {
    await prisma.customerPackage.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Package has expired");
  }

  let remainingSessions = row.remainingSessions;
  let remainingValuePaise = row.remainingValuePaise;

  if (row.package.type === "SESSION_PACK" || row.remainingSessions != null) {
    const used = input.sessionsUsed ?? 1;
    if (remainingSessions == null || remainingSessions < used) {
      throw new Error("Not enough sessions remaining");
    }
    remainingSessions -= used;
  } else if (row.package.type === "PREPAID_VALUE" || remainingValuePaise != null) {
    const usedPaise =
      input.valueUsedRupees != null
        ? rupeesToPaise(input.valueUsedRupees)
        : BigInt(0);
    if (usedPaise <= BigInt(0)) {
      throw new Error("Value used must be greater than zero");
    }
    if (remainingValuePaise == null || remainingValuePaise < usedPaise) {
      throw new Error("Not enough prepaid value remaining");
    }
    remainingValuePaise -= usedPaise;
  } else {
    throw new Error("Package has nothing left to redeem");
  }

  const status = derivePackageStatus({
    remainingSessions,
    remainingValuePaise,
    expiresAt: row.expiresAt,
    now,
  });

  const updated = await prisma.customerPackage.update({
    where: { id: row.id },
    data: {
      remainingSessions,
      remainingValuePaise,
      status,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "service.package.redeemed",
    entityType: "CustomerPackage",
    entityId: updated.id,
    before: row,
    after: updated,
  });

  return updated;
}

export async function decrementCustomerPackage(input: {
  organizationId: string;
  customerPackageId: string;
  userId: string;
  sessionsUsed?: number;
  valueUsedRupees?: number;
}) {
  return redeemCustomerPackage(input);
}
