"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Gift,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/finance/money-display";
import { formatCustomerLabel } from "@/lib/shop/customer";
import { cn } from "@/lib/utils";

type ServiceDashboardData = {
  todayBookings: number;
  todayRevenuePaise: string;
  upcomingCount: number;
  activeContracts: number;
  pendingFollowUps: number;
  staffLoad: Array<{
    staffId: string | null;
    staffName: string;
    bookingCount: number;
    minutesBooked: number;
  }>;
  todayAppointments: Array<{
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    staffName: string | null;
    startAt: string;
    endAt: string;
    status: string;
    itemsSummary?: string;
  }>;
  upcomingRenewals: Array<{
    id: string;
    name: string;
    customerName: string;
    nextServiceDate: string | null;
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-muted text-muted-foreground",
  NO_SHOW: "bg-destructive/10 text-destructive",
};

export function ServiceBusinessDashboard() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const appointmentsEnabled = isModuleEnabled(enabledModules, "service_appointments");

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.modules.service.dashboard(orgId) : ["disabled"],
    queryFn: () => apiFetch<ServiceDashboardData>("/api/v1/service/dashboard?period=today"),
    enabled: !!orgId && appointmentsEnabled,
  });

  if (!appointmentsEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Bookings in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading service dashboard..." />;
  if (error || !data) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load dashboard"}
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Service dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Today&apos;s bookings, staff load, and revenue
          </p>
        </div>
        <Link href="/service/appointments/new" className="w-full sm:w-auto">
          <Button size="lg" className="w-full rounded-xl sm:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            New booking
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Today&apos;s bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{data.todayBookings}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Today&apos;s revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay paise={data.todayRevenuePaise} className="text-2xl" />
          </CardContent>
        </Card>
        <Link href="/service/contracts" className="block h-full">
          <Card className="h-full rounded-2xl border-0 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active AMC contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{data.activeContracts}</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{data.pendingFollowUps}</p>
          </CardContent>
        </Card>
      </div>

      {data.staffLoad.length > 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff load today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.staffLoad.map((staff) => (
              <div key={staff.staffId ?? staff.staffName} className="flex items-center justify-between text-sm">
                <span className="font-medium">{staff.staffName}</span>
                <span className="text-muted-foreground">
                  {staff.bookingCount} booking{staff.bookingCount === 1 ? "" : "s"}
                  {staff.minutesBooked > 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(staff.minutesBooked / 60)}h
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Today&apos;s schedule
          </CardTitle>
          <Link href="/service/appointments">
            <Button variant="ghost" size="sm" className="rounded-xl">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="divide-y p-0 pt-0">
          {data.todayAppointments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No bookings scheduled for today.</p>
          ) : (
            data.todayAppointments.map((appt) => (
              <Link
                key={appt.id}
                href={`/service/appointments/${appt.id}`}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {appt.customerName
                      ? formatCustomerLabel({
                          name: appt.customerName,
                          phone: appt.customerPhone,
                        })
                      : "Walk-in"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(appt.startAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(appt.endAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {appt.staffName ? ` · ${appt.staffName}` : null}
                  </p>
                  {appt.itemsSummary ? (
                    <p className="truncate text-xs text-muted-foreground">{appt.itemsSummary}</p>
                  ) : null}
                </div>
                <Badge className={cn("shrink-0", STATUS_COLORS[appt.status] ?? "")}>
                  {appt.status.replace(/_/g, " ")}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {data.upcomingRenewals.length > 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upcoming renewals
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 pt-0">
            {data.upcomingRenewals.map((c) => (
              <Link
                key={c.id}
                href={`/service/contracts/${c.id}`}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.customerName}</p>
                </div>
                {c.nextServiceDate ? (
                  <span className="text-sm text-muted-foreground">
                    {new Date(c.nextServiceDate).toLocaleDateString("en-IN")}
                  </span>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/service/appointments/new">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <CalendarDays className="mr-3 h-5 w-5" />
              New booking
            </Button>
          </Link>
          <Link href="/service/catalog">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Receipt className="mr-3 h-5 w-5" />
              Service catalog
            </Button>
          </Link>
          <Link href="/service/packages">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Gift className="mr-3 h-5 w-5" />
              Packages
            </Button>
          </Link>
          <Link href="/shop/invoices">
            <Button variant="outline" className="h-14 w-full justify-start rounded-xl">
              <Receipt className="mr-3 h-5 w-5" />
              Invoices
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
