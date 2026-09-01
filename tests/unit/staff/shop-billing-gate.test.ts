import { describe, expect, it } from "vitest";
import {
  canCreateOrgTeamInvite,
  SHOP_STAFF_ONLY_INVITE_MESSAGE,
  shopStaffAccessApplies,
} from "@/lib/staff/shop-staff-gate";

describe("shop billing staff toggle", () => {
  it("requires canBill for shop non-owners even when RBAC has shop.sales", () => {
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
  });
});

describe("shop org team invite gate", () => {
  it("blocks members API invites for shop verticals unless from Staff", () => {
    expect(canCreateOrgTeamInvite("SHOPKEEPER")).toBe(false);
    expect(canCreateOrgTeamInvite("SERVICE")).toBe(false);
    expect(canCreateOrgTeamInvite("SHOPKEEPER", true)).toBe(true);
    expect(canCreateOrgTeamInvite("CONTRACTOR")).toBe(true);
    expect(canCreateOrgTeamInvite("ARCHITECT")).toBe(true);
    expect(SHOP_STAFF_ONLY_INVITE_MESSAGE).toMatch(/Staff/);
  });
});
