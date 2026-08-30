/** Indian retail note denominations (₹). Coins entered as a single rupee total. */
export const INR_CASH_DENOMINATIONS = [
  { key: "500", label: "₹500", valuePaise: 50_000 },
  { key: "200", label: "₹200", valuePaise: 20_000 },
  { key: "100", label: "₹100", valuePaise: 10_000 },
  { key: "50", label: "₹50", valuePaise: 5_000 },
  { key: "20", label: "₹20", valuePaise: 2_000 },
  { key: "10", label: "₹10", valuePaise: 1_000 },
] as const;

export type CashDenominationKey =
  | (typeof INR_CASH_DENOMINATIONS)[number]["key"]
  | "coins";

export type CashDenominationCounts = Partial<Record<CashDenominationKey, number>>;

export function emptyDenominationCounts(): Record<CashDenominationKey, number> {
  return {
    "500": 0,
    "200": 0,
    "100": 0,
    "50": 0,
    "20": 0,
    "10": 0,
    coins: 0,
  };
}

export function normalizeDenominationCounts(
  input: CashDenominationCounts | null | undefined
): Record<CashDenominationKey, number> {
  const base = emptyDenominationCounts();
  if (!input) return base;
  for (const key of Object.keys(base) as CashDenominationKey[]) {
    const n = input[key];
    base[key] = typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  return base;
}

export function totalPaiseFromDenominations(
  counts: CashDenominationCounts
): bigint {
  const normalized = normalizeDenominationCounts(counts);
  let total = BigInt(0);
  for (const denom of INR_CASH_DENOMINATIONS) {
    total += BigInt(normalized[denom.key]) * BigInt(denom.valuePaise);
  }
  total += BigInt(normalized.coins) * BigInt(100);
  return total;
}

export function denominationBreakdownPaise(
  counts: CashDenominationCounts
): Array<{ key: CashDenominationKey; label: string; count: number; subtotalPaise: bigint }> {
  const normalized = normalizeDenominationCounts(counts);
  const rows: Array<{
    key: CashDenominationKey;
    label: string;
    count: number;
    subtotalPaise: bigint;
  }> = INR_CASH_DENOMINATIONS.map((denom) => ({
    key: denom.key as CashDenominationKey,
    label: denom.label,
    count: normalized[denom.key],
    subtotalPaise: BigInt(normalized[denom.key]) * BigInt(denom.valuePaise),
  }));
  rows.push({
    key: "coins",
    label: "Coins (₹ total)",
    count: normalized.coins,
    subtotalPaise: BigInt(normalized.coins) * BigInt(100),
  });
  return rows;
}
