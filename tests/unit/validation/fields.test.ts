import { describe, expect, it } from "vitest";
import {
  FIELD_LIMITS,
  registerSchema,
  validateCustomerNameOptional,
  validateEmail,
  validateGstinOptional,
  validateOrganizationName,
  validatePersonName,
  validatePhoneOptional,
  validateSecurePassword,
} from "@/lib/validation/fields";

describe("validateSecurePassword", () => {
  it("accepts a strong password", () => {
    expect(validateSecurePassword("Abcdef12")).toBeNull();
  });

  it("rejects passwords without uppercase, lowercase, or digits", () => {
    expect(validateSecurePassword("abcdefgh")).toMatch(/uppercase/i);
    expect(validateSecurePassword("ABCDEFGH")).toMatch(/lowercase/i);
    expect(validateSecurePassword("Abcdefgh")).toMatch(/number/i);
  });

  it("rejects passwords that are too short or contain spaces", () => {
    expect(validateSecurePassword("Ab1")).toMatch(/at least/i);
    expect(validateSecurePassword("Abc def12")).toMatch(/spaces/i);
  });
});

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("User@Example.com")).toBeNull();
  });

  it("rejects invalid or overlong emails", () => {
    expect(validateEmail("")).toMatch(/enter your email/i);
    expect(validateEmail("not-an-email")).toMatch(/valid email/i);
    expect(validateEmail(`${"a".repeat(FIELD_LIMITS.EMAIL_MAX)}@x.com`)).toMatch(/at most/i);
  });
});

describe("validatePhoneOptional", () => {
  it("allows empty phone", () => {
    expect(validatePhoneOptional("")).toBeNull();
  });

  it("accepts a valid Indian mobile number", () => {
    expect(validatePhoneOptional("9876543210")).toBeNull();
    expect(validatePhoneOptional("+91 9876543210")).toBeNull();
  });

  it("rejects invalid phone numbers", () => {
    expect(validatePhoneOptional("12345")).toMatch(/valid 10-digit/i);
    expect(validatePhoneOptional("5876543210")).toMatch(/start with 6, 7, 8, or 9/i);
  });
});

describe("validatePersonName", () => {
  it("enforces name length limits", () => {
    expect(validatePersonName("A")).toMatch(/at least/i);
    expect(validatePersonName("x".repeat(FIELD_LIMITS.PERSON_NAME_MAX + 1))).toMatch(/at most/i);
    expect(validatePersonName("Jane Doe")).toBeNull();
  });
});

describe("validateOrganizationName", () => {
  it("enforces organization name length limits", () => {
    expect(validateOrganizationName("A")).toMatch(/at least/i);
    expect(validateOrganizationName("x".repeat(FIELD_LIMITS.ORG_NAME_MAX + 1))).toMatch(/at most/i);
    expect(validateOrganizationName("Acme Corp")).toBeNull();
  });
});

describe("validateCustomerNameOptional", () => {
  it("allows empty walk-in names", () => {
    expect(validateCustomerNameOptional("")).toBeNull();
  });

  it("rejects names over the limit", () => {
    expect(validateCustomerNameOptional("x".repeat(FIELD_LIMITS.CUSTOMER_NAME_MAX + 1))).toMatch(
      /at most/
    );
  });
});

describe("validateGstinOptional", () => {
  it("allows empty GSTIN", () => {
    expect(validateGstinOptional("")).toBeNull();
  });

  it("accepts a valid GSTIN", () => {
    expect(validateGstinOptional("27AABCU9603R1ZM")).toBeNull();
  });

  it("rejects invalid GSTIN format", () => {
    expect(validateGstinOptional("123")).toMatch(/15 characters/);
    expect(validateGstinOptional("27AABCU9603R1Z")).toMatch(/15 characters/);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const parsed = registerSchema.safeParse({
      email: "user@example.com",
      password: "Abcdef12",
      name: "Jane Doe",
      phone: "9876543210",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("user@example.com");
      expect(parsed.data.phone).toBe("9876543210");
    }
  });

  it("allows optional empty phone", () => {
    const parsed = registerSchema.safeParse({
      email: "user@example.com",
      password: "Abcdef12",
      name: "Jane Doe",
      phone: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBeNull();
    }
  });
});
