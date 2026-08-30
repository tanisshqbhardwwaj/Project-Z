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
  projectInvoices: (orgId: string, projectId: string) =>
    [...queryKeys.org(orgId), "project", projectId, "invoices"] as const,
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
      sales: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "sales", branchId ?? "default"] as const,
      invoices: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "invoices", branchId ?? "default"] as const,
      heldBills: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "held-bills", branchId ?? "default"] as const,
      returns: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "returns", branchId ?? "default"] as const,
      offers: (orgId: string) => [...queryKeys.org(orgId), "shop", "offers"] as const,
      topCustomers: (orgId: string, period: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "top-customers", period, branchId ?? "default"] as const,
      dashboard: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "dashboard", branchId ?? "default"] as const,
      staffInvoices: (orgId: string, period: string, staffName: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "staff-invoices", period, staffName, branchId ?? "default"] as const,
      inventory: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "inventory", branchId ?? "default"] as const,
      inventoryAnalytics: (orgId: string, days = 30, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "inventory", "analytics", days, branchId ?? "default"] as const,
      customers: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "customers", branchId ?? "default"] as const,
      customerRegistry: (orgId: string, q = "", branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "customer-registry", q, branchId ?? "default"] as const,
      purchases: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "purchases", branchId ?? "default"] as const,
      suppliers: (orgId: string) => [...queryKeys.org(orgId), "shop", "suppliers"] as const,
      expenses: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "expenses", branchId ?? "default"] as const,
      expenseCategories: (orgId: string) =>
        [...queryKeys.org(orgId), "shop", "expense-categories"] as const,
      profit: (orgId: string, period: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "profit", period, branchId ?? "default"] as const,
      cashCounts: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "cash-counts", branchId ?? "default"] as const,
      cashCountHistory: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "cash-counts", "history", branchId ?? "default"] as const,
      paymentReminders: (orgId: string) =>
        [...queryKeys.org(orgId), "shop", "payment-reminders"] as const,
      activity: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "shop", "activity", branchId ?? "default"] as const,
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
    service: {
      dashboard: (orgId: string) => [...queryKeys.org(orgId), "service", "dashboard"] as const,
      appointments: (orgId: string) => [...queryKeys.org(orgId), "service", "appointments"] as const,
      appointment: (orgId: string, id: string) =>
        [...queryKeys.org(orgId), "service", "appointments", id] as const,
      calendar: (orgId: string, range: string) =>
        [...queryKeys.org(orgId), "service", "calendar", range] as const,
      packages: (orgId: string) => [...queryKeys.org(orgId), "service", "packages"] as const,
      package: (orgId: string, id: string) =>
        [...queryKeys.org(orgId), "service", "packages", id] as const,
      contracts: (orgId: string) => [...queryKeys.org(orgId), "service", "contracts"] as const,
      contract: (orgId: string, id: string) =>
        [...queryKeys.org(orgId), "service", "contracts", id] as const,
      commissions: (orgId: string, period: string) =>
        [...queryKeys.org(orgId), "service", "commissions", period] as const,
      customer: (orgId: string, customerId: string) =>
        [...queryKeys.org(orgId), "service", "customers", customerId] as const,
    },
    deliveries: (orgId: string) => [...queryKeys.org(orgId), "deliveries"] as const,
    restaurant: {
      tables: (orgId: string, branchId?: string | null) =>
        [...queryKeys.org(orgId), "restaurant", "tables", branchId ?? "default"] as const,
      kot: (orgId: string) => [...queryKeys.org(orgId), "restaurant", "kot"] as const,
    },
    channels: (orgId: string) => [...queryKeys.org(orgId), "shop", "channels"] as const,
    payouts: (orgId: string) => [...queryKeys.org(orgId), "shop", "payouts"] as const,
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
  if (key.startsWith("project:") && key.endsWith(":invoices")) {
    const id = key.split(":")[1];
    return queryKeys.projectInvoices(orgId, id);
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
