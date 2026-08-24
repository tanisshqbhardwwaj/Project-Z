/** Generate internal retail barcode (EAN-13 compatible numeric, prefix 890 = India). */
export function generateShopBarcode(orgSuffix: string): string {
  const base = `890${orgSuffix.replace(/\D/g, "").slice(-4).padStart(4, "0")}${Date.now().toString().slice(-8)}`;
  const digits = base.slice(0, 12).padStart(12, "0");
  return digits + ean13CheckDigit(digits);
}

/**
 * Barcode for one of several variants created in the same request.
 *
 * `Date.now()` repeats within a millisecond, so the identifying part comes from
 * `seed` instead: 890 (India) + 4 org digits + 5 seed digits, which is exactly
 * the 12 digits EAN-13 needs before the check digit. Nothing is truncated, so
 * the seed always reaches the output.
 */
export function generateVariantBarcode(orgSuffix: string, seed: number): string {
  const org = (orgSuffix.replace(/\D/g, "") || "0").slice(-4).padStart(4, "0");
  const unique = String(Math.abs(Math.trunc(seed)) % 100_000).padStart(5, "0");
  const digits = `890${org}${unique}`;
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
  for (let attempt = 0; attempt < 200; attempt++) {
    const code = generateVariantBarcode(
      orgSuffix,
      Date.now() * 31 + seed * 7919 + attempt * 104_729 +
        Math.floor(Math.random() * 100_000)
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
