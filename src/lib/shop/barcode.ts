/** Generate internal retail barcode (EAN-13 compatible numeric, prefix 890 = India). */
export function generateShopBarcode(orgSuffix: string): string {
  const base = `890${orgSuffix.replace(/\D/g, "").slice(-4).padStart(4, "0")}${Date.now().toString().slice(-8)}`;
  const digits = base.slice(0, 12).padStart(12, "0");
  return digits + ean13CheckDigit(digits);
}

/**
 * Barcode for one of several variants created in the same request. `Date.now()`
 * alone repeats within a millisecond, so the last 3 digits carry a per-variant
 * salt to keep every size in a size run unique.
 */
export function generateVariantBarcode(orgSuffix: string, seed: number): string {
  const org = orgSuffix.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const stamp = Date.now().toString().slice(-5);
  const salt = String(Math.abs(seed) % 1000).padStart(3, "0");
  const digits = `890${org}${stamp}${salt}`.slice(0, 12).padStart(12, "0");
  return digits + ean13CheckDigit(digits);
}

/**
 * Draws barcodes until one is not in `taken`, so a caller creating N variants in
 * a single transaction never has to round-trip the database N times.
 */
export function nextFreeBarcode(
  orgSuffix: string,
  taken: Set<string>,
  seed = 0
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = generateVariantBarcode(
      orgSuffix,
      seed * 97 + attempt * 7 + Math.floor(Math.random() * 1000)
    );
    if (!taken.has(code)) {
      taken.add(code);
      return code;
    }
  }
  throw new Error("Could not generate a unique barcode — enter one manually");
}

function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(first12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return String(check);
}

export function normalizeBarcode(value: string): string {
  return value.trim().replace(/\s/g, "");
}
