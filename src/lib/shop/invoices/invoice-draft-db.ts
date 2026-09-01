import { prisma } from "@/lib/db/prisma";
import type { InvoiceDraft } from "@/lib/shop/invoices/invoice-draft-storage";

export async function loadInvoiceDraftFromDb(
  organizationId: string
): Promise<InvoiceDraft | null> {
  const row = await prisma.shopInvoiceDraft.findUnique({
    where: { organizationId },
  });
  if (!row) return null;
  try {
    return row.draftJson as InvoiceDraft;
  } catch {
    return null;
  }
}

export async function saveInvoiceDraftToDb(
  organizationId: string,
  draft: InvoiceDraft
): Promise<void> {
  await prisma.shopInvoiceDraft.upsert({
    where: { organizationId },
    create: { organizationId, draftJson: draft as object },
    update: { draftJson: draft as object },
  });
}

export async function clearInvoiceDraftFromDb(organizationId: string): Promise<void> {
  await prisma.shopInvoiceDraft.deleteMany({ where: { organizationId } });
}
