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

type DrawingRevision = {
  id: string;
  revisionNo: number;
  title: string;
  submittedAt: string | null;
  createdBy: { name: string };
};

type DesignStage = {
  id: string;
  name: string;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED";
  feePaise: string | null;
  dueDate: string | null;
  revisions: DrawingRevision[];
};

const STAGE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
] as const;

export default function ArchitectStagesPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "architect_stages");
  const title = moduleLabel("architect_stages", activeBusinessType ?? "ARCHITECT");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [stageName, setStageName] = useState("");
  const [fee, setFee] = useState("");
  const [revisionTitles, setRevisionTitles] = useState<Record<string, string>>({});

  const stagesQuery = useQuery({
    queryKey:
      orgId && projectId
        ? queryKeys.modules.architect.stages(orgId, projectId)
        : ["disabled"],
    queryFn: () =>
      apiFetch<DesignStage[]>(`/api/v1/architect/stages?projectId=${projectId}`),
    enabled: !!orgId && !!projectId && moduleEnabled,
  });

  const createStageMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/architect/stages", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.architect.stages(orgId, projectId),
        });
      }
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/architect/stages", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.architect.stages(orgId, projectId),
        });
      }
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/architect/stages", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId && projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.modules.architect.stages(orgId, projectId),
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

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!projectId) return showWarning("Select a project");
    if (!stageName.trim()) return showWarning("Stage name is required");
    try {
      await createStageMutation.mutateAsync({
        projectId,
        name: stageName.trim(),
        feeRupees: fee ? Number(fee) : null,
      });
      setStageName("");
      setFee("");
    } catch (err) {
      applyError(err, "Failed to add stage");
    }
  }

  async function setStageStatus(stageId: string, status: (typeof STAGE_STATUSES)[number]) {
    clear();
    try {
      await updateStageMutation.mutateAsync({ stageId, status });
    } catch (err) {
      applyError(err, "Failed to update stage");
    }
  }

  async function addRevision(stageId: string) {
    clear();
    const titleVal = revisionTitles[stageId]?.trim();
    if (!titleVal) return showWarning("Revision title is required");
    try {
      await createRevisionMutation.mutateAsync({ stageId, title: titleVal });
      setRevisionTitles((prev) => ({ ...prev, [stageId]: "" }));
    } catch (err) {
      applyError(err, "Failed to add revision");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Design milestones and drawing revisions
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
              <CardTitle className="text-lg">Add design stage</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addStage} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Stage name</Label>
                    <Input value={stageName} onChange={(e) => setStageName(e.target.value)} className="h-12 rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee (₹)</Label>
                    <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full rounded-xl" disabled={createStageMutation.isPending}>
                  {createStageMutation.isPending ? "Adding..." : "Add stage"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Stages & revisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stagesQuery.isLoading ? (
                <PageLoader label="Loading stages..." />
              ) : (stagesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No stages yet.</p>
              ) : (
                (stagesQuery.data ?? []).map((stage) => (
                  <div key={stage.id} className="space-y-3 rounded-xl border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{stage.name}</p>
                        {stage.feePaise && (
                          <p className="text-sm text-muted-foreground">
                            Fee {formatINR(stage.feePaise)}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {stage.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                      {STAGE_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStageStatus(stage.id, st)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-xs font-medium",
                            stage.status === st
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          )}
                        >
                          {st.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    {stage.revisions.length > 0 && (
                      <div className="space-y-1 border-t pt-2">
                        {stage.revisions.map((rev) => (
                          <p key={rev.id} className="text-sm text-muted-foreground">
                            R{rev.revisionNo}: {rev.title} · {rev.createdBy.name}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="New revision title"
                        value={revisionTitles[stage.id] ?? ""}
                        onChange={(e) =>
                          setRevisionTitles((prev) => ({
                            ...prev,
                            [stage.id]: e.target.value,
                          }))
                        }
                        className="h-10 flex-1 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl"
                        onClick={() => addRevision(stage.id)}
                        disabled={createRevisionMutation.isPending}
                      >
                        Add revision
                      </Button>
                    </div>
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
