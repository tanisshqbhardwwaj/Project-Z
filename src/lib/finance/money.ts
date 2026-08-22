const PAISE_PER_RUPEE = 100;

export function rupeesToPaise(rupees: number | string): bigint {
  const num = typeof rupees === "string" ? parseFloat(rupees.replace(/,/g, "")) : rupees;
  if (isNaN(num)) return BigInt(0);
  return BigInt(Math.round(num * PAISE_PER_RUPEE));
}

export function paiseToRupees(paise: bigint | number | string): number {
  const p = typeof paise === "bigint" ? paise : BigInt(paise);
  return Number(p) / PAISE_PER_RUPEE;
}

export function formatINR(paise: bigint | number | string, locale = "en-IN"): string {
  const p =
    typeof paise === "bigint"
      ? paise
      : BigInt(Math.round(typeof paise === "number" ? paise : parseFloat(String(paise).replace(/,/g, "")) || 0));
  const rupees = paiseToRupees(p);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function addPaise(...amounts: bigint[]): bigint {
  return amounts.reduce((sum, a) => sum + a, BigInt(0));
}

export function subtractPaise(a: bigint, b: bigint): bigint {
  return a - b;
}

export function percentOfPaise(amount: bigint, percent: number): bigint {
  return BigInt(Math.round(Number(amount) * (percent / 100)));
}
