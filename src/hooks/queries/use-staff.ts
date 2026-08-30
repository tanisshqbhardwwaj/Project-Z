"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { orgTodayKey } from "@/lib/date/org-day";
import type { AttendanceStatus } from "@prisma/client";

export type StaffCommissionType =
  | "NONE"
  | "PERCENT"
  | "FIXED_PER_SALE"
  | "FIXED_PER_ITEM"
  | "FIXED_MONTHLY";

export type StaffMember = {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  roleKey: string | null;
  roleTitle: string;
  wagePaise: string | null;
  wagePeriod: string | null;
  paymentFrequency: string | null;
  overtimeRatePaise: string | null;
  commissionType: StaffCommissionType;
  commissionPercent: number | null;
  commissionAmountPaise: string | null;
  accessJson?: unknown;
  cashierCode?: string | null;
  status: "ACTIVE" | "LEFT";
  joinedAt: string | null;
  notes: string | null;
  /** Present when the list is fetched with `withPerformance=1`. */
  performance?: {
    invoiceCount: number;
    grossSalesPaise: string;
    returnedValuePaise: string;
    eligibleSalesPaise: string;
    commissionPaise: string;
  } | null;
};

export type AttendanceRow = {
  staff: StaffMember;
  attendance: {
    id: string;
    status: AttendanceStatus;
    overtimeHours: number;
    notes: string | null;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    geoVerified?: boolean | null;
  } | null;
};

export type PayrollRow = {
  id: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  workingDays: number;
  overtimeHours: number;
  basePaise: string;
  commissionPaise: string;
  commissionSalesPaise: string;
  calculatedPaise: string;
  adjustmentPaise: string;
  finalAmountPaise: string;
  driftCalculatedPaise: string | null;
  status: "DRAFT" | "FINALIZED" | "PAID";
  notes: string | null;
  staff: {
    id: string;
    name: string;
    roleTitle: string;
    wagePaise: string | null;
    wagePeriod: string | null;
    commissionType?: StaffCommissionType;
    commissionPercent?: number | null;
    commissionAmountPaise?: string | null;
  };
  lines?: { id: string; type: string; label: string; amountPaise: string }[];
  openAdvances?: StaffAdvanceRow[];
  advanceDeductionPaise?: string;
  /** Server-computed net-pay breakdown; the UI never re-derives these. */
  breakdown?: {
    basePaise: string;
    commissionPaise: string;
    commissionSalesPaise: string;
    earningsPaise: string;
    deductionsPaise: string;
    advanceDeductionPaise: string;
    calculatedPaise: string;
    adjustmentPaise: string;
    netPaise: string;
  };
  commission?: {
    invoiceCount: number;
    grossSalesPaise: string;
    returnedValuePaise: string;
    eligibleSalesPaise: string;
    commissionPaise: string;
    returnAdjustmentPaise: string;
  } | null;
};

export type StaffAdvanceRow = {
  id: string;
  staffId: string;
  amountPaise: string;
  repaidPaise: string;
  status: "OPEN" | "CLOSED";
  notes: string | null;
  createdAt: string;
  staff: { id: string; name: string; roleTitle: string };
  createdBy: { name: string };
};

export type AttendanceRegularityRow = {
  staffId: string;
  name: string;
  roleTitle: string;
  currentStreak: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  unmarkedDays: number;
  attendanceRate: number;
  periodDays: number;
};

export type AttendanceRegularityStats = {
  days: number;
  from: string;
  to: string;
  mostRegular: AttendanceRegularityRow[];
  leastRegular: AttendanceRegularityRow[];
  all: AttendanceRegularityRow[];
};

function useOrgId() {
  return useAuthStore((s) => s.activeOrganizationId);
}

export function useStaffList(
  status?: "ACTIVE" | "LEFT",
  options?: { withPerformance?: boolean; year?: number; month?: number }
) {
  const orgId = useOrgId();
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (options?.withPerformance) {
    params.set("withPerformance", "1");
    if (options.year) params.set("year", String(options.year));
    if (options.month) params.set("month", String(options.month));
  }
  const query = params.toString();
  return useQuery({
    queryKey: orgId
      ? [...queryKeys.staff.list(orgId, status), query]
      : ["disabled"],
    queryFn: () => apiFetch<StaffMember[]>(`/api/v1/staff${query ? `?${query}` : ""}`),
    enabled: !!orgId,
  });
}

export function useAttendance(date: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: orgId ? queryKeys.staff.attendance(orgId, date) : ["disabled"],
    queryFn: () =>
      apiFetch<AttendanceRow[]>(`/api/v1/staff/attendance?date=${date}`),
    enabled: !!orgId && !!date,
  });
}

export function useAttendanceGrid(year: number, month: number) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: orgId
      ? [...queryKeys.staff.all(orgId), "grid", year, month]
      : ["disabled"],
    queryFn: () =>
      apiFetch<{ dayKeys: string[]; rows: unknown[] }>(
        `/api/v1/staff/attendance?year=${year}&month=${month}`
      ),
    enabled: !!orgId,
  });
}

const REGULARITY_DAYS = 99;

export function useAttendanceRegularity(days = REGULARITY_DAYS) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: orgId ? queryKeys.staff.regularity(orgId, days) : ["disabled"],
    queryFn: () =>
      apiFetch<AttendanceRegularityStats>(
        `/api/v1/staff/attendance/regularity?days=${days}`
      ),
    enabled: !!orgId,
  });
}

export function usePayroll(year: number, month: number) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: orgId ? queryKeys.staff.payroll(orgId, year, month) : ["disabled"],
    queryFn: () =>
      apiFetch<PayrollRow[]>(
        `/api/v1/staff/payroll?year=${year}&month=${month}`
      ),
    enabled: !!orgId,
  });
}

