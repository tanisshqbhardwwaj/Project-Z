import { describe, expect, it } from "vitest";
import {
  classifyInviteToken,
  emailsForStaffLink,
  inviteEmailMatchesUser,
  isPlaceholderInviteEmail,
  safeInviteNextPath,
} from "@/lib/org/org-invites";

describe("invite accept matching", () => {
  it("links staff by invite email and accepting user email", () => {
    expect(emailsForStaffLink("Staff@Shop.com", "staff@shop.com")).toEqual([
      "staff@shop.com",
    ]);
    expect(emailsForStaffLink("a@shop.com", "b@shop.com").sort()).toEqual([
      "a@shop.com",
      "b@shop.com",
    ]);
    expect(emailsForStaffLink("invite-abc@placeholder.local", "b@shop.com")).toEqual([
      "b@shop.com",
    ]);
  });

  it("rejects a different logged-in email on named invites", () => {
    expect(inviteEmailMatchesUser("a@shop.com", "a@shop.com")).toBe(true);
    expect(inviteEmailMatchesUser("a@shop.com", "A@shop.com")).toBe(true);
    expect(inviteEmailMatchesUser("a@shop.com", "other@shop.com")).toBe(false);
    expect(
      inviteEmailMatchesUser("invite-x@placeholder.local", "other@shop.com")
    ).toBe(true);
    expect(isPlaceholderInviteEmail("invite-x@placeholder.local")).toBe(true);
  });

  it("classifies used and expired tokens", () => {
    expect(classifyInviteToken(null)).toBe("not_found");
    expect(
      classifyInviteToken({
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      })
    ).toBe("already_accepted");
    expect(
      classifyInviteToken({
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      })
    ).toBe("expired");
    expect(
      classifyInviteToken({
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      })
    ).toBe("ok");
  });

  it("only allows invite paths as post-verify next", () => {
    expect(safeInviteNextPath("/invite/abc")).toBe("/invite/abc");
    expect(safeInviteNextPath("https://evil.example/invite/abc")).toBe(null);
    expect(safeInviteNextPath("//evil.example")).toBe(null);
    expect(safeInviteNextPath("/dashboard")).toBe(null);
  });
});
