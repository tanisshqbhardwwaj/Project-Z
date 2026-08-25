import { describe, expect, it } from "vitest";
import {
  canAccessProjectsNav,
  canViewAllProjects,
  hasPermission,
} from "@/lib/permissions/rbac";
import {
  cashierMayPushKind,
  roleMayPushKind,
} from "@/lib/sync/push-policy";
import { isAiQuotaError } from "@/lib/ai/extraction-retry";
import { nextOutboxFailure, OUTBOX_MAX_ATTEMPTS } from "@/lib/sync/outbox-policy";
import { clientSafeInternalMessage } from "@/lib/api/internal-error";

describe("role matrix", () => {
  it("gives cashiers no RBAC shop.sales (staff toggles gate billing instead)", () => {
    expect(hasPermission("CASHIER", "shop.sales")).toBe(false);
    expect(hasPermission("OWNER", "shop.sales")).toBe(true);
    expect(hasPermission("PARTNER", "shop.sales")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "shop.sales")).toBe(true);
    expect(hasPermission("VIEWER", "shop.sales")).toBe(false);
  });

  it("lets partner and viewer open assigned projects, not all projects", () => {
    expect(canAccessProjectsNav("PARTNER")).toBe(true);
    expect(canAccessProjectsNav("VIEWER")).toBe(true);
    expect(canAccessProjectsNav("CASHIER")).toBe(false);
    expect(canViewAllProjects("PARTNER")).toBe(false);
    expect(canViewAllProjects("VIEWER")).toBe(false);
    expect(canViewAllProjects("OWNER")).toBe(true);
    expect(canViewAllProjects("ACCOUNTANT")).toBe(true);
  });

  it("keeps viewer read-only on udhaar writes", () => {
    expect(hasPermission("VIEWER", "payment.create")).toBe(false);
    expect(hasPermission("VIEWER", "shop.sales")).toBe(false);
    expect(hasPermission("OWNER", "payment.create")).toBe(true);
    expect(hasPermission("PARTNER", "payment.create")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "payment.create")).toBe(true);
    expect(hasPermission("CASHIER", "payment.create")).toBe(false);
  });
});

describe("sync push by role", () => {
  it("allows cashiers only sale and return kinds", () => {
    expect(cashierMayPushKind("sale.create")).toBe(true);
    expect(cashierMayPushKind("return.create")).toBe(true);
    expect(cashierMayPushKind("stock.adjust")).toBe(false);
    expect(cashierMayPushKind("purchase.create")).toBe(false);
    expect(cashierMayPushKind("expense.create")).toBe(false);
    expect(cashierMayPushKind("udhaar.payment")).toBe(false);
    expect(roleMayPushKind("CASHIER", "purchase.create")).toBe(false);
    expect(roleMayPushKind("CASHIER", "sale.create")).toBe(true);
  });

  it("blocks viewer from every sync kind", () => {
    expect(roleMayPushKind("VIEWER", "sale.create")).toBe(false);
    expect(roleMayPushKind("VIEWER", "udhaar.payment")).toBe(false);
  });

  it("allows owner stock/purchase/expense and partner sales but not purchases", () => {
    expect(roleMayPushKind("OWNER", "stock.adjust")).toBe(true);
    expect(roleMayPushKind("OWNER", "purchase.create")).toBe(true);
    expect(roleMayPushKind("PARTNER", "sale.create")).toBe(true);
    expect(roleMayPushKind("PARTNER", "purchase.create")).toBe(false);
    expect(roleMayPushKind("ACCOUNTANT", "sale.create")).toBe(true);
    expect(roleMayPushKind("ACCOUNTANT", "purchase.create")).toBe(false);
  });
});

describe("extraction retry classification", () => {
  it("treats quota as non-retryable", () => {
    expect(isAiQuotaError("429 Too Many Requests")).toBe(true);
    expect(isAiQuotaError("Google AI quota exceeded")).toBe(true);
    expect(isAiQuotaError("storage timeout")).toBe(false);
  });
});

describe("offline outbox dead-letter", () => {
  it("dead-letters on the 8th application failure", () => {
    expect(OUTBOX_MAX_ATTEMPTS).toBe(8);
    expect(nextOutboxFailure(0)).toEqual({ status: "ERROR", attempts: 1 });
    expect(nextOutboxFailure(6)).toEqual({ status: "ERROR", attempts: 7 });
    expect(nextOutboxFailure(7)).toEqual({ status: "DEAD", attempts: 8 });
  });
});

describe("internal error leakage", () => {
  it("hides raw messages in production", () => {
    expect(clientSafeInternalMessage(new Error("UNIQUE boom at /secret"), true)).toBe(
      "An unexpected error occurred"
    );
    expect(clientSafeInternalMessage(new Error("db exploded"), false)).toBe("db exploded");
  });
});
