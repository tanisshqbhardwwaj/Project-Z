import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canCreateProject,
  canViewAllProjects,
} from "@/lib/permissions/rbac";
import { projectIdScope } from "@/lib/permissions/project-scope";

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

  it("owner and accountant see all projects; partner and viewer do not", () => {
    expect(canViewAllProjects("OWNER")).toBe(true);
    expect(canViewAllProjects("ACCOUNTANT")).toBe(true);
    expect(canViewAllProjects("PARTNER")).toBe(false);
    expect(canViewAllProjects("VIEWER")).toBe(false);
  });

  it("projectIdScope leaves owners unscoped and partners limited", () => {
    expect(projectIdScope(null)).toEqual({});
    expect(projectIdScope(["proj-a"])).toEqual({ projectId: { in: ["proj-a"] } });
  });
});
