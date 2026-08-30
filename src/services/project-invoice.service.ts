import { prisma } from "@/lib/db/prisma";
import { nextProjectBillNumber } from "@/lib/project/bill-number";
import type { ProjectInvoiceLineJson } from "@/lib/project/project-invoice-mapper";
import {
  computeInvoicePricing,
  type StoredInvoicePricing,
} from "@/lib/shop/invoice-pricing";
import type { DiscountBasis } from "@/lib/org/shop-settings";
import type { PaymentMethod } from "@prisma/client";

export async function listProjectInvoices(
  projectId: string,
  organizationId: string,
  options: { limit?: number; cursor?: string } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const rows = await prisma.projectInvoice.findMany({
    where: { projectId, organizationId, status: "ISSUED" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      billNumber: true,
      clientName: true,
      clientPhone: true,
      totalPaise: true,
      gstPaise: true,
      paymentMethod: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getProjectInvoice(
  projectId: string,
  invoiceId: string,
  organizationId: string
) {
  return prisma.projectInvoice.findFirst({
    where: {
      id: invoiceId,
      projectId,
      organizationId,
      status: "ISSUED",
    },
    include: {
      organization: { select: { name: true } },
      createdBy: { select: { name: true } },
      project: {
        select: {
          id: true,
          name: true,
          nickname: true,
          workOrder: { select: { clientName: true, workOrderNumber: true } },
        },
      },
    },
  });
}

export async function createProjectInvoice(input: {
  organizationId: string;
  projectId: string;
  createdById: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientGstin?: string | null;
  paymentMethod?: PaymentMethod;
  items: ProjectInvoiceLineJson[];
  notes?: string | null;
  discountRupees?: number;
  discountPercent?: number;
  discountBasis?: DiscountBasis;
  taxRatePercent?: number;
  taxIncluded?: boolean;
  manualGstRupees?: number | null;
}) {
  if (!input.items.length) {
    throw new Error("Add at least one line item");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      workOrder: { select: { clientName: true } },
    },
  });
  if (!project) throw new Error("Project not found");

  const pricing = computeInvoicePricing({
    items: input.items,
    discountRupees: input.discountRupees,
    discountPercent: input.discountPercent,
    discountBasis: input.discountBasis,
    taxRatePercent: input.taxRatePercent,
    taxIncluded: input.taxIncluded,
    manualGstRupees: input.manualGstRupees,
  });

  const pricingJson: StoredInvoicePricing = {
    subtotalRupees: pricing.subtotalRupees,
    discountRupees: pricing.discountRupees,
    discountPercent: pricing.discountPercent,
    discountBasis: pricing.discountBasis,
    taxableRupees: pricing.taxableRupees,
    gstRupees: pricing.gstRupees,
    cgstRupees: pricing.cgstRupees,
    sgstRupees: pricing.sgstRupees,
    taxIncluded: pricing.taxIncluded,
    taxRatePercent: pricing.taxRatePercent,
    roundOffRupees: pricing.roundOffRupees,
    manualGstRupees: input.manualGstRupees ?? null,
  };

  const clientName =
    input.clientName?.trim() ||
    project.workOrder?.clientName?.trim() ||
    null;

  return prisma.$transaction(async (tx) => {
    const billNumber = await nextProjectBillNumber(tx, input.projectId);

    const invoice = await tx.projectInvoice.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        billNumber,
        clientName,
        clientPhone: input.clientPhone?.trim() || null,
        clientGstin: input.clientGstin?.trim() || null,
        totalPaise: pricing.totalPaise,
        gstPaise: pricing.gstPaise,
        paymentMethod: input.paymentMethod ?? "CASH",
        itemsJson: input.items,
        pricingJson,
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
      },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return invoice;
  });
}
