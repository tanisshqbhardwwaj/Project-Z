"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { useFetchStore } from "@/stores/fetch-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireSelect } from "@/lib/api/validation";

type ProjectOption = {
  id: string;
  name: string;
  workOrder?: { workOrderNumber: string } | null;
};

export function MergeWorkOrderDialog({
  projectId,
  projectName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  onMerged,
}: {
  projectId: string;
  projectName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onMerged?: () => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [sourceId, setSourceId] = useState("");
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const { data: projects } = useFetch(open ? "projects:merge-list" : null, () =>
    apiFetch<ProjectOption[]>("/api/v1/projects")
  );

  const others = (projects ?? []).filter((p) => p.id !== projectId);

  async function merge() {
    clear();
    const validationMessage = requireSelect(sourceId, "a work order to merge");
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/merge`, {
        method: "POST",
        body: JSON.stringify({ sourceProjectId: sourceId }),
      });
      useFetchStore.getState().invalidatePrefix("project:");
      useFetchStore.getState().invalidatePrefix("projects");
      setOpen(false);
      setSourceId("");
      if (onMerged) {
        onMerged();
      } else {
        router.refresh();
        router.push(`/projects/${projectId}?tab=overview`);
      }
    } catch (err) {
      applyError(err, "Merge failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-xl">
            <GitMerge className="mr-2 h-4 w-4" />
            Merge Work Order
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Merge into this work order</DialogTitle>
          <DialogDescription>
            Move all expenses, payments, documents and partners from another work order into{" "}
            <strong>{projectName}</strong>. The other work order will be archived.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merge-source">Work order to merge in</Label>
            <select
              id="merge-source"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">Select work order...</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.workOrder?.workOrderNumber ? ` (WO #${p.workOrder.workOrderNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <FormFeedback warning={warning} error={error} />
          <Button
            className="h-12 w-full rounded-xl"
            disabled={!sourceId || loading}
            onClick={merge}
          >
            {loading ? "Merging..." : "Merge Work Orders"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
