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
  notificationsUnread: (orgId: string) =>
    [...queryKeys.org(orgId), "notifications", "unread-count"] as const,
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
    advances: (orgId: string) => [...queryKeys.org(orgId), "staff", "advances"] as const,
    regularity: (orgId: string, days: number) =>
      [...queryKeys.org(orgId), "staff", "attendance", "regularity", days] as const,
    holidays: (orgId: string, year: number) =>
      [...queryKeys.org(orgId), "staff", "holidays", year] as const,
  },

  modules: {
    shop: {
      sales: (orgId: string) => [...queryKeys.org(orgId), "shop", "sales"] as const,
      invoices: (orgId: string) => [...queryKeys.org(orgId), "shop", "invoices"] as const,
      heldBills: (orgId: string) => [...queryKeys.org(orgId), "shop", "held-bills"] as const,
      returns: (orgId: string) => [...queryKeys.org(orgId), "shop", "returns"] as const,
      offers: (orgId: string) => [...queryKeys.org(orgId), "shop", "offers"] as const,
      topCustomers: (orgId: string, period: string) =>
        [...queryKeys.org(orgId), "shop", "top-customers", period] as const,
      dashboard: (orgId: string) => [...queryKeys.org(orgId), "shop", "dashboard"] as const,
      staffInvoices: (orgId: string, period: string, staffName: string) =>
        [...queryKeys.org(orgId), "shop", "staff-invoices", period, staffName] as const,
      inventory: (orgId: string) => [...queryKeys.org(orgId), "shop", "inventory"] as const,
      inventoryAnalytics: (orgId: string, days = 30) =>
        [...queryKeys.org(orgId), "shop", "inventory", "analytics", days] as const,
      customers: (orgId: string) => [...queryKeys.org(orgId), "shop", "customers"] as const,
      customerRegistry: (orgId: string, q = "") =>
        [...queryKeys.org(orgId), "shop", "customer-registry", q] as const,
      purchases: (orgId: string) => [...queryKeys.org(orgId), "shop", "purchases"] as const,
      suppliers: (orgId: string) => [...queryKeys.org(orgId), "shop", "suppliers"] as const,
      expenses: (orgId: string) => [...queryKeys.org(orgId), "shop", "expenses"] as const,
      expenseCategories: (orgId: string) =>
        [...queryKeys.org(orgId), "shop", "expense-categories"] as const,
      profit: (orgId: string, period: string) =>
        [...queryKeys.org(orgId), "shop", "profit", period] as const,
      activity: (orgId: string) => [...queryKeys.org(orgId), "shop", "activity"] as const,
      creditLedger: (orgId: string, creditId: string) =>
        [...queryKeys.org(orgId), "shop", "credit-ledger", creditId] as const,
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
