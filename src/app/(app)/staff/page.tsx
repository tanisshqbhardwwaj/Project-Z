"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Badge } from "@/components/ui/badge";
import { StaffAdvancePanel } from "@/components/staff/staff-advance-panel";
import {
  StaffProfileDialog,
  describeCommissionType,
  emptyStaffProfile,
  type CommissionType,
  type StaffProfileValues,
} from "@/components/staff/staff-profile-dialog";
import { Pencil, Search, UserPlus, UsersRound } from "lucide-react";
import { parseStaffAccess } from "@/lib/staff/access";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { paiseToRupees, formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { orgTodayKey } from "@/lib/date/org-day";
import {
  useStaffList,
  useAttendance,
  useAttendanceGrid,
  usePayroll,
  useMarkAttendance,
  useBulkMarkAttendance,
  useCreateStaff,
  useUpdateStaff,
  useGeneratePayroll,
  useUpdatePayroll,
  useStaffAdvances,
  useCreateStaffAdvance,
  useAttendanceRegularity,
  type AttendanceRow,
  type PayrollRow,
  type StaffMember,
  type StaffAdvanceRow,
  type AttendanceRegularityRow,
} from "@/hooks/queries/use-staff";
import { useFetch } from "@/hooks/use-fetch";
import { apiFetch } from "@/lib/api/client";
import type { AttendanceStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

type Tab = "people" | "attendance" | "payroll";

const ATTENDANCE_STATUSES: { id: AttendanceStatus; label: string }[] = [
  { id: "PRESENT", label: "Present" },
  { id: "HALF_DAY", label: "Half" },
  { id: "ABSENT", label: "Absent" },
  { id: "PAID_LEAVE", label: "Leave" },
];

const ATTENDANCE_CELL: Record<
  AttendanceStatus,
  { short: string; title: string; className: string }
> = {
  PRESENT: {
    short: "P",
    title: "Present",
    className: "bg-emerald-100 text-emerald-800",
  },
  HALF_DAY: {
    short: "H",
    title: "Half day",
    className: "bg-amber-100 text-amber-800",
  },
  ABSENT: {
    short: "A",
    title: "Absent",
    className: "bg-red-100 text-red-800",
  },
  PAID_LEAVE: {
    short: "L",
    title: "Paid leave",
    className: "bg-sky-100 text-sky-800",
  },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Owner-facing wording for the payroll lifecycle. */
const PAYROLL_STATUS: Record<
  PayrollRow["status"],
  { label: string; className: string }
> = {
  DRAFT: { label: "Pending", className: "bg-muted text-muted-foreground" },
  FINALIZED: {
    label: "Processed",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
};

function paidDayUnits(row: PayrollRow) {
  return row.presentDays + row.halfDays * 0.5 + row.paidLeaveDays;
}

type PayrollCalcSummary = {
  monthlySalary?: string;
  perDay: string;
  paidDays: number;
  daysInMonth: number;
  deductions?: string;
  total: string;
};

function payrollCalcSummary(row: PayrollRow): PayrollCalcSummary | null {
  if (!row.staff.wagePaise) return null;
  const calcPaise = BigInt(row.calculatedPaise);
  const paid = paidDayUnits(row);
  const daysInMonth = row.workingDays;

  if (row.staff.wagePeriod === "MONTHLY") {
    const wagePaise = BigInt(row.staff.wagePaise);
    const dailyPaise = wagePaise / BigInt(Math.max(daysInMonth, 1));
    const deductPaise = wagePaise - calcPaise;
    return {
      monthlySalary: formatINR(wagePaise),
      perDay: formatINR(dailyPaise),
      paidDays: paid,
      daysInMonth,
      deductions:
        deductPaise > BigInt(0) ? formatINR(deductPaise) : undefined,
      total: formatINR(calcPaise),
    };
  }

  return {
    perDay: formatINR(row.staff.wagePaise),
    paidDays: paid,
    daysInMonth,
    total: formatINR(calcPaise),
  };
}

function payrollFinalInput(row: PayrollRow, editFinal: Record<string, string>) {
  if (editFinal[row.id] !== undefined) return editFinal[row.id];
  const adj = BigInt(row.adjustmentPaise || "0");
  const paise = adj === BigInt(0) ? row.calculatedPaise : row.finalAmountPaise;
  return String(paiseToRupees(BigInt(paise)));
}

function formatWage(staff: StaffMember) {
  if (!staff.wagePaise) return "Not set";
  const suffix = staff.wagePeriod === "DAILY" ? "/ day" : "/ month";
  return `${formatINR(staff.wagePaise)}${suffix}`;
}

function parseDayKey(date: string) {
  const [y, m] = date.split("-").map(Number);
  return { year: y, month: m };
}

function RegularityTable({
  subtitle,
  rows,
  variant,
}: {
  subtitle: string;
  rows: AttendanceRegularityRow[];
  variant: "best" | "worst";
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No attendance data yet"
        className="py-6"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-2 font-medium">Staff</th>
            <th className="pb-2 pr-2 font-medium">Streak</th>
            <th className="pb-2 font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.staffId} className="border-b last:border-0">
              <td className="py-2.5 pr-2">
                <p className="font-medium leading-tight">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.roleTitle}</p>
              </td>
              <td className="py-2.5 pr-2 tabular-nums">
                <span
                  className={cn(
                    "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    variant === "best" && row.currentStreak >= 7
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {row.currentStreak}d
                </span>
              </td>
              <td className="py-2.5 tabular-nums">
                <span
                  className={cn(
                    "font-medium",
                    variant === "best" && index === 0 && "text-emerald-700",
                    variant === "worst" && row.attendanceRate < 70 && "text-red-700"
                  )}
                >
                  {row.attendanceRate}%
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {row.presentDays}/{row.periodDays} days
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function StaffHubPage() {
  const router = useRouter();
  const {
    activeBusinessType,
    enabledModules,
    role,
    timezone,
    activeOrganizationId,
  } = useAuthStore();
  const staffEnabled = isModuleEnabled(enabledModules, "staff");
  const canMark = role && hasPermission(role as OrgRole, "attendance.mark");
  const canManageStaff = role && hasPermission(role as OrgRole, "staff.manage");
  const canPayroll = role && hasPermission(role as OrgRole, "payroll.manage");
  const canViewStaffHub = role && hasPermission(role as OrgRole, "staff.view");

  useEffect(() => {
    if (role && !canViewStaffHub && hasPermission(role as OrgRole, "attendance.view_own")) {
      router.replace("/staff/me");
    }
  }, [role, router, canViewStaffHub]);

  const moduleTitle =
    activeBusinessType && staffEnabled
      ? moduleLabel("staff", activeBusinessType)
      : "Staff";

  const [tab, setTab] = useState<Tab>("attendance");
  const [date, setDate] = useState(() => orgTodayKey(timezone));
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [editFinal, setEditFinal] = useState<Record<string, string>>({});
  const [editPayrollNotes, setEditPayrollNotes] = useState<Record<string, string>>({});
  const [advanceStaffId, setAdvanceStaffId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [advanceGivenDate, setAdvanceGivenDate] = useState(() => orgTodayKey(timezone));
  const [advancePanelOpen, setAdvancePanelOpen] = useState(false);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<
    "CASH" | "UPI" | "CARD" | "BANK" | "OTHER"
  >("CASH");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<StaffMember | null>(null);
  const [profileInitial, setProfileInitial] = useState<StaffProfileValues>(() =>
    emptyStaffProfile()
  );
  const [payConfirm, setPayConfirm] = useState<{
    payrollId: string;
    staffName: string;
    amountPaise: string;
    notes: string | null;
  } | null>(null);

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const staffQuery = useStaffList(undefined, {
    withPerformance: true,
    year,
    month,
  });
  const { data: orgMembers } = useFetch(
    canManageStaff && activeOrganizationId
      ? `org:${activeOrganizationId}:members-link`
      : null,
    () =>
      apiFetch<
        Array<{
          role: string;
          user: { id: string; name: string; email: string };
        }>
      >(`/api/v1/organizations/${activeOrganizationId}/members`)
  );
  const attendanceQuery = useAttendance(date);
  const gridMonthKey = tab === "attendance" ? parseDayKey(date) : { year, month };
  const gridQuery = useAttendanceGrid(gridMonthKey.year, gridMonthKey.month);
  const regularityQuery = useAttendanceRegularity(99);
  const payrollQuery = usePayroll(year, month);
  const advancesQuery = useStaffAdvances({ status: "OPEN" });
  const createAdvanceMutation = useCreateStaffAdvance();

  const payrollRows = payrollQuery.data ?? [];
  const openAdvances = advancesQuery.data ?? [];

  const markMutation = useMarkAttendance(date);
  const bulkMutation = useBulkMarkAttendance(date);
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const generatePayrollMutation = useGeneratePayroll(year, month);
  const updatePayrollMutation = useUpdatePayroll(year, month);

  const staffList = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const activeStaffCount = staffList.filter((s) => s.status === "ACTIVE").length;
  const leftStaffCount = staffList.filter((s) => s.status === "LEFT").length;
  const commissionStaffCount = staffList.filter(
    (s) => s.commissionType && s.commissionType !== "NONE"
  ).length;
  const filteredStaff = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase();
    if (!query) return staffList;
    return staffList.filter((s) =>
      [s.name, s.phone ?? "", s.email ?? "", s.roleTitle]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [staffList, peopleSearch]);

  if (!staffEnabled) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{moduleTitle} is optional</h1>
        <p className="text-sm text-muted-foreground">
          Turn on {moduleTitle.toLowerCase()} in Manage Organization → Features.
        </p>
        <Link href="/settings/organization">
          <Button className="rounded-xl">Manage Organization</Button>
        </Link>
      </div>
    );
  }

  if (role && !canViewStaffHub) {
    return <PageLoader label="Opening your attendance..." />;
  }

  function openStaffProfile(staff: StaffMember) {
    clear();
    setProfileTarget(staff);
    const access = parseStaffAccess(staff.accessJson);
    setProfileInitial({
      name: staff.name,
      phone: staff.phone ?? "",
      email: staff.email ?? "",
      roleKey: staff.roleKey ?? "CUSTOM",
      roleTitle: staff.roleTitle,
      cashierCode: staff.cashierCode ?? "",
      wageRupees: staff.wagePaise
        ? String(paiseToRupees(BigInt(staff.wagePaise)))
        : "",
      wagePeriod: staff.wagePeriod === "DAILY" ? "DAILY" : "MONTHLY",
      paymentFrequency:
        (staff.paymentFrequency as StaffProfileValues["paymentFrequency"]) ??
        "MONTHLY",
      overtimeRateRupees: staff.overtimeRatePaise
        ? String(paiseToRupees(BigInt(staff.overtimeRatePaise)))
        : "",
      commissionType: (staff.commissionType ?? "NONE") as CommissionType,
      commissionPercent:
        staff.commissionPercent != null ? String(staff.commissionPercent) : "",
      commissionAmountRupees: staff.commissionAmountPaise
        ? String(paiseToRupees(BigInt(staff.commissionAmountPaise)))
        : "",
      joinedAt: staff.joinedAt
        ? new Date(staff.joinedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status: staff.status,
      notes: staff.notes ?? "",
      ...access,
    });
    setProfileOpen(true);
  }

  async function saveStaffProfile(values: StaffProfileValues) {
    clear();
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      roleKey: values.roleKey,
      roleTitle: values.roleTitle.trim(),
      cashierCode: values.cashierCode.trim() || null,
      wageRupees: values.wageRupees ? Number(values.wageRupees) : null,
      wagePeriod: values.wagePeriod,
      paymentFrequency: values.paymentFrequency,
      overtimeRateRupees: values.overtimeRateRupees
        ? Number(values.overtimeRateRupees)
        : null,
      commissionType: values.commissionType,
      commissionPercent:
        values.commissionType === "PERCENT"
          ? Number(values.commissionPercent)
          : null,
      commissionAmountRupees:
        values.commissionType === "FIXED_PER_SALE" ||
        values.commissionType === "FIXED_PER_ITEM" ||
        values.commissionType === "FIXED_MONTHLY"
          ? Number(values.commissionAmountRupees)
          : null,
      joinedAt: values.joinedAt || null,
      notes: values.notes.trim() || null,
      access: values.email.trim()
        ? {
            canBill: values.canBill,
            canProcessReturns: values.canProcessReturns,
            canViewOwnAttendance: values.canViewOwnAttendance,
            canViewOwnSales: values.canViewOwnSales,
          }
        : undefined,
    };

    try {
      if (profileTarget) {
        await updateStaffMutation.mutateAsync({
          id: profileTarget.id,
          ...payload,
          status: values.status,
        });
      } else {
        await createStaffMutation.mutateAsync(payload);
      }
      setProfileOpen(false);
      setProfileTarget(null);
    } catch (err) {
      applyError(err, "Could not save this profile");
    }
  }

  async function rehireStaff(staffId: string, staffName: string) {
    clear();
    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        status: "ACTIVE",
      });
      showWarning(`${staffName} is active again — attendance and payroll are enabled`);
    } catch (err) {
      applyError(err, "Failed to rehire staff");
    }
  }

  async function markStaffLeft(staffId: string, staffName: string) {
    clear();
    if (
      !window.confirm(
        `Mark ${staffName} as left? They will be removed from attendance and payroll until rehired.`
      )
    ) {
      return;
    }
    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        status: "LEFT",
      });
    } catch (err) {
      applyError(err, "Failed to update staff status");
    }
  }

  async function linkStaffLogin(staffId: string, userId: string | null) {
    clear();
    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        userId,
      });
    } catch (err) {
      applyError(err, "Failed to link login");
    }
  }

  async function submitStaffAdvance() {
    clear();
    if (!advanceStaffId || !advanceAmount) {
      showWarning("Select staff and enter amount");
      return;
    }
    try {
      await createAdvanceMutation.mutateAsync({
        staffId: advanceStaffId,
        amountRupees: Number(advanceAmount),
        notes: advanceNotes.trim() || undefined,
        givenDate: advanceGivenDate,
        paymentMethod: advancePaymentMethod,
      });
      setAdvanceAmount("");
      setAdvanceNotes("");
      setAdvanceStaffId("");
      setAdvancePanelOpen(false);
      payrollQuery.refetch();
    } catch (e) {
      applyError(e);
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{moduleTitle}</h1>
        <p className="text-sm text-muted-foreground">
          People, attendance grid, payroll with ledger link
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["attendance", "Attendance"],
            ["payroll", "Payroll"],
            ["people", "People"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "default" : "outline"}
            className="h-10 flex-1 rounded-xl"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <FormFeedback warning={warning} error={error} />

      {tab === "attendance" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
          <div className="min-w-0 space-y-5">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Mark attendance</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={date}
                    max={orgTodayKey(timezone)}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 w-auto rounded-xl"
                  />
                  {canMark && (
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={bulkMutation.isPending}
                      onClick={() =>
                        bulkMutation.mutate(
                          { status: "PRESENT" },
                          {
                            onError: (err) =>
                              applyError(err, "Could not mark all present"),
                          }
                        )
                      }
                    >
                      Mark all present
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendanceQuery.isLoading ? (
                  <PageLoader label="Loading..." />
                ) : (attendanceQuery.data ?? []).length === 0 ? (
                  <EmptyState
                    icon={UsersRound}
                    title="No active staff"
                    description="Add team members from the People tab to start marking attendance."
                    className="py-6"
                  />
                ) : (
                  (attendanceQuery.data ?? []).map(({ staff, attendance }: AttendanceRow) => (
                    <div
                      key={staff.id}
                      className="rounded-xl border p-3 lg:flex lg:items-center lg:justify-between lg:gap-3"
                    >
                      <div className="mb-2 min-w-0 lg:mb-0">
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {staff.roleTitle}
                          {staff.wagePaise
                            ? ` · ₹${paiseToRupees(BigInt(staff.wagePaise))}${
                                staff.wagePeriod === "DAILY" ? "/day" : "/mo"
                              }`
                            : " · Salary not set"}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-1 sm:max-w-md lg:max-w-none lg:ml-auto lg:shrink-0">
                        {ATTENDANCE_STATUSES.map((st) => {
                          const active = attendance?.status === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              disabled={!canMark || markMutation.isPending}
                              onClick={() =>
                                markMutation.mutate(
                                  {
                                    staffId: staff.id,
                                    status: st.id,
                                  },
                                  {
                                    onError: (err) =>
                                      applyError(err, "Could not mark attendance"),
                                  }
                                )
                              }
                              className={cn(
                                "rounded-lg border px-2 py-2 text-xs font-medium disabled:opacity-60",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border"
                              )}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    Monthly grid — {MONTHS[gridMonthKey.month - 1]} {gridMonthKey.year}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {Object.values(ATTENDANCE_CELL).map((cell) => (
                      <span
                        key={cell.title}
                        className={cn("rounded px-1.5 py-0.5 font-medium", cell.className)}
                      >
                        {cell.short} {cell.title}
                      </span>
                    ))}
                    <span className="rounded px-1.5 py-0.5">· Unmarked</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gridQuery.isLoading ? (
                  <PageLoader label="Loading grid..." />
                ) : (gridQuery.data?.rows ?? []).length === 0 ? (
                  <EmptyState
                    icon={UsersRound}
                    title="No active staff to show"
                    className="py-6"
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="min-w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="sticky left-0 bg-muted/50 p-2 text-left font-medium">
                            Name
                          </th>
                          {(gridQuery.data?.dayKeys ?? []).map((dk) => (
                            <th
                              key={dk}
                              className="p-1 text-center font-normal text-muted-foreground"
                            >
                              {dk.slice(-2)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          gridQuery.data?.rows as {
                            staff: { id: string; name: string };
                            days: {
                              date: string;
                              attendance: { status: AttendanceStatus } | null;
                            }[];
                          }[]
                        )?.map((row) => (
                          <tr key={row.staff.id} className="border-t">
                            <td className="sticky left-0 bg-background p-2 font-medium">
                              {row.staff.name}
                            </td>
                            {row.days.map((d) => {
                              const status = d.attendance?.status;
                              const cell = status ? ATTENDANCE_CELL[status] : null;
                              return (
                                <td key={d.date} className="p-0.5 text-center">
                                  <span
                                    title={cell?.title ?? "Not marked"}
                                    className={cn(
                                      "inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold",
                                      cell?.className ?? "text-muted-foreground"
                                    )}
                                  >
                                    {cell?.short ?? "·"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Most regular staff</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Last {regularityQuery.data?.days ?? 99} days · sorted by streak
                </p>
              </CardHeader>
              <CardContent>
                {regularityQuery.isLoading ? (
                  <PageLoader label="Loading stats..." />
                ) : (
                  <RegularityTable
                    subtitle="Streak = consecutive present / half / leave days without absent"
                    rows={regularityQuery.data?.mostRegular ?? []}
                    variant="best"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Least regular staff</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Lowest attendance rate in the same period
                </p>
              </CardHeader>
              <CardContent>
                {regularityQuery.isLoading ? (
                  <PageLoader label="Loading stats..." />
                ) : (
                  <RegularityTable
                    subtitle="Rate = paid days (present, half, leave) ÷ eligible days"
                    rows={regularityQuery.data?.leastRegular ?? []}
                    variant="worst"
                  />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {tab === "payroll" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Monthly payroll</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                value={year}
                onChange={(e) => {
                  setEditFinal({});
                  setYear(Number(e.target.value));
                }}
                className="h-10 w-24 rounded-xl"
                aria-label="Payroll year"
              />
              <select
                value={month}
                onChange={(e) => {
                  setEditFinal({});
                  setMonth(Number(e.target.value));
                }}
                className="h-10 rounded-xl border bg-background px-3 text-sm"
                aria-label="Payroll month"
              >
                {MONTHS.map((label, idx) => (
                  <option key={label} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
              {canPayroll && (
                <>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      clear();
                      setAdvancePanelOpen(true);
                    }}
                  >
                    Record advance
                  </Button>
                  <Button
                    className="h-10 rounded-xl"
                    disabled={generatePayrollMutation.isPending}
                    onClick={() => {
                      setEditFinal({});
                      generatePayrollMutation.mutate();
                    }}
                  >
                    Generate / refresh
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {openAdvances.length > 0 && (
              <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                <p className="font-medium">Open advances</p>
                {openAdvances.map((adv: StaffAdvanceRow) => {
                  const remaining =
                    BigInt(adv.amountPaise) - BigInt(adv.repaidPaise);
                  return (
                    <div key={adv.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {adv.staff.name} · {formatINR(adv.amountPaise)}
                        {adv.notes ? ` — ${adv.notes}` : ""}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        Due {formatINR(remaining)} · {new Date(adv.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {payrollQuery.isLoading ? (
              <PageLoader label="Loading payroll..." />
            ) : payrollRows.length === 0 ? (
              <EmptyState
                title={`No payroll for ${MONTHS[month - 1]} ${year} yet`}
                description="Generate payroll to calculate salaries from attendance."
                className="rounded-xl border border-dashed"
              >
                {canPayroll && (
                  <Button
                    className="rounded-xl"
                    disabled={generatePayrollMutation.isPending}
                    onClick={() => generatePayrollMutation.mutate()}
                  >
                    Generate payroll
                  </Button>
                )}
              </EmptyState>
            ) : (
              payrollRows.map((row: PayrollRow) => {
                const adjustmentPaise = BigInt(row.adjustmentPaise || "0");
                const summary = payrollCalcSummary(row);
                const breakdown = row.breakdown;
                const commissionPaise = BigInt(
                  breakdown?.commissionPaise ?? row.commissionPaise ?? "0"
                );
                const earningsPaise = BigInt(breakdown?.earningsPaise ?? "0");
                const deductionsPaise = BigInt(breakdown?.deductionsPaise ?? "0");
                return (
                <div key={row.id} className="space-y-3 rounded-xl border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{row.staff.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Present {row.presentDays} · Half {row.halfDays} · Absent {row.absentDays}{" "}
                        · Leave {row.paidLeaveDays}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        PAYROLL_STATUS[row.status].className
                      )}
                    >
                      {PAYROLL_STATUS[row.status].label}
                    </span>
                  </div>

                  {summary || breakdown ? (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Base salary
                          {summary
                            ? ` (${summary.paidDays} of ${summary.daysInMonth} days)`
                            : ""}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatINR(breakdown?.basePaise ?? row.basePaise ?? "0")}
                        </span>
                      </div>
                      {summary?.monthlySalary && (
                        <p className="text-xs text-muted-foreground">
                          {summary.monthlySalary}/month · {summary.perDay}/day
                          {summary.deductions
                            ? ` · ${summary.deductions} deducted for absence`
                            : ""}
                        </p>
                      )}
                      {commissionPaise > BigInt(0) ? (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Sales commission
                          </span>
                          <span className="font-medium tabular-nums">
                            + {formatINR(commissionPaise)}
                          </span>
                        </div>
                      ) : null}
                      {row.commission &&
                      BigInt(row.commission.eligibleSalesPaise) > BigInt(0) ? (
                        <p className="text-xs text-muted-foreground">
                          {row.commission.invoiceCount} invoice
                          {row.commission.invoiceCount === 1 ? "" : "s"} ·{" "}
                          {formatINR(row.commission.eligibleSalesPaise)} eligible
                          sales
                          {BigInt(row.commission.returnedValuePaise) > BigInt(0)
                            ? ` · ${formatINR(row.commission.returnedValuePaise)} returned, commission reduced by ${formatINR(row.commission.returnAdjustmentPaise)}`
                            : ""}
                        </p>
                      ) : null}
                      {earningsPaise > BigInt(0) ? (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Bonus / incentives
                          </span>
                          <span className="font-medium tabular-nums">
                            + {formatINR(earningsPaise)}
                          </span>
                        </div>
                      ) : null}
                      {deductionsPaise > BigInt(0) ? (
                        <div className="flex justify-between gap-4 text-amber-800">
                          <span>Deductions</span>
                          <span className="font-medium tabular-nums">
                            − {formatINR(deductionsPaise)}
                          </span>
                        </div>
                      ) : null}
                      {row.advanceDeductionPaise &&
                        BigInt(row.advanceDeductionPaise) > BigInt(0) && (
                          <div className="flex justify-between gap-4 text-amber-800">
                            <span>Advance recovery</span>
                            <span className="font-medium tabular-nums">
                              − {formatINR(row.advanceDeductionPaise)}
                            </span>
                          </div>
                        )}
                      {row.openAdvances && row.openAdvances.length > 0 && (
                        <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                          {row.openAdvances.map((adv) => (
                            <p key={adv.id}>
                              Advance {formatINR(adv.amountPaise)}
                              {adv.notes ? ` — ${adv.notes}` : ""} (
                              {new Date(adv.createdAt).toLocaleDateString("en-IN")})
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 flex justify-between gap-4 border-t pt-2 text-base font-semibold">
                        <span>Net pay</span>
                        <span className="tabular-nums">
                          {formatINR(row.calculatedPaise)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Set a salary or commission on the Team tab first
                    </p>
                  )}

                  <div className="space-y-1">
                      {adjustmentPaise !== BigInt(0) && (
                        <p className="text-xs text-amber-700">
                          Manual adjustment {formatINR(adjustmentPaise)} → Final{" "}
                          {formatINR(row.finalAmountPaise)}
                        </p>
                      )}
                      {row.driftCalculatedPaise && (
                        <p className="text-xs text-amber-700">
                          Attendance changed after payment — reopen to recalc (would be{" "}
                          {formatINR(row.driftCalculatedPaise)})
                        </p>
                      )}
                  </div>
                  {canPayroll && row.status !== "PAID" && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Payment note (optional)
                        </Label>
                        <Input
                          value={
                            editPayrollNotes[row.id] !== undefined
                              ? editPayrollNotes[row.id]
                              : row.notes ?? ""
                          }
                          onChange={(e) =>
                            setEditPayrollNotes((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="h-10 rounded-xl"
                          placeholder="Reason for adjustment or payment details"
                        />
                      </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Final amount (₹) — edit to add bonus/deduction
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={payrollFinalInput(row, editFinal)}
                          onChange={(e) =>
                            setEditFinal((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          className="h-10 w-36 rounded-xl"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl"
                        onClick={() =>
                          updatePayrollMutation.mutate({
                            payrollId: row.id,
                            finalAmountRupees: Number(payrollFinalInput(row, editFinal)),
                            notes:
                              editPayrollNotes[row.id] !== undefined
                                ? editPayrollNotes[row.id]
                                : row.notes,
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl"
                        onClick={() =>
                          updatePayrollMutation.mutate({
                            payrollId: row.id,
                            status: "FINALIZED",
                          })
                        }
                      >
                        Mark processed
                      </Button>
                      <Button
                        className="h-10 rounded-xl"
                        onClick={() =>
                          setPayConfirm({
                            payrollId: row.id,
                            staffName: row.staff.name,
                            amountPaise: row.finalAmountPaise,
                            notes:
                              editPayrollNotes[row.id] !== undefined
                                ? editPayrollNotes[row.id]
                                : row.notes,
                          })
                        }
                      >
                        Mark paid
                      </Button>
                    </div>
                    </div>
                  )}
                  {row.status === "PAID" && canPayroll && (
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() =>
                        updatePayrollMutation.mutate({
                          payrollId: row.id,
                          status: "DRAFT",
                        })
                      }
                    >
                      Reopen draft
                    </Button>
                  )}
                  {row.status === "PAID" && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        Paid {formatINR(row.finalAmountPaise)} · posted to shop expenses
                      </p>
                      {row.notes && (
                        <p className="text-xs text-muted-foreground">Note: {row.notes}</p>
                      )}
                      <Link href={`/staff/payslip/${row.id}`}>
                        <Button variant="link" className="h-auto p-0">
                          Payslip
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {tab === "people" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Team</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeStaffCount} active · {leftStaffCount} left ·{" "}
                {commissionStaffCount} on commission
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search name, phone, role…"
                  className="h-10 w-full rounded-xl pl-9 sm:w-56"
                />
              </div>
              {canManageStaff && (
                <Button
                  className="h-10 rounded-xl"
                  onClick={() => {
                    setProfileTarget(null);
                    setProfileInitial(emptyStaffProfile());
                    setProfileOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add {moduleTitle.toLowerCase()}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {staffQuery.isLoading ? (
              <PageLoader label="Loading team..." />
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title={
                  (staffQuery.data ?? []).length === 0
                    ? "No team members yet"
                    : "No one matches that search"
                }
                description={
                  (staffQuery.data ?? []).length === 0
                    ? "Add your first team member to start marking attendance, running payroll and tracking sales commission."
                    : "Try a different name, phone or role."
                }
                className="rounded-xl border border-dashed"
              />
            ) : (
              <div className="space-y-3">
                {filteredStaff.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border p-3 sm:p-4",
                      s.status === "LEFT" && "bg-muted/30"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.roleTitle}
                          {s.joinedAt
                            ? ` · joined ${new Date(s.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.commissionType !== "NONE" ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full text-[10px]"
                          >
                            {describeCommissionType(
                              s.commissionType,
                              s.commissionPercent,
                              s.commissionAmountPaise
                            )}
                          </Badge>
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            s.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {s.status === "ACTIVE" ? "Active" : "Left"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p
                          className={cn(
                            "mt-0.5 font-medium",
                            !s.wagePaise && "text-amber-700"
                          )}
                        >
                          {formatWage(s)}
                        </p>
                        {s.paymentFrequency ? (
                          <p className="text-[11px] text-muted-foreground">
                            Paid {s.paymentFrequency.toLowerCase()}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="mt-0.5">{s.phone ?? "—"}</p>
                        {s.email ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {s.email}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Sales this month
                        </p>
                        {s.performance ? (
                          <>
                            <p className="mt-0.5 font-medium tabular-nums">
                              {formatINR(s.performance.eligibleSalesPaise)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {s.performance.invoiceCount} invoice
                              {s.performance.invoiceCount === 1 ? "" : "s"}
                              {BigInt(s.performance.commissionPaise) > BigInt(0)
                                ? ` · commission ${formatINR(s.performance.commissionPaise)}`
                                : ""}
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-muted-foreground">—</p>
                        )}
                      </div>
                    </div>

                    {canManageStaff && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">
                            Login link
                          </p>
                          <select
                            value={s.userId ?? ""}
                            disabled={s.status === "LEFT"}
                            onChange={(e) =>
                              linkStaffLogin(
                                s.id,
                                e.target.value ? e.target.value : null
                              )
                            }
                            className="h-9 w-full rounded-lg border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">No login</option>
                            {(orgMembers ?? []).map((m) => (
                              <option key={m.user.id} value={m.user.id}>
                                {m.user.name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openStaffProfile(s)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit profile
                          </Button>
                          {s.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => markStaffLeft(s.id, s.name)}
                            >
                              Mark left
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-lg"
                              disabled={updateStaffMutation.isPending}
                              onClick={() => rehireStaff(s.id, s.name)}
                            >
                              Rehire
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paying salary moves money, so confirm before it posts an expense. */}
      <Dialog
        open={!!payConfirm}
        onOpenChange={(open) => !open && setPayConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay {payConfirm?.staffName}?</DialogTitle>
            <DialogDescription>
              {payConfirm
                ? `${formatINR(payConfirm.amountPaise)} will be recorded as paid for ${MONTHS[month - 1]} ${year}, posted to shop expenses, and any open advance will be recovered.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setPayConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={updatePayrollMutation.isPending}
              onClick={() => {
                if (!payConfirm) return;
                updatePayrollMutation.mutate({
                  payrollId: payConfirm.payrollId,
                  status: "PAID",
                  notes: payConfirm.notes,
                });
                setPayConfirm(null);
              }}
            >
              {updatePayrollMutation.isPending ? "Saving…" : "Confirm payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StaffProfileDialog
        key={profileTarget?.id ?? "new-staff"}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title={profileTarget ? `Edit ${profileTarget.name}` : `Add ${moduleTitle.toLowerCase()}`}
        initial={profileInitial}
        submitting={
          createStaffMutation.isPending || updateStaffMutation.isPending
        }
        errorMessage={error}
        onSubmit={saveStaffProfile}
        showAccessToggles={Boolean(canManageStaff)}
      />

      {canPayroll && (
        <StaffAdvancePanel
          open={advancePanelOpen}
          onClose={() => setAdvancePanelOpen(false)}
          staffList={(staffQuery.data ?? []).filter((s) => s.status === "ACTIVE")}
          openAdvances={openAdvances}
          advanceStaffId={advanceStaffId}
          onAdvanceStaffIdChange={setAdvanceStaffId}
          advanceAmount={advanceAmount}
          onAdvanceAmountChange={setAdvanceAmount}
          advanceGivenDate={advanceGivenDate}
          onAdvanceGivenDateChange={setAdvanceGivenDate}
          advanceNotes={advanceNotes}
          onAdvanceNotesChange={setAdvanceNotes}
          advancePaymentMethod={advancePaymentMethod}
          onAdvancePaymentMethodChange={setAdvancePaymentMethod}
          onSubmit={submitStaffAdvance}
          submitting={createAdvanceMutation.isPending}
          warning={warning}
          error={error}
        />
      )}
    </div>
  );
}
