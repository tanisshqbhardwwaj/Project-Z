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
import { formatINR, paiseToRupees } from "@/lib/finance/money";
import { orgTodayKey } from "@/lib/date/org-day";

type Tab = "boq" | "measurements";

type BoqItem = {
  id: string;
  itemCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  ratePaise: string;
};

type Measurement = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  date: string;
  createdBy: { name: string };
};

export default function ContractorBoqPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const timezone = useAuthStore((s) => s.timezone);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "contractor_boq");
  const title = moduleLabel("contractor_boq", activeBusinessType ?? "CONTRACTOR");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [tab, setTab] = useState<Tab>("boq");

  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("sqm");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");

  const [measDesc, setMeasDesc] = useState("");
  const [measQty, setMeasQty] = useState("");
  const [measUnit, setMeasUnit] = useState("sqm");
  const [measDate, setMeasDate] = useState(() => orgTodayKey(timezone));

  const boqQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.contractor.boq(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<BoqItem[]>(`/api/v1/contractor/boq?projectId=${projectId}`),
    enabled: !!orgId && !!projectId && moduleEnabled,
  });

  const measurementsQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.contractor.measurements(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<Measurement[]>(
        `/api/v1/contractor/measurements?projectId=${projectId}`
      ),
    enabled: !!orgId && !!projectId && moduleEnabled && tab === "measurements",
  });

  const createBoqMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/contractor/boq", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.contractor.boq(orgId, projectId),
        });
      }
    },
  });

  const createMeasMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/contractor/measurements", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.contractor.measurements(orgId, projectId),
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

  async function addBoqItem(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId) return showWarning("Select a project");
    if (!description.trim()) return showWarning("Description is required");
    try {
      await createBoqMutation.mutateAsync({
        projectId,
        description: description.trim(),
        unit: unit.trim(),
        quantity: Number(quantity),
        rateRupees: Number(rate),
      });
      setDescription("");
      setQuantity("");
      setRate("");
    } catch (err) {
      applyError(err, "Failed to add BOQ item");
    }
  }

  async function addMeasurement(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId) return showWarning("Select a project");
    if (!measDesc.trim()) return showWarning("Description is required");
    try {
      await createMeasMutation.mutateAsync({
        projectId,
        description: measDesc.trim(),
        unit: measUnit.trim(),
        quantity: Number(measQty),
        date: measDate,
      });
      setMeasDesc("");
      setMeasQty("");
    } catch (err) {
      applyError(err, "Failed to add measurement");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Bill of quantities and measurement book
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
                ["boq", "BOQ"],
                ["measurements", "Measurements"],
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

          {tab === "boq" && (
            <>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Add BOQ line</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addBoqItem} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-xl" required />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate ₹</Label>
                        <Input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                    </div>
                    <Button type="submit" className="h-12 w-full rounded-xl" disabled={createBoqMutation.isPending}>
                      {createBoqMutation.isPending ? "Adding..." : "Add line"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">BOQ items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {boqQuery.isLoading ? (
                    <PageLoader label="Loading BOQ..." />
                  ) : (boqQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No BOQ items yet.</p>
                  ) : (
                    (boqQuery.data ?? []).map((item) => {
                      const amount =
                        item.quantity * paiseToRupees(BigInt(item.ratePaise));
                      return (
                        <div key={item.id} className="rounded-xl border p-3">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit} × {formatINR(item.ratePaise)} = ₹
                            {amount.toLocaleString("en-IN")}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {tab === "measurements" && (
            <>
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Add measurement</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addMeasurement} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={measDesc} onChange={(e) => setMeasDesc(e.target.value)} className="h-12 rounded-xl" required />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input type="number" min={0} step="any" value={measQty} onChange={(e) => setMeasQty(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input value={measUnit} onChange={(e) => setMeasUnit(e.target.value)} className="h-12 rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={measDate} onChange={(e) => setMeasDate(e.target.value)} className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <Button type="submit" className="h-12 w-full rounded-xl" disabled={createMeasMutation.isPending}>
                      {createMeasMutation.isPending ? "Adding..." : "Add entry"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Measurement book</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {measurementsQuery.isLoading ? (
                    <PageLoader label="Loading measurements..." />
                  ) : (measurementsQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No measurements yet.</p>
                  ) : (
                    (measurementsQuery.data ?? []).map((m) => (
                      <div key={m.id} className="rounded-xl border p-3">
                        <p className="font-medium">{m.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.quantity} {m.unit} · {new Date(m.date).toLocaleDateString()} ·{" "}
                          {m.createdBy.name}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
