import { describe, it, expect } from "vitest";
import { rupeesToPaise, paiseToRupees, formatINR } from "@/lib/finance/money";

describe("money", () => {
  it("converts rupees to paise", () => {
    expect(rupeesToPaise(1500)).toBe(BigInt(150000));
    expect(rupeesToPaise("5,00,000")).toBe(BigInt(50000000));
  });

  it("converts paise to rupees", () => {
    expect(paiseToRupees(BigInt(150000))).toBe(1500);
  });

  it("formats INR", () => {
    expect(formatINR(BigInt(50000000))).toContain("5,00,000");
  });
});
