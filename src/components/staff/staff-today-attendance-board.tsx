"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersRound } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export type TodayAttendanceBoardRow = {
  staff: {
    id: string;
    name: string;
    roleTitle: string;
    roleKey?: string | null;
  };
  attendance: {
    id: string;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    status?: string;
  } | null;
  sessionStatus: "OPEN" | "COMPLETED" | "ABSENT" | null;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  durationLabel: string | null;
  date: string;
};

export function StaffTodayAttendanceBoard({ date }: { date: string }) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { data, isLoading } = useQuery({
    queryKey: orgId ? [...queryKeys.staff.all(orgId), "today-board", date] : ["disabled"],
    queryFn: () =>
      apiFetch<TodayAttendanceBoardRow[]>(
        `/api/v1/staff/attendance?board=today&date=${date}`
      ),
    enabled: !!orgId && !!date,
    refetchInterval: 30_000,
  });

  const rows = data ?? [];
  const checkedIn = rows.filter((r) => r.sessionStatus === "OPEN");
  const checkedOut = rows.filter((r) => r.sessionStatus === "COMPLETED");

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Today&apos;s attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <PageLoader label="Loading today's attendance..." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No active staff"
            className="py-4"
          />
        ) : (
          <>
            {checkedIn.map((row) => (
              <div
                key={row.staff.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="font-medium">{row.staff.name}</p>
                  <p className="text-xs text-muted-foreground">{row.checkInLabel}</p>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Checked In</Badge>
              </div>
            ))}
            {checkedOut.map((row) => (
              <div
                key={row.staff.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="font-medium">{row.staff.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.checkInLabel} → {row.checkOutLabel}
                    {row.durationLabel ? ` · ${row.durationLabel}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">Checked Out</Badge>
              </div>
            ))}
            {checkedIn.length === 0 && checkedOut.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins recorded yet today.</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
