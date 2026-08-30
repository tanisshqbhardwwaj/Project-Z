"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customer";
import type { ServiceAppointmentItem } from "@/lib/service/types";

type AppointmentDetail = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  staffId: string | null;
  staffName: string | null;
  itemsJson: ServiceAppointmentItem[];
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  saleId: string | null;
};

type StaffOption = { id: string; name: string };

const STATUSES = ["BOOKED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default function ServiceAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_appointments");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId && id ? queryKeys.modules.service.appointment(orgId, id) : ["disabled"],
    queryFn: () => apiFetch<AppointmentDetail>(`/api/v1/service/appointments/${id}`),
    enabled: !!orgId && !!id && enabled,
  });

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && enabled,
  });

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/v1/service/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.appointment(orgId, id) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.appointments(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.dashboard(orgId) });
      }
      setRescheduleOpen(false);
    },
    onError: (e) => applyError(e),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ saleId: string }>(`/api/v1/service/appointments/${id}/complete`, {
        method: "POST",
      }),
    onSuccess: (result) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.appointment(orgId, id) });
      }
      if (result.saleId) router.push(`/shop/invoices/${result.saleId}`);
    },
    onError: (e) => applyError(e),
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Bookings in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading booking..." />;
  if (loadError || !data) {
    return (
      <p className="text-destructive">
        {loadError instanceof Error ? loadError.message : "Booking not found"}
      </p>
    );
  }

  const items = Array.isArray(data.itemsJson) ? data.itemsJson : [];
  const totalPaise = items.reduce(
    (sum, item) => sum + (item.pricePaise ?? 0) * (item.quantity ?? 1),
    0
  );
  const canComplete = data.status !== "COMPLETED" && data.status !== "CANCELLED" && !data.saleId;

  function openReschedule() {
    const start = new Date(data!.startAt);
    setRescheduleDate(start.toISOString().slice(0, 10));
    setRescheduleTime(start.toTimeString().slice(0, 5));
    setRescheduleOpen(true);
  }

  function submitReschedule() {
    const startAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    const durationMs = new Date(data!.endAt).getTime() - new Date(data!.startAt).getTime();
    const endAt = new Date(startAt.getTime() + durationMs);
    patchMutation.mutate({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/service/appointments"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to bookings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Booking details</h1>
            <p className="text-sm text-muted-foreground">
              {data.customerName
                ? formatCustomerLabel({ name: data.customerName, phone: data.customerPhone })
                : "Walk-in"}
            </p>
          </div>
          <Badge variant="secondary">{data.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">When: </span>
            {new Date(data.startAt).toLocaleString("en-IN")}
            {" – "}
            {new Date(data.endAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            <span className="text-muted-foreground">Staff: </span>
            {data.staffName ?? "Unassigned"}
          </p>
          {data.notes ? (
            <p>
              <span className="text-muted-foreground">Notes: </span>
              {data.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span>
                  {item.name}
                  {(item.quantity ?? 1) > 1 ? ` × ${item.quantity}` : ""}
                  {item.durationMinutes ? (
                    <span className="ml-2 text-muted-foreground">({item.durationMinutes} min)</span>
                  ) : null}
                </span>
                <span className="font-medium tabular-nums">
                  {formatINR((item.pricePaise ?? 0) * (item.quantity ?? 1))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right font-semibold">Total {formatINR(totalPaise)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {canComplete ? (
          <Button
            className="rounded-xl"
            disabled={completeMutation.isPending}
            onClick={() => {
              clear();
              completeMutation.mutate();
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {completeMutation.isPending ? "Creating invoice…" : "Complete & invoice"}
          </Button>
        ) : null}
        {data.saleId ? (
          <Link href={`/shop/invoices/${data.saleId}`}>
            <Button variant="outline" className="rounded-xl">
              <Receipt className="mr-2 h-4 w-4" />
              View invoice
            </Button>
          </Link>
        ) : null}
        <Button variant="outline" className="rounded-xl" onClick={openReschedule}>
          <CalendarClock className="mr-2 h-4 w-4" />
          Reschedule
        </Button>
        {data.status !== "CANCELLED" && data.status !== "COMPLETED" ? (
          <Select
            value={data.status}
            onValueChange={(status) => {
              clear();
              patchMutation.mutate({ status });
            }}
          >
            <SelectTrigger className="h-11 w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule booking</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker value={rescheduleDate} onChange={setRescheduleDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rescheduleTime">Start time</Label>
              <Input
                id="rescheduleTime"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select
                value={data.staffId ?? "none"}
                onValueChange={(v) =>
                  patchMutation.mutate({ staffId: v === "none" ? null : v })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(staffQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="rounded-xl"
              disabled={patchMutation.isPending}
              onClick={submitReschedule}
            >
              Save new time
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