export function useMarkAttendance(date: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const attendanceKey = orgId ? queryKeys.staff.attendance(orgId, date) : null;

  return useMutation({
    mutationFn: (body: {
      staffId: string;
      status: AttendanceStatus;
      overtimeHours?: number;
    }) =>
      apiFetch("/api/v1/staff/attendance", {
        method: "POST",
        body: JSON.stringify({ ...body, date }),
      }),
    onMutate: async (vars) => {
      if (!attendanceKey) return;
      await qc.cancelQueries({ queryKey: attendanceKey });
      const prev = qc.getQueryData<AttendanceRow[]>(attendanceKey);
      qc.setQueryData<AttendanceRow[]>(attendanceKey, (old) =>
        old?.map((row) =>
          row.staff.id === vars.staffId
            ? {
                ...row,
                attendance: {
                  id: row.attendance?.id ?? "optimistic",
                  status: vars.status,
                  overtimeHours: vars.overtimeHours ?? 0,
                  notes: row.attendance?.notes ?? null,
                },
              }
            : row
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (attendanceKey && ctx?.prev) qc.setQueryData(attendanceKey, ctx.prev);
    },
    onSettled: () => {
      if (!orgId) return;
      if (attendanceKey) qc.invalidateQueries({ queryKey: attendanceKey });
      qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function useBulkMarkAttendance(date: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: AttendanceStatus; staffIds?: string[] }) =>
      apiFetch("/api/v1/staff/attendance", {
        method: "POST",
        body: JSON.stringify({ ...body, date, bulk: true }),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.staff.attendance(orgId, date) });
        qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
      }
    },
  });
}

export function useCreateStaff() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/staff", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function useUpdateStaff() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/v1/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function useGeneratePayroll(year: number, month: number) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/staff/payroll", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.staff.payroll(orgId, year, month) });
      }
    },
  });
}

export function useUpdatePayroll(year: number, month: number) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/staff/payroll", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.staff.payroll(orgId, year, month) });
        qc.invalidateQueries({ queryKey: queryKeys.staff.advances(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.expenses(orgId) });
      }
    },
  });
}

export function useStaffAdvances(options?: { staffId?: string; status?: "OPEN" | "CLOSED" }) {
  const orgId = useOrgId();
  const params = new URLSearchParams();
  if (options?.staffId) params.set("staffId", options.staffId);
  if (options?.status) params.set("status", options.status);
  const qs = params.toString();
  return useQuery({
    queryKey: orgId
      ? [...queryKeys.staff.advances(orgId), options?.staffId ?? "all", options?.status ?? "all"]
      : ["disabled"],
    queryFn: () =>
      apiFetch<StaffAdvanceRow[]>(`/api/v1/staff/advances${qs ? `?${qs}` : ""}`),
    enabled: !!orgId,
  });
}

export function useCreateStaffAdvance() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      staffId: string;
      amountRupees: number;
      notes?: string;
      givenDate?: string;
      paymentMethod?: string;
    }) =>
      apiFetch("/api/v1/staff/advances", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.staff.advances(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.expenses(orgId) });
      }
    },
  });
}

export type AttendanceCheckInRow = {
  id: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  geoVerified: boolean | null;
};

async function attendanceGeoPayload() {
  const { readClientGeo } = await import("@/lib/staff/attendance-geo-client");
  const geo = await readClientGeo();
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

export function useSelfAttendanceCheckIn() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: "check_in" | "check_out") => {
      const geo = action === "check_in" ? await attendanceGeoPayload() : {};
      return apiFetch<AttendanceCheckInRow>("/api/v1/staff/me/attendance", {
        method: "POST",
        body: JSON.stringify({ action, ...geo }),
      });
    },
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: [...queryKeys.org(orgId), "staff", "me", "attendance"] });
        qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
      }
    },
  });
}

export function useStaffCheckIn(date: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const attendanceKey = orgId ? queryKeys.staff.attendance(orgId, date) : null;
  return useMutation({
    mutationFn: async (staffId: string) => {
      const geo = await attendanceGeoPayload();
      return apiFetch<AttendanceCheckInRow>("/api/v1/staff/attendance", {
        method: "POST",
        body: JSON.stringify({
          action: "check_in",
          staffId,
          method: "GEO",
          ...geo,
        }),
      });
    },
    onSuccess: () => {
      if (attendanceKey) qc.invalidateQueries({ queryKey: attendanceKey });
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function useStaffCheckOut(date: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const attendanceKey = orgId ? queryKeys.staff.attendance(orgId, date) : null;
  return useMutation({
    mutationFn: (staffId: string) =>
      apiFetch<AttendanceCheckInRow>("/api/v1/staff/attendance", {
        method: "POST",
        body: JSON.stringify({
          action: "check_out",
          staffId,
          method: "GEO",
        }),
      }),
    onSuccess: () => {
      if (attendanceKey) qc.invalidateQueries({ queryKey: attendanceKey });
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function usePinCheckIn(date: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const attendanceKey = orgId ? queryKeys.staff.attendance(orgId, date) : null;
  return useMutation({
    mutationFn: async (pin: string) => {
      const geo = await attendanceGeoPayload();
      return apiFetch<AttendanceCheckInRow>("/api/v1/staff/attendance", {
        method: "POST",
        body: JSON.stringify({
          action: "pin_check_in",
          pin,
          ...geo,
        }),
      });
    },
    onSuccess: () => {
      if (attendanceKey) qc.invalidateQueries({ queryKey: attendanceKey });
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function useSetAttendancePin() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, pin }: { staffId: string; pin: string }) =>
      apiFetch(`/api/v1/staff/${staffId}/attendance-pin`, {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
    },
  });
}

export function staffTodayDate() {
  return orgTodayKey();
}
