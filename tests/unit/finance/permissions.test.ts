import { describe, it, expect } from "vitest";
import { hasPermission, canCreateProject } from "@/lib/permissions/rbac";

describe("permissions", () => {
  it("owner can manage org", () => {
    expect(hasPermission("OWNER", "org.manage")).toBe(true);
    expect(hasPermission("PARTNER", "org.manage")).toBe(false);
  });

  it("partner can create expenses but not projects", () => {
    expect(hasPermission("PARTNER", "expense.create")).toBe(true);
    expect(canCreateProject("PARTNER")).toBe(false);
  });

  it("viewer is read-only", () => {
    expect(hasPermission("VIEWER", "expense.create")).toBe(false);
    expect(hasPermission("VIEWER", "financial.view")).toBe(true);
  });
});
