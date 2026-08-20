/** Generate internal retail barcode (EAN-13 compatible numeric, prefix 890 = India). */
export function generateShopBarcode(orgSuffix: string): string {
  const base = `890${orgSuffix.replace(/\D/g, "").slice(-4).padStart(4, "0")}${Date.now().toString().slice(-8)}`;
  const digits = base.slice(0, 12).padStart(12, "0");
  return digits + ean13CheckDigit(digits);
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
