import { describe, expect, it } from "vitest";
import {
  generateStaffAttendanceBarcode,
  isLikelyProductBarcode,
  isStaffAttendanceBarcode,
  normalizeStaffBarcode,
} from "@/lib/staff/attendance-barcode";
import { generateShopBarcode } from "@/lib/shop/inventory/barcode";

describe("attendance-barcode", () => {
  it("generates SA-prefixed codes separate from product EAN-13", () => {
    const code = generateStaffAttendanceBarcode("org-1234");
    expect(code.startsWith("SA-")).toBe(true);
    expect(isStaffAttendanceBarcode(code)).toBe(true);
    expect(isLikelyProductBarcode(code)).toBe(false);

    const product = generateShopBarcode("org-1234");
    expect(isStaffAttendanceBarcode(product)).toBe(false);
    expect(isLikelyProductBarcode(product)).toBe(true);
  });

  it("normalizes whitespace and case", () => {
    expect(normalizeStaffBarcode(" sa-org-abc123 ")).toBe("SA-ORG-ABC123");
  });
});
