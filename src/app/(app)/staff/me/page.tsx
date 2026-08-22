"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

type MeStaff = {
  id: string;
  name: string;
  roleTitle: string;
};

type DayRow = {
  date: string;
  status: AttendanceStatus | null;
  overtimeHours: number | null;
  notes: string | null;
};

type AttendancePayload = {
  staff: MeStaff;
  year: number;
  month: number;
  days: DayRow[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CELL: Record<
  AttendanceStatus,
  { short: string; title: string; className: string }
> = {
  PRESENT: { short: "P", title: "Present", className: "bg-emerald-100 text-emerald-800" },
  HALF_DAY: { short: "H", title: "Half day", className: "bg-amber-100 text-amber-800" },
  ABSENT: { short: "A", title: "Absent", className: "bg-red-100 text-red-800" },
  PAID_LEAVE: { short: "L", title: "Paid leave", className: "bg-sky-100 text-sky-800" },
};

export default function MyAttendancePage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const meQuery = useQuery({
    queryKey: orgId ? [...queryKeys.org(orgId), "staff", "me"] : ["disabled"],
    queryFn: () => apiFetch<MeStaff>("/api/v1/staff/me"),
    enabled: !!orgId,
  });

  const attendanceQuery = useQuery({
    queryKey: orgId
      ? [...queryKeys.org(orgId), "staff", "me", "attendance", year, month]
      : ["disabled"],
    queryFn: () =>
      apiFetch<AttendancePayload>(
        `/api/v1/staff/me/attendance?year=${year}&month=${month}`
      ),
    enabled: !!orgId && meQuery.isSuccess,
  });

  if (meQuery.isLoading) return <PageLoader label="Loading your profile..." />;

  if (meQuery.isError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Your login is not linked to a staff profile yet. Ask the shop owner to
          link your account under Staff → People.
        </p>
        <Link href="/settings/profile">
          <Button className="rounded-xl">Back to profile</Button>
        </Link>
      </div>
    );
  }

  const staff = meQuery.data!;
  const days = attendanceQuery.data?.days ?? [];

  const counts = days.reduce(
    (acc, d) => {
      if (d.status) acc[d.status] = (acc[d.status] ?? 0) + 1;
      else acc.unmarked += 1;
      return acc;
    },
    { unmarked: 0 } as Record<string, number>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Attendance</h1>
        <p className="text-sm text-muted-foreground">
          {staff.name} · {staff.roleTitle}
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">{MONTHS[month - 1]} {year}</CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => {
                if (month === 1) {
                  setMonth(12);
                  setYear((y) => y - 1);
                } else setMonth((m) => m - 1);
              }}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => {
                if (month === 12) {
                  setMonth(1);
                  setYear((y) => y + 1);
                } else setMonth((m) => m + 1);
              }}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {attendanceQuery.isLoading ? (
            <PageLoader label="Loading attendance..." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(["PRESENT", "HALF_DAY", "ABSENT", "PAID_LEAVE"] as const).map((s) => (
                  <div key={s} className="rounded-xl border p-2 text-center text-sm">
                    <p className="text-xs text-muted-foreground">{CELL[s].title}</p>
                    <p className="text-lg font-semibold">{counts[s] ?? 0}</p>
                  </div>
                ))}
                <div className="rounded-xl border p-2 text-center text-sm">
                  <p className="text-xs text-muted-foreground">Unmarked</p>
                  <p className="text-lg font-semibold">{counts.unmarked ?? 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayNum = Number(day.date.slice(8, 10));
                  const cfg = day.status ? CELL[day.status] : null;
                  return (
                    <div
                      key={day.date}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs",
                        cfg?.className ?? "bg-muted/30 text-muted-foreground"
                      )}
                      title={cfg?.title ?? "Not marked"}
                    >
                      <span className="font-medium">{dayNum}</span>
                      <span>{cfg?.short ?? "·"}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
