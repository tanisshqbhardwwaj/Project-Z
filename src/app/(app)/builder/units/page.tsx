"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { ProjectSelect } from "@/components/modules/project-select";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

type BuilderUnit = {
  id: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  pricePaise: string | null;
  status: "AVAILABLE" | "BOOKED" | "SOLD";
  bookings: { buyerName: string; bookingPaise: string; status: string }[];
};

type UnitBooking = {
  id: string;
  buyerName: string;
  buyerPhone: string | null;
  bookingPaise: string;
  status: "BOOKED" | "CANCELLED" | "HANDED_OVER";
  unit: { unitNumber: string; floor: string | null };
};

type Tab = "units" | "bookings";

export default function BuilderUnitsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "builder_units");
  const title = moduleLabel("builder_units", activeBusinessType ?? "BUILDER");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [tab, setTab] = useState<Tab>("units");

  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [price, setPrice] = useState("");

  const [bookUnitId, setBookUnitId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");

  const unitsQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.builder.units(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<BuilderUnit[]>(`/api/v1/builder/units?projectId=${projectId}`),
    enabled: !!orgId && !!projectId && moduleEnabled,
  });

  const bookingsQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.builder.bookings(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<UnitBooking[]>(`/api/v1/builder/bookings?projectId=${projectId}`),
    enabled: !!orgId && !!projectId && moduleEnabled && tab === "bookings",
  });

  const createUnitMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/builder/units", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.builder.units(orgId, projectId),
        });
      }
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/builder/bookings", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.builder.units(orgId, projectId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.modules.builder.bookings(orgId, projectId),
        });
      }
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/builder/bookings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.builder.units(orgId, projectId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.modules.builder.bookings(orgId, projectId),
        });
      }
    },
  });

  if (!moduleEnabled) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">{title} is optional</h1>
        <p className="text-sm text-muted-foreground">
          Turn on {title.toLowerCase()} in Manage Organization → Features.
        </p>
        <Link href="/settings/organization">
          <Button className="rounded-xl">Manage Organization</Button>
        </Link>
      </div>
    );
  }

  const availableUnits = (unitsQuery.data ?? []).filter((u) => u.status === "AVAILABLE");

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId) return showWarning("Select a project");
    const trimmedUnit = unitNumber.trim();
    if (!trimmedUnit) return showWarning("Unit number is required");

    const duplicate = (unitsQuery.data ?? []).some(
      (u) => u.unitNumber.toLowerCase() === trimmedUnit.toLowerCase()
    );
    if (duplicate) {
      return showWarning(`Unit "${trimmedUnit}" already exists in this project`);
    }

    try {
      await createUnitMutation.mutateAsync({
        projectId,
        unitNumber: trimmedUnit,
        floor: floor.trim() || null,
        areaSqft: areaSqft ? Number(areaSqft) : null,
        priceRupees: price ? Number(price) : null,
      });
      setUnitNumber("");
      setFloor("");
      setAreaSqft("");
      setPrice("");
    } catch (err) {
      applyError(err, "Failed to add unit");
    }
  }

  async function bookUnit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId || !bookUnitId) return showWarning("Select a unit");
    if (buyerName.trim().length < 2) return showWarning("Buyer name is required");
    try {
      await createBookingMutation.mutateAsync({
        projectId,
        unitId: bookUnitId,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim() || null,
        bookingRupees: Number(bookingAmount),
      });
      setBuyerName("");
      setBuyerPhone("");
      setBookingAmount("");
      setBookUnitId("");
    } catch (err) {
      applyError(err, "Failed to create booking");
    }
  }

  async function updateBookingStatus(
    bookingId: string,
    status: "CANCELLED" | "HANDED_OVER"
  ) {
    clear();
    try {
      await updateBookingMutation.mutateAsync({ bookingId, status });
    } catch (err) {
      applyError(err, "Failed to update booking");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Flat inventory, bookings, and collections
        </p>
      </div>

      <ProjectSelect value={projectId} onChange={setProjectId} />

      {!projectId ? (
        <p className="text-sm text-muted-foreground">Select a project to continue.</p>
      ) : (
        <>
          <div className="flex gap-2">
            {(
              [
                ["units", "Units"],
                ["bookings", "Bookings"],
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

          {tab === "units" && (
            <>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Add unit</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addUnit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Unit #</Label>
                        <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Floor</Label>
                        <Input value={floor} onChange={(e) => setFloor(e.target.value)} className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Area (sqft)</Label>
                        <Input type="number" min={0} value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹)</Label>
                        <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <Button type="submit" className="h-12 w-full rounded-xl" disabled={createUnitMutation.isPending}>
                      {createUnitMutation.isPending ? "Adding..." : "Add unit"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Unit inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unitsQuery.isLoading ? (
                    <PageLoader label="Loading units..." />
                  ) : (unitsQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No units yet.</p>
                  ) : (
                    (unitsQuery.data ?? []).map((unit) => (
                      <div key={unit.id} className="rounded-xl border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {unit.unitNumber}
                              {unit.floor ? ` · Floor ${unit.floor}` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {unit.areaSqft ? `${unit.areaSqft} sqft · ` : ""}
                              {unit.pricePaise ? formatINR(unit.pricePaise) : "Price TBD"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              unit.status === "AVAILABLE"
                                ? "bg-green-100 text-green-800"
                                : unit.status === "BOOKED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-muted"
                            )}
                          >
                            {unit.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {availableUnits.length > 0 && (
                <Card className="rounded-2xl border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick booking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={bookUnit} className="space-y-3">
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <select
                          value={bookUnitId}
                          onChange={(e) => setBookUnitId(e.target.value)}
                          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
                          required
                        >
                          <option value="">Select available unit...</option>
                          {availableUnits.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unitNumber}
                              {u.floor ? ` (Floor ${u.floor})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Buyer</Label>
                          <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-12 rounded-xl" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="h-12 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Booking amount (₹)</Label>
                        <Input type="number" min={1} value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <Button type="submit" className="h-12 w-full rounded-xl" disabled={createBookingMutation.isPending}>
                        {createBookingMutation.isPending ? "Booking..." : "Create booking"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {tab === "bookings" && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bookingsQuery.isLoading ? (
                  <PageLoader label="Loading bookings..." />
                ) : (bookingsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  (bookingsQuery.data ?? []).map((b) => (
                    <div key={b.id} className="space-y-2 rounded-xl border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{b.buyerName}</p>
                          <p className="text-sm text-muted-foreground">
                            Unit {b.unit.unitNumber}
                            {b.unit.floor ? ` · Floor ${b.unit.floor}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatINR(b.bookingPaise)}</p>
                          <span className="text-xs text-muted-foreground">{b.status}</span>
                        </div>
                      </div>
                      {b.status === "BOOKED" && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-xl"
                            onClick={() => updateBookingStatus(b.id, "CANCELLED")}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="h-9 rounded-xl"
                            onClick={() => updateBookingStatus(b.id, "HANDED_OVER")}
                          >
                            Hand over
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
