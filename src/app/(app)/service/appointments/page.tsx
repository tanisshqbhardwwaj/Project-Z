"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, List, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { cn } from "@/lib/utils";

type AppointmentRow = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  staffId: string | null;
  staffName: string | null;
  startAt: string;
  endAt: string;
  status: string;
  itemsSummary?: string;
};

type CalendarDay = {
  date: string;
  appointments: AppointmentRow[];
};

type StaffOption = { id: string; name: string };

export default function ServiceAppointmentsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_appointments");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [weekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  });

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [weekStart]);

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () =>
      apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE").then((rows) =>
        Array.isArray(rows) ? rows : (rows as { staff?: StaffOption[] }).staff ?? []
      ),
    enabled: !!orgId && enabled,
  });

  const listQuery = useQuery({
    queryKey:
      orgId && enabled
        ? [...queryKeys.modules.service.appointments(orgId), staffFilter, "list"]
        : ["disabled"],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (staffFilter !== "all") params.set("staffId", staffFilter);
      return apiFetch<{ appointments: AppointmentRow[] }>(
        `/api/v1/service/appointments?${params}`
      ).then((r) => (Array.isArray(r) ? r : r.appointments ?? []));
    },
    enabled: !!orgId && enabled && view === "list",
  });

  const calendarQuery = useQuery({
    queryKey:
      orgId && enabled
        ? [...queryKeys.modules.service.calendar(orgId, `${weekStart}-${weekEnd}`), staffFilter]
        : ["disabled"],
    queryFn: () => {
      const params = new URLSearchParams({ from: weekStart, to: weekEnd });
      if (staffFilter !== "all") params.set("staffId", staffFilter);
      return apiFetch<{ days: CalendarDay[] }>(
        `/api/v1/service/appointments/calendar?${params}`
      ).then((r) => r.days ?? []);
    },
    enabled: !!orgId && enabled && view === "calendar",
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Bookings in Manage Organization → Features.
      </p>
    );
  }

  const loading = view === "list" ? listQuery.isLoading : calendarQuery.isLoading;
  const error = view === "list" ? listQuery.error : calendarQuery.error;

  if (loading) return <PageLoader label="Loading appointments..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load appointments"}
      </p>
    );
  }

  const appointments = view === "list" ? (listQuery.data ?? []) : [];
  const calendarDays = view === "calendar" ? (calendarQuery.data ?? []) : [];
  const staffList = staffQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Schedule and manage service appointments"
        actions={
          <Link href="/service/appointments/new">
            <Button size="lg" className="rounded-xl">
              <Plus className="mr-2 h-5 w-5" />
              New booking
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border p-1">
          <Button
            type="button"
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg"
            onClick={() => setView("list")}
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
          <Button
            type="button"
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="mr-1 h-4 w-4" />
            Calendar
          </Button>
        </div>
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="h-11 w-[200px] rounded-xl">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "list" ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>Upcoming & recent</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments yet"
                description="Create your first booking to get started."
              >
                <Link href="/service/appointments/new">
                  <Button className="rounded-xl">New booking</Button>
                </Link>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Staff</th>
                      <th className="px-4 py-3 font-medium">Services</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(appt.startAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {appt.customerName
                            ? formatCustomerLabel({
                                name: appt.customerName,
                                phone: appt.customerPhone,
                              })
                            : "Walk-in"}
                        </td>
                        <td className="px-4 py-3">{appt.staffName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {appt.itemsSummary ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{appt.status.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/service/appointments/${appt.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl">
                              Open
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {calendarDays.map((day) => (
            <Card key={day.date} className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {new Date(day.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {day.appointments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bookings</p>
                ) : (
                  day.appointments.map((appt) => (
                    <Link
                      key={appt.id}
                      href={`/service/appointments/${appt.id}`}
                      className={cn(
                        "block rounded-lg border p-2 text-xs transition-colors hover:bg-muted/50"
                      )}
                    >
                      <p className="font-medium">
                        {new Date(appt.startAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {appt.customerName ?? "Walk-in"}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
