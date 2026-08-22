/** Org-scoped query keys — switching org changes scope instead of nuking cache. */
export const queryKeys = {
  org: (orgId: string) => ["org", orgId] as const,

  dashboard: (orgId: string) => [...queryKeys.org(orgId), "dashboard"] as const,
  projects: (orgId: string) => [...queryKeys.org(orgId), "projects"] as const,
  projectsMergeList: (orgId: string) =>
    [...queryKeys.org(orgId), "projects", "merge-list"] as const,
  projectSummary: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "summary"] as const,
  projectPartners: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "partners"] as const,
  projectPartnersMeta: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "partners-meta"] as const,
  projectExpenses: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "expenses"] as const,
  projectPayments: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "payments"] as const,
  projectVendors: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "vendors"] as const,
  projectDocuments: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "documents"] as const,
  projectActivity: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "activity"] as const,
  projectVendorLedger: (orgId: string, projectId: string, vendorId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "vendor", vendorId] as const,
  members: (orgId: string) => [...queryKeys.org(orgId), "members"] as const,
  notifications: (orgId: string) => [...queryKeys.org(orgId), "notifications"] as const,
  organization: (orgId: string) => [...queryKeys.org(orgId), "organization"] as const,

  staff: {
    all: (orgId: string) => [...queryKeys.org(orgId), "staff"] as const,
    list: (orgId: string, status?: string) =>
      [...queryKeys.org(orgId), "staff", "list", status ?? "all"] as const,
    attendance: (orgId: string, date: string) =>
      [...queryKeys.org(orgId), "staff", "attendance", date] as const,
    attendanceRange: (orgId: string, from: string, to: string, staffId?: string) =>
      [...queryKeys.org(orgId), "staff", "attendance-range", from, to, staffId ?? "all"] as const,
    payroll: (orgId: string, year: number, month: number) =>
      [...queryKeys.org(orgId), "staff", "payroll", year, month] as const,
    holidays: (orgId: string, year: number) =>
      [...queryKeys.org(orgId), "staff", "holidays", year] as const,
  },

  modules: {
    shop: {
      sales: (orgId: string) => [...queryKeys.org(orgId), "shop", "sales"] as const,
      inventory: (orgId: string) => [...queryKeys.org(orgId), "shop", "inventory"] as const,
      customers: (orgId: string) => [...queryKeys.org(orgId), "shop", "customers"] as const,
    },
    contractor: {
      boq: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "contractor", "boq", projectId] as const,
      measurements: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "contractor", "measurements", projectId] as const,
      material: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "contractor", "material", projectId] as const,
    },
    architect: {
      stages: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "architect", "stages", projectId] as const,
    },
    builder: {
      units: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "builder", "units", projectId] as const,
      bookings: (orgId: string, projectId: string) =>
        [...queryKeys.org(orgId), "builder", "bookings", projectId] as const,
    },
  },
} as const;

/** Legacy string keys → org-scoped keys for gradual migration */
export function legacyKey(orgId: string, key: string): readonly unknown[] {
  if (key === "dashboard") return queryKeys.dashboard(orgId);
  if (key === "projects") return queryKeys.projects(orgId);
  if (key === "projects:merge-list") return queryKeys.projectsMergeList(orgId);
  if (key.startsWith("project:") && key.endsWith(":summary")) {
    const id = key.split(":")[1];
    return queryKeys.projectSummary(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":partners")) {
    const id = key.split(":")[1];
    return queryKeys.projectPartners(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":partners-meta")) {
    const id = key.split(":")[1];
    return queryKeys.projectPartnersMeta(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":expenses")) {
    const id = key.split(":")[1];
    return queryKeys.projectExpenses(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":payments")) {
    const id = key.split(":")[1];
    return queryKeys.projectPayments(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":vendors")) {
    const id = key.split(":")[1];
    return queryKeys.projectVendors(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":documents")) {
    const id = key.split(":")[1];
    return queryKeys.projectDocuments(orgId, id);
  }
  if (key.startsWith("project:") && key.endsWith(":activity")) {
    const id = key.split(":")[1];
    return queryKeys.projectActivity(orgId, id);
  }
  if (key.startsWith("project:") && key.includes(":vendor:")) {
    const parts = key.split(":");
    return queryKeys.projectVendorLedger(orgId, parts[1], parts[3]);
  }
  if (key.startsWith("members:")) return queryKeys.members(orgId);
  if (key === "notifications") return queryKeys.notifications(orgId);
  return [...queryKeys.org(orgId), "legacy", key];
}

export function invalidateProjectQueries(
  queryClient: import("@tanstack/react-query").QueryClient,
  orgId: string,
  projectId?: string
) {
  if (projectId) {
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.org(orgId), "project", projectId],
    });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects(orgId) });
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "org" &&
        q.queryKey[1] === orgId &&
        q.queryKey[2] === "project",
    });
  }
}
