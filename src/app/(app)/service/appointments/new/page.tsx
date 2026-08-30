"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import type { ServiceAppointmentItem } from "@/lib/service/types";

type StaffOption = { id: string; name: string };
type ServiceProduct = {
  id: string;
  name: string;
  variants: Array<{ id: string; sellPaise: string | null }>;
};

type LineDraft = ServiceAppointmentItem & { key: string };

function emptyLine(): LineDraft {
  return { key: crypto.randomUUID(), name: "", pricePaise: 0, quantity: 1, durationMinutes: 30 };
}

export default function NewServiceAppointmentPage() {
  const router = useRouter();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_appointments");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && enabled,
  });

  const servicesQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "products", "services"] : ["disabled"],
    queryFn: () => apiFetch<ServiceProduct[]>("/api/v1/shop/products"),
    enabled: !!orgId && enabled,
  });

  const serviceOptions = useMemo(() => {
    const products = servicesQuery.data ?? [];
    return products.flatMap((p) =>
      p.variants.map((v) => ({
        productId: p.id,
        inventoryItemId: v.id,
        name: p.name,
        sellPaise: v.sellPaise ? Number(v.sellPaise) : 0,
      }))
    );
  }, [servicesQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const startAt = new Date(`${date}T${startTime}:00`);
      const totalMinutes = lines.reduce(
        (sum, l) => sum + (l.durationMinutes ?? 30) * (l.quantity ?? 1),
        0
      );
      const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);
      const items = lines
        .filter((l) => l.name.trim())
        .map(({ key: _k, ...item }) => item);

      return apiFetch<{ id: string }>("/api/v1/service/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          staffId: staffId || undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          items,
          notes: notes.trim() || undefined,
        }),
      });
    },
    onSuccess: (data) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.appointments(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.service.dashboard(orgId) });
      }
      router.push(`/service/appointments/${data.id}`);
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

  if (staffQuery.isLoading || servicesQuery.isLoading) {
    return <PageLoader label="Loading form..." />;
  }

  function addServiceFromCatalog(svc: (typeof serviceOptions)[number]) {
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: svc.productId,
        inventoryItemId: svc.inventoryItemId,
        name: svc.name,
        pricePaise: svc.sellPaise,
        quantity: 1,
        durationMinutes: 30,
      },
    ]);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/service/appointments"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to bookings
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">New booking</h1>
      </div>

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-xl"
              placeholder="Customer name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="rounded-xl"
              placeholder="10-digit mobile"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Staff</Label>
            <Select value={staffId || "none"} onValueChange={(v) => setStaffId(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Unassigned" />
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setLines((p) => [...p, emptyLine()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {serviceOptions.slice(0, 8).map((svc) => (
                <Button
                  key={svc.inventoryItemId}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => addServiceFromCatalog(svc)}
                >
                  + {svc.name}
                </Button>
              ))}
            </div>
          ) : null}
          {lines.map((line, idx) => (
            <div key={line.key} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <Input
                  value={line.name}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, name: e.target.value } : l))
                    )
                  }
                  placeholder="Service name"
                  className="rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  value={line.durationMinutes ?? 30}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, durationMinutes: Number(e.target.value) } : l
                      )
                    )
                  }
                  placeholder="Min"
                  className="rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  value={(line.pricePaise ?? 0) / 100}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? { ...l, pricePaise: Math.round(Number(e.target.value) * 100) }
                          : l
                      )
                    )
                  }
                  placeholder="₹"
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <Input
                  type="number"
                  min={1}
                  value={line.quantity ?? 1}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, quantity: Number(e.target.value) } : l
                      )
                    )
                  }
                  className="rounded-xl"
                />
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl"
            placeholder="Optional notes for staff"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/service/appointments">
          <Button variant="outline" className="rounded-xl">
            Cancel
          </Button>
        </Link>
        <Button
          className="rounded-xl"
          disabled={createMutation.isPending || !lines.some((l) => l.name.trim())}
          onClick={() => {
            clear();
            createMutation.mutate();
          }}
        >
          {createMutation.isPending ? "Saving…" : "Create booking"}
        </Button>
      </div>
    </div>
  );
}
