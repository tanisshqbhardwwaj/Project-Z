import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Indian fiscal year label (Apr–Mar), e.g. Aug 2026 → "26-27". */
export function fiscalYearLabel(date = new Date()): string {
  const month = date.getMonth(); // 0 = Jan
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const startShort = String(startYear).slice(-2);
  const endShort = String(endYear).slice(-2);
  return `${startShort}-${endShort}`;
}

export function normalizeCashierCode(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().toUpperCase();
  if (!trimmed) return "00";
  return trimmed.replace(/[^A-Z0-9]/g, "").slice(0, 10) || "00";
}

export function formatShopBillNumber(input: {
  prefix: string;
  cashierCode: string | null | undefined;
  fiscalYear: string;
  sequence: number;
}): string {
  const prefix = input.prefix.trim().toUpperCase() || "INV";
  const code = normalizeCashierCode(input.cashierCode);
  const seq = Math.max(1, Math.floor(input.sequence));
  return `${prefix}-${code}-${input.fiscalYear}-${String(seq).padStart(5, "0")}`;
}

function readBillSeqByFy(
  shop: Record<string, unknown>,
  fiscalYear: string
): number {
  const map = shop.billSeqByFy;
  if (map && typeof map === "object" && !Array.isArray(map)) {
    const value = (map as Record<string, unknown>)[fiscalYear];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
  }
  if (typeof shop.nextBillSeq === "number" && Number.isFinite(shop.nextBillSeq)) {
    return Math.max(0, Math.floor(shop.nextBillSeq));
  }
  return 0;
}

export async function nextShopBillNumber(
  tx: Tx,
  organizationId: string,
  cashierCode?: string | null
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

  const fiscalYear = fiscalYearLabel();
  const prevSeq = readBillSeqByFy(shop, fiscalYear);
  const seq = prevSeq + 1;

  const billSeqByFy = {
    ...(shop.billSeqByFy && typeof shop.billSeqByFy === "object"
      ? (shop.billSeqByFy as Record<string, number>)
      : {}),
    [fiscalYear]: seq,
  };

  const nextSettings = {
    ...settings,
    shop: { ...shop, billSeqByFy, nextBillSeq: seq },
  };
  await tx.organization.update({
    where: { id: organizationId },
    data: { settings: nextSettings },
  });

  return formatShopBillNumber({
    prefix,
    cashierCode,
    fiscalYear,
    sequence: seq,
  });
}
