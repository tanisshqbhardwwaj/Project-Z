import { describe, expect, it } from "vitest";
import { defaultStaffAccess } from "@/lib/staff/access";
import {
  isCashierExperience,
  isCashierRouteAllowed,
  resolveCashierAccess,
} from "@/lib/staff/cashier-mode";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";
import { inviteLandingPath, staffHomePath } from "@/lib/org/org-invites";

describe("shop staff access gate", () => {
  it("gates shop non-owners and any cashier, not contractor partners", () => {
    expect(
      shopStaffAccessApplies({ role: "PARTNER", businessType: "SHOPKEEPER" })
    ).toBe(true);
    expect(
      shopStaffAccessApplies({ role: "ACCOUNTANT", businessType: "SERVICE" })
    ).toBe(true);
    expect(
      shopStaffAccessApplies({ role: "OWNER", businessType: "SHOPKEEPER" })
    ).toBe(false);
    expect(
      shopStaffAccessApplies({ role: "PARTNER", businessType: "CONTRACTOR" })
    ).toBe(false);
    expect(
      shopStaffAccessApplies({ role: "CASHIER", businessType: "CONTRACTOR" })
    ).toBe(true);
  });
});

describe("isCashierExperience", () => {
  it("uses the staff shell for shop non-owners, not only CASHIER", () => {
    expect(
      isCashierExperience({
        role: "CASHIER",
        previewMode: false,
        isShopkeeper: true,
      })
    ).toBe(true);
    expect(
      isCashierExperience({
        role: "PARTNER",
        previewMode: false,
        isShopkeeper: true,
      })
    ).toBe(true);
    expect(
      isCashierExperience({
        role: "OWNER",
        previewMode: false,
        isShopkeeper: true,
      })
    ).toBe(false);
    expect(
      isCashierExperience({
        role: "PARTNER",
        previewMode: false,
        isShopkeeper: false,
      })
    ).toBe(false);
  });

  it("resolves linked staff access for shop partners instead of owner preview", () => {
    const linked = { ...defaultStaffAccess(), canViewOwnAttendance: true };
    expect(
      resolveCashierAccess({
        role: "PARTNER",
        linkedStaffAccess: linked,
        previewMode: false,
        isShopkeeper: true,
      })
    ).toEqual(linked);
  });
});

describe("attendance-only cashier routes", () => {
  const attendanceOnly = {
    ...defaultStaffAccess(),
    canViewOwnAttendance: true,
  };

  it("allows attendance, profile, and storage — not billing", () => {
    expect(isCashierRouteAllowed("/staff/me", attendanceOnly)).toBe(true);
    expect(isCashierRouteAllowed("/cashier", attendanceOnly)).toBe(true);
    expect(isCashierRouteAllowed("/settings/profile", attendanceOnly)).toBe(true);
    expect(isCashierRouteAllowed("/settings/storage", attendanceOnly)).toBe(true);
    expect(isCashierRouteAllowed("/shop/invoices/new", attendanceOnly)).toBe(false);
    expect(isCashierRouteAllowed("/shop/scan", attendanceOnly)).toBe(false);
    expect(isCashierRouteAllowed("/shop/returns", attendanceOnly)).toBe(false);
    expect(isCashierRouteAllowed("/shop/reports", attendanceOnly)).toBe(false);
  });

  it("lands attendance-only staff on /staff/me", () => {
    expect(staffHomePath(attendanceOnly)).toBe("/staff/me");
    expect(
      inviteLandingPath({
        role: "CASHIER",
        businessType: "SHOPKEEPER",
        staffAccess: attendanceOnly,
      })
    ).toBe("/staff/me");
    expect(
      inviteLandingPath({
        role: "PARTNER",
        businessType: "CONTRACTOR",
        staffAccess: attendanceOnly,
      })
    ).toBe("/dashboard");
  });
});
