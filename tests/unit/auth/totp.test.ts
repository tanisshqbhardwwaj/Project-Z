import { describe, expect, it, beforeAll } from "vitest";
import {
  createMfaPendingToken,
  createRegistrationSetupToken,
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSetup,
  verifyMfaPendingToken,
  verifyRegistrationSetupToken,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { TOTP, Secret } from "otpauth";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-32-characters-long!";
});

describe("totp", () => {
  it("encrypts and decrypts secrets", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const enc = encryptTotpSecret(secret);
    expect(decryptTotpSecret(enc)).toBe(secret);
  });

  it("verifies a generated code", () => {
    const setup = generateTotpSetup("user@example.com");
    const totp = new TOTP({
      secret: Secret.fromBase32(setup.secret),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    const token = totp.generate();
    expect(verifyTotpCode(setup.secret, token)).toBe(true);
    expect(verifyTotpCode(setup.secret, "000000")).toBe(false);
  });

  it("issues and verifies MFA pending tokens", () => {
    const token = createMfaPendingToken("user-123");
    expect(verifyMfaPendingToken(token)).toBe("user-123");
  });

  it("issues and verifies registration setup tokens", () => {
    const token = createRegistrationSetupToken("user-new");
    expect(verifyRegistrationSetupToken(token)).toBe("user-new");
    expect(() => verifyMfaPendingToken(token)).toThrow();
  });
});

describe("shopStaffAccessApplies", () => {
  it("gates shop non-owners", async () => {
    const { shopStaffAccessApplies, canCreateOrgTeamInvite } = await import(
      "@/lib/staff/shop-staff-gate"
    );
    expect(
      shopStaffAccessApplies({ role: "PARTNER", businessType: "SHOPKEEPER" })
    ).toBe(true);
    expect(
      shopStaffAccessApplies({ role: "OWNER", businessType: "SHOPKEEPER" })
    ).toBe(false);
    expect(canCreateOrgTeamInvite("SHOPKEEPER")).toBe(false);
    expect(canCreateOrgTeamInvite("CONTRACTOR")).toBe(true);
  });
});
