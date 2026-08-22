"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { orgTodayKey } from "@/lib/date/org-day";
import type { AttendanceStatus } from "@prisma/client";

export type StaffMember = {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  roleTitle: string;
  wagePaise: string | null;
  wagePeriod: string | null;
  overtimeRatePaise: string | null;
  status: "ACTIVE" | "LEFT";
  joinedAt: string | null;
};

export type AttendanceRow = {
  staff: StaffMember;
  attendance: {
    id: string;
    status: AttendanceStatus;
    overtimeHours: number;
    notes: string | null;
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
  };
  lines?: { id: string; type: string; label: string; amountPaise: string }[];
};

function useOrgId() {
  return useAuthStore((s) => s.activeOrganizationId);
}

export function useStaffList(status?: "ACTIVE" | "LEFT") {
  const orgId = useOrgId();
  return useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, status) : ["disabled"],
    queryFn: () =>
      apiFetch<StaffMember[]>(
        `/api/v1/staff${status ? `?status=${status}` : ""}`
      ),
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
      }
    },
  });
}

export function staffTodayDate() {
  return orgTodayKey();
}
