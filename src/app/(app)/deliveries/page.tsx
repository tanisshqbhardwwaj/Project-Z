"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { cn } from "@/lib/utils";

type DeliveryRow = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
};

type StaffOption = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  ASSIGNED: "bg-blue-100 text-blue-800",
  OUT_FOR_DELIVERY: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

const STATUSES = ["all", "PENDING", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];

export default function DeliveriesPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "deliveries");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.deliveries(orgId), statusFilter] : ["disabled"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      return apiFetch<{ deliveries: DeliveryRow[] }>(`/api/v1/deliveries?${params}`).then((r) =>
        Array.isArray(r) ? r : r.deliveries ?? []
      );
    },
    enabled: !!orgId && enabled,
  });

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && enabled,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          address: address.trim(),
          assignedStaffId: assignedStaffId || undefined,
        }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.deliveries(orgId) });
      setCreateOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setAddress("");
      setAssignedStaffId("");
    },
    onError: (e) => applyError(e),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) =>
      apiFetch(`/api/v1/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedStaffId: staffId, status: "ASSIGNED" }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.deliveries(orgId) });
    },
    onError: (e) => applyError(e),
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Deliveries in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading deliveries..." />;
  if (loadError) {
    return (
      <p className="text-destructive">
        {loadError instanceof Error ? loadError.message : "Failed to load deliveries"}
      </p>
    );
  }

  const deliveries = data ?? [];
  const staffList = staffQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Assign and track delivery orders"
        actions={
          <>
            <Link href="/deliveries/me">
              <Button variant="outline" size="lg" className="rounded-xl">
                My deliveries
              </Button>
            </Link>
            <Button size="lg" className="rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              New delivery
            </Button>
          </>
        }
      />

      <FormFeedback error={error} />

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-11 w-[200px] rounded-xl">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {deliveries.length === 0 ? (
          <Card className="col-span-full rounded-2xl border-0 shadow-md">
            <CardContent>
              <EmptyState icon={MapPin} title="No deliveries" description="Create a delivery to assign to staff.">
                <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
                  New delivery
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          deliveries.map((d) => (
            <Card key={d.id} className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{d.customerName}</CardTitle>
                  <Badge className={cn(STATUS_COLORS[d.status] ?? "")}>
                    {d.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{d.address}</p>
                {d.customerPhone ? <p>{d.customerPhone}</p> : null}
                <p>
                  <span className="text-muted-foreground">Assigned: </span>
                  {d.assignedStaffName ?? "Unassigned"}
                </p>
                {d.scheduledAt ? (
                  <p className="text-xs text-muted-foreground">
                    Scheduled {new Date(d.scheduledAt).toLocaleString("en-IN")}
                  </p>
                ) : null}
                {!d.assignedStaffId ? (
                  <Select
                    onValueChange={(staffId) => assignMutation.mutate({ id: d.id, staffId })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Assign staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>New delivery</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Assign to (optional)</Label>
              <Select value={assignedStaffId || "none"} onValueChange={(v) => setAssignedStaffId(v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="rounded-xl"
              disabled={!customerName.trim() || !address.trim() || createMutation.isPending}
              onClick={() => {
                clear();
                createMutation.mutate();
              }}
            >
              Create delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
