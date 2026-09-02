/** Staff attendance barcodes — separate namespace from EAN-13 product barcodes. */

const STAFF_BARCODE_PREFIX = "SA-";
const BASE36 = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomBase36(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE36[Math.floor(Math.random() * BASE36.length)]!;
  }
  return out;
}

/** Generate a unique staff-attendance barcode (CODE128 alphanumeric). */
export function generateStaffAttendanceBarcode(orgSuffix: string): string {
  const org = (orgSuffix.replace(/\D/g, "") || "0").slice(-4).padStart(4, "0");
  return `${STAFF_BARCODE_PREFIX}${org}-${randomBase36(8)}`;
}

export function normalizeStaffBarcode(value: string): string {
  return value.trim().replace(/\s/g, "").toUpperCase();
}

/** True when value is a staff-attendance barcode (not a product EAN-13). */
export function isStaffAttendanceBarcode(value: string): boolean {
  const normalized = normalizeStaffBarcode(value);
  return normalized.startsWith(STAFF_BARCODE_PREFIX);
}

/** Reject product barcodes accidentally scanned at the staff kiosk. */
export function isLikelyProductBarcode(value: string): boolean {
  const normalized = normalizeStaffBarcode(value);
  if (isStaffAttendanceBarcode(normalized)) return false;
  return /^\d{8,14}$/.test(normalized);
}
