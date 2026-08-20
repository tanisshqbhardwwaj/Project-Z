"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
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
  type AttendanceRow,
  type PayrollRow,
  type StaffMember,
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
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editWageRupees, setEditWageRupees] = useState("");
  const [editWagePeriod, setEditWagePeriod] = useState<"DAILY" | "MONTHLY">("MONTHLY");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const staffQuery = useStaffList();
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
  const payrollQuery = usePayroll(year, month);

  const payrollRows = payrollQuery.data ?? [];

  const markMutation = useMarkAttendance(date);
  const bulkMutation = useBulkMarkAttendance(date);
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const generatePayrollMutation = useGeneratePayroll(year, month);
  const updatePayrollMutation = useUpdatePayroll(year, month);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleTitle, setRoleTitle] = useState("Helper");
  const [wageRupees, setWageRupees] = useState("");
  const [wagePeriod, setWagePeriod] = useState<"DAILY" | "MONTHLY">("MONTHLY");

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

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!name.trim()) return showWarning("Name is required");
    if (!wageRupees || Number(wageRupees) <= 0) {
      return showWarning("Salary is required for payroll");
    }
    try {
      await createStaffMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        roleTitle: roleTitle.trim(),
        wageRupees: Number(wageRupees),
        wagePeriod,
      });
      setName("");
      setPhone("");
      setWageRupees("");
      setRoleTitle("Helper");
    } catch (err) {
      applyError(err, "Failed to add staff");
    }
  }

  function startEditWage(staff: StaffMember) {
    setEditingStaffId(staff.id);
    setEditWageRupees(
      staff.wagePaise ? String(paiseToRupees(BigInt(staff.wagePaise))) : ""
    );
    setEditWagePeriod(
      staff.wagePeriod === "DAILY" ? "DAILY" : "MONTHLY"
    );
  }

  async function saveWage(staffId: string) {
    clear();
    if (!editWageRupees || Number(editWageRupees) <= 0) {
      return showWarning("Enter a valid salary amount");
    }
    try {
      await updateStaffMutation.mutateAsync({
        id: staffId,
        wageRupees: Number(editWageRupees),
        wagePeriod: editWagePeriod,
      });
      setEditingStaffId(null);
    } catch (err) {
      applyError(err, "Failed to update salary");
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

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
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
          <CardContent className="space-y-4">
            {attendanceQuery.isLoading ? (
              <PageLoader label="Loading..." />
            ) : (attendanceQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active staff.</p>
            ) : (
              (attendanceQuery.data ?? []).map(({ staff, attendance }: AttendanceRow) => (
                <div
                  key={staff.id}
                  className="rounded-xl border p-3 sm:flex sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="mb-2 min-w-0 sm:mb-0">
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
                  <div className="grid grid-cols-4 gap-1">
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

            <div className="border-t pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Monthly grid — {MONTHS[gridMonthKey.month - 1]} {gridMonthKey.year}
                </p>
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
              {gridQuery.isLoading ? (
                <PageLoader label="Loading grid..." />
              ) : (gridQuery.data?.rows ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active staff to show.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="sticky left-0 bg-muted/50 p-2 text-left font-medium">
                          Name
                        </th>
                        {(gridQuery.data?.dayKeys ?? []).map((dk) => (
                          <th key={dk} className="p-1 text-center font-normal text-muted-foreground">
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
            </div>
          </CardContent>
        </Card>
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
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {payrollQuery.isLoading ? (
              <PageLoader label="Loading payroll..." />
            ) : payrollRows.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No payroll for {MONTHS[month - 1]} {year} yet.
                </p>
                {canPayroll && (
                  <Button
                    className="rounded-xl"
                    disabled={generatePayrollMutation.isPending}
                    onClick={() => generatePayrollMutation.mutate()}
                  >
                    Generate payroll
                  </Button>
                )}
              </div>
            ) : (
              payrollRows.map((row: PayrollRow) => {
                const adjustmentPaise = BigInt(row.adjustmentPaise || "0");
                const summary = payrollCalcSummary(row);
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {row.status}
                    </span>
                  </div>

                  {summary ? (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                      {summary.monthlySalary && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Monthly salary</span>
                          <span className="font-medium tabular-nums">{summary.monthlySalary}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Per day</span>
                        <span className="font-medium tabular-nums">{summary.perDay}/day</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Paid days</span>
                        <span className="font-medium tabular-nums">
                          {summary.paidDays} of {summary.daysInMonth}
                        </span>
                      </div>
                      {summary.deductions && (
                        <div className="flex justify-between gap-4 text-amber-800">
                          <span>Deductions (absent / half)</span>
                          <span className="font-medium tabular-nums">− {summary.deductions}</span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground">
                          {summary.perDay}/day × {summary.paidDays} days
                          {summary.deductions ? ` − ${summary.deductions}` : ""}
                        </p>
                        <div className="mt-1 flex justify-between gap-4 font-semibold">
                          <span>Total</span>
                          <span className="tabular-nums">{summary.total}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">Set salary on People tab first</p>
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
                    <div className="flex flex-wrap items-end gap-2">
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
                        Finalize
                      </Button>
                      <Button
                        className="h-10 rounded-xl"
                        onClick={() =>
                          updatePayrollMutation.mutate({
                            payrollId: row.id,
                            status: "PAID",
                          })
                        }
                      >
                        Mark paid
                      </Button>
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
                    <div className="flex gap-2">
                      <p className="text-sm font-medium">
                        Paid ₹{paiseToRupees(BigInt(row.finalAmountPaise))}
                      </p>
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
        <>
          {canManageStaff && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Add {moduleTitle.toLowerCase()}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addStaff} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Salary (₹)</Label>
                      <Input
                        type="number"
                        min={1}
                        step="0.01"
                        value={wageRupees}
                        onChange={(e) => setWageRupees(e.target.value)}
                        className="h-12 rounded-xl"
                        placeholder="15000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pay period</Label>
                      <select
                        value={wagePeriod}
                        onChange={(e) =>
                          setWagePeriod(e.target.value as "DAILY" | "MONTHLY")
                        }
                        className="h-12 w-full rounded-xl border bg-background px-3"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="DAILY">Daily</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl"
                    disabled={createStaffMutation.isPending}
                  >
                    {createStaffMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Team</CardTitle>
            </CardHeader>
            <CardContent>
              {staffQuery.isLoading ? (
                <PageLoader label="Loading..." />
              ) : (staffQuery.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No one yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Name</th>
                        <th className="py-2 pr-3 font-medium">Role</th>
                        <th className="py-2 pr-3 font-medium">Salary</th>
                        <th className="py-2 pr-3 font-medium">Phone</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        {canManageStaff && (
                          <th className="py-2 pr-3 font-medium">Login</th>
                        )}
                        {canManageStaff && (
                          <th className="py-2 font-medium">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(staffQuery.data ?? []).map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-3 pr-3 font-medium">{s.name}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{s.roleTitle}</td>
                          <td className="py-3 pr-3">
                            {editingStaffId === s.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={editWageRupees}
                                  onChange={(e) => setEditWageRupees(e.target.value)}
                                  className="h-9 w-24 rounded-lg"
                                />
                                <select
                                  value={editWagePeriod}
                                  onChange={(e) =>
                                    setEditWagePeriod(
                                      e.target.value as "DAILY" | "MONTHLY"
                                    )
                                  }
                                  className="h-9 rounded-lg border bg-background px-2 text-xs"
                                >
                                  <option value="MONTHLY">Monthly</option>
                                  <option value="DAILY">Daily</option>
                                </select>
                                <Button
                                  size="sm"
                                  className="h-9 rounded-lg"
                                  onClick={() => saveWage(s.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 rounded-lg"
                                  onClick={() => setEditingStaffId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span
                                className={cn(
                                  !s.wagePaise && "text-amber-700"
                                )}
                              >
                                {formatWage(s)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">
                            {s.phone ?? "—"}
                          </td>
                          <td className="py-3 pr-3">{s.status}</td>
                          {canManageStaff && (
                            <td className="py-3 pr-3">
                              <select
                                value={s.userId ?? ""}
                                onChange={(e) =>
                                  linkStaffLogin(
                                    s.id,
                                    e.target.value ? e.target.value : null
                                  )
                                }
                                className="h-9 max-w-[180px] rounded-lg border bg-background px-2 text-xs"
                              >
                                <option value="">No login</option>
                                {(orgMembers ?? []).map((m) => (
                                  <option key={m.user.id} value={m.user.id}>
                                    {m.user.name} ({m.role})
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {canManageStaff && (
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                {s.status === "ACTIVE" && editingStaffId !== s.id && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg"
                                      onClick={() => startEditWage(s)}
                                    >
                                      Edit salary
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg"
                                      onClick={() =>
                                        updateStaffMutation.mutate({
                                          id: s.id,
                                          status: "LEFT",
                                        })
                                      }
                                    >
                                      Mark left
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
