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
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { orgTodayKey } from "@/lib/date/org-day";

type MaterialIssue = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  issuedTo: string | null;
  date: string;
  createdBy: { name: string };
};

export default function ContractorMaterialPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const timezone = useAuthStore((s) => s.timezone);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "contractor_material");
  const title = moduleLabel("contractor_material", activeBusinessType ?? "CONTRACTOR");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bags");
  const [issuedTo, setIssuedTo] = useState("");
  const [date, setDate] = useState(() => orgTodayKey(timezone));

  const issuesQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.contractor.material(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<MaterialIssue[]>(
        `/api/v1/contractor/material?projectId=${projectId}`
      ),
    enabled: !!orgId && !!projectId && moduleEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/contractor/material", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.contractor.material(orgId, projectId),
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

  async function issueMaterial(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId) return showWarning("Select a project");
    if (!itemName.trim()) return showWarning("Item name is required");
    try {
      await createMutation.mutateAsync({
        projectId,
        itemName: itemName.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        issuedTo: issuedTo.trim() || null,
        date,
      });
      setItemName("");
      setQuantity("");
      setIssuedTo("");
    } catch (err) {
      applyError(err, "Failed to record material issue");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Material issue and consumption tracking
        </p>
      </div>

      <ProjectSelect value={projectId} onChange={setProjectId} />

      {!projectId ? (
        <p className="text-sm text-muted-foreground">Select a project to continue.</p>
      ) : (
        <>
          <FormFeedback warning={warning} error={error} />

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Issue material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={issueMaterial} className="space-y-3">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Input value={itemName} onChange={(e) => setItemName(e.target.value)} className="h-12 rounded-xl" required />
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
                    <Label>Date</Label>
                    <DatePicker value={date} onChange={setDate} className="h-12 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Issued to</Label>
                  <Input value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} className="h-12 rounded-xl" placeholder="Site / supervisor" />
                </div>
                <Button type="submit" className="h-12 w-full rounded-xl" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Record issue"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Issue log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {issuesQuery.isLoading ? (
                <PageLoader label="Loading issues..." />
              ) : (issuesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No material issues yet.</p>
              ) : (
                (issuesQuery.data ?? []).map((issue) => (
                  <div key={issue.id} className="rounded-xl border p-3">
                    <p className="font-medium">{issue.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      {issue.quantity} {issue.unit}
                      {issue.issuedTo ? ` → ${issue.issuedTo}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(issue.date).toLocaleDateString()} · {issue.createdBy.name}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
