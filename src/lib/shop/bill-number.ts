import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function nextShopBillNumber(
  tx: Tx,
  organizationId: string
): Promise<string> {
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const shop = (settings.shop ?? {}) as Record<string, unknown>;
  const invoice = (shop.invoice ?? {}) as Record<string, unknown>;
  const prefix =
    typeof invoice.billPrefix === "string" && invoice.billPrefix.trim()
      ? invoice.billPrefix.trim().toUpperCase()
      : "INV";
  const seq = Number(shop.nextBillSeq ?? 0) + 1;
  const nextSettings = {
    ...settings,
    shop: { ...shop, nextBillSeq: seq },
  };
  await tx.organization.update({
    where: { id: organizationId },
    data: { settings: nextSettings },
  });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
