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

function toAlnumUpper(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeCashierCode(raw: string | null | undefined): string {
  return toAlnumUpper(raw).slice(0, 10) || "00";
}

/**
 * Short store code from the org name, e.g. "Bharatdarsh Fashion" → "BF".
 * Single-word names use their first letters ("Zudio" → "ZU").
 */
export function deriveStoreCode(orgName: string | null | undefined): string {
  const words = (orgName ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => toAlnumUpper(w))
    .filter(Boolean);
  if (words.length === 0) return "Z";
  if (words.length === 1) return (words[0].slice(0, 2) || "Z").padEnd(2, "Z");
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4);
}

/**
 * GST-safe bill number: STORE/FY/CASHIER/SEQ, e.g. "BF/26-27/R2/0042".
 * Indian invoice serials must be ≤16 chars, so the store code is clamped
 * to fit (cashier segment + FY + 4-digit sequence take 12 chars).
 */
export function formatShopBillNumber(input: {
  storeCode: string | null | undefined;
  cashierCode: string | null | undefined;
  fiscalYear: string;
  sequence: number;
}): string {
  const cashier = normalizeCashierCode(input.cashierCode).slice(0, 2) || "00";
  const seq = String(Math.max(1, Math.floor(input.sequence))).padStart(4, "0");
  const maxStore = Math.max(1, 16 - (cashier.length + seq.length + 8));
  const store = (toAlnumUpper(input.storeCode) || "Z").slice(0, Math.min(4, maxStore));
  return `${store}/${input.fiscalYear}/${cashier}/${seq}`;
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

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

/**
 * Atomic per-org per-FY sequence via the ShopBillCounter table.
 * `increment` is a single atomic UPDATE; concurrent creators retry on P2002.
 * First use seeds from the legacy settings JSON counter so numbers continue.
 */
async function incrementBillCounter(
  tx: Tx,
  organizationId: string,
  fiscalYear: string,
  legacySeed: number
): Promise<number> {
  const where = {
    organizationId_fiscalYear: { organizationId, fiscalYear },
  } as const;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await tx.shopBillCounter.findUnique({ where });
    if (existing) {
      const updated = await tx.shopBillCounter.update({
        where: { id: existing.id },
        data: { seq: { increment: 1 } },
      });
      return updated.seq;
    }
    try {
      const created = await tx.shopBillCounter.create({
        data: {
          organizationId,
          fiscalYear,
          seq: Math.max(0, Math.floor(legacySeed)) + 1,
        },
      });
      return created.seq;
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  const updated = await tx.shopBillCounter.update({
    where,
    data: { seq: { increment: 1 } },
  });
  return updated.seq;
}

/** Store code resolution: explicit setting → legacy bill prefix → org initials. */
export function resolveStoreCode(
  invoiceSettings: Record<string, unknown>,
  orgName: string | null | undefined
): string {
  const explicit = toAlnumUpper(
    typeof invoiceSettings.storeCode === "string" ? invoiceSettings.storeCode : null
  );
  if (explicit) return explicit.slice(0, 4);
  const legacyPrefix = toAlnumUpper(
    typeof invoiceSettings.billPrefix === "string" ? invoiceSettings.billPrefix : null
  );
  if (legacyPrefix) return legacyPrefix.slice(0, 4);
  return deriveStoreCode(orgName);
}

export async function nextShopBillNumber(
  tx: Tx,
  organizationId: string,
  cashierCode?: string | null
): Promise<string> {
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, settings: true },
  });
  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const shop = (settings.shop ?? {}) as Record<string, unknown>;
  const invoice = (shop.invoice ?? {}) as Record<string, unknown>;
  const storeCode = resolveStoreCode(invoice, org?.name);

  const fiscalYear = fiscalYearLabel();
  const seq = await incrementBillCounter(
    tx,
    organizationId,
    fiscalYear,
    readBillSeqByFy(shop, fiscalYear)
  );

  return formatShopBillNumber({
    storeCode,
    cashierCode,
    fiscalYear,
    sequence: seq,
  });
}
