import { prisma } from "@/lib/db/prisma";
import { buildVendorLedger, getVendorBalance } from "@/lib/finance/vendor-ledger";

export async function createVendor(input: {
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}) {
  return prisma.vendor.create({ data: { ...input, organizationId: input.organizationId } });
}

export async function getVendorLedger(
  vendorId: string,
  organizationId: string,
  options?: { projectId?: string }
) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId, deletedAt: null },
  });
  if (!vendor) return null;

  const expenseWhere = {
    vendorId,
    organizationId,
    deletedAt: null,
    ...(options?.projectId && { projectId: options.projectId }),
  };

  const paymentWhere = {
    vendorId,
    organizationId,
    deletedAt: null,
    paymentType: "VENDOR" as const,
    ...(options?.projectId && { projectId: options.projectId }),
  };

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    orderBy: { expenseDate: "asc" },
  });

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    include: { paidBy: { select: { name: true } } },
    orderBy: { paymentDate: "asc" },
  });

  const entries = buildVendorLedger({
    expenses: expenses.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate,
      description: e.description,
      amountPaise: e.amountPaise,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      paymentDate: p.paymentDate,
      amountPaise: p.amountPaise,
      paidByName: p.paidBy.name,
      referenceNumber: p.referenceNumber,
    })),
  });

  const totalBilled = expenses.reduce((s, e) => s + e.amountPaise, BigInt(0));
  const totalPaid = payments.reduce((s, p) => s + p.amountPaise, BigInt(0));

  return {
    vendor,
    entries,
    balance: getVendorBalance(entries),
    totalBilled,
    totalPaid,
  };
}

export async function listVendors(organizationId: string) {
  const vendors = await prisma.vendor.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const result = await Promise.all(
    vendors.map(async (v) => {
      const ledger = await getVendorLedger(v.id, organizationId);
      return {
        ...v,
        totalBilled: ledger?.totalBilled ?? BigInt(0),
        totalPaid: ledger?.totalPaid ?? BigInt(0),
        outstanding: ledger?.balance ?? BigInt(0),
      };
    })
  );

  return result;
}

export async function listVendorsForProject(projectId: string, organizationId: string) {
  const vendorIds = new Set<string>();

  const expenses = await prisma.expense.findMany({
    where: { projectId, organizationId, deletedAt: null, vendorId: { not: null } },
    select: { vendorId: true },
  });
  expenses.forEach((e) => e.vendorId && vendorIds.add(e.vendorId));

  const payments = await prisma.payment.findMany({
    where: { projectId, organizationId, deletedAt: null, vendorId: { not: null } },
    select: { vendorId: true },
  });
  payments.forEach((p) => p.vendorId && vendorIds.add(p.vendorId));

  if (vendorIds.size === 0) return [];

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: [...vendorIds] }, organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    vendors.map(async (v) => {
      const ledger = await getVendorLedger(v.id, organizationId, { projectId });
      return {
        ...v,
        totalBilled: ledger?.totalBilled ?? BigInt(0),
        totalPaid: ledger?.totalPaid ?? BigInt(0),
        outstanding: ledger?.balance ?? BigInt(0),
      };
    })
  );
}
