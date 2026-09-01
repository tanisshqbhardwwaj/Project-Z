import { describe, expect, it } from "vitest";
import { resolveAppFetchUrl } from "@/lib/api/resolve-url";
import {
  isAllowedApiOrigin,
  isAllowedNativeOrigin,
  isSameOriginRequest,
  nativeCorsAllowlist,
} from "@/lib/security/native-cors";
import { displayCacheToAuthPartial } from "@/lib/auth/native-session-cache";
import { defaultStaffAccess } from "@/lib/staff/access";

describe("resolveAppFetchUrl", () => {
  it("returns relative paths on web origin", () => {
    expect(resolveAppFetchUrl("/api/v1/auth/me")).toBe("/api/v1/auth/me");
  });
});

describe("native CORS allowlist", () => {
  it("includes capacitor localhost", () => {
    expect(nativeCorsAllowlist()).toContain("https://localhost");
  });

  it("rejects unknown origins", () => {
    expect(isAllowedNativeOrigin("https://evil.example")).toBe(false);
    expect(isAllowedNativeOrigin("https://localhost")).toBe(true);
  });

  it("allows same-origin web requests", () => {
    expect(
      isSameOriginRequest("https://www.econsole.in", "https://www.econsole.in")
    ).toBe(true);
    expect(
      isAllowedApiOrigin("https://www.econsole.in", "https://www.econsole.in")
    ).toBe(true);
    expect(
      isAllowedApiOrigin("http://localhost:3000", "http://localhost:3000")
    ).toBe(true);
  });

  it("allows cross-origin native but blocks arbitrary sites", () => {
    expect(
      isAllowedApiOrigin("https://www.econsole.in", "capacitor://localhost")
    ).toBe(true);
    expect(
      isAllowedApiOrigin("https://www.econsole.in", "https://evil.example")
    ).toBe(false);
  });
});

describe("auth display cache", () => {
  it("marks cached bootstrap as unverified", () => {
    const partial = displayCacheToAuthPartial({
      userName: "Ada",
      userEmail: "ada@shop.in",
      activeOrganizationId: "org-1",
      activeOrganizationName: "Ada Store",
      activeBusinessType: "SHOPKEEPER" as const,
      activeShopSector: null,
      activeOrgSettings: null,
      timezone: "Asia/Kolkata",
      enableStaff: false,
      enabledModules: {},
      role: "OWNER",
      linkedStaffId: null,
      linkedStaffName: null,
      linkedStaffAccess: defaultStaffAccess(),
      linkedStaffCanViewAttendance: false,
      isPlatformAdmin: false,
      cachedAt: new Date().toISOString(),
    });
    expect(partial.sessionVerified).toBe(false);
    expect(partial.status).toBe("authenticated");
  });
});
