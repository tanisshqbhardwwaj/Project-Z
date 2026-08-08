"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetchStore } from "@/stores/fetch-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { requireField } from "@/lib/api/validation";

export function DeleteWorkOrderDialog({
  projectId,
  projectName,
  workOrderNumber,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  onDeleted,
}: {
  projectId: string;
  projectName: string;
  workOrderNumber?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const nameMatches = confirmName.trim() === projectName.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmName("");
      clear();
    }
  }

  async function deleteWorkOrder() {
    clear();

    const validationMessage = requireField(confirmName, "work order name");
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    if (!nameMatches) {
      showWarning("Work order name does not match. Type the exact name shown above.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
        body: JSON.stringify({ hard: true, confirmName: confirmName.trim() }),
      });
      useFetchStore.getState().invalidatePrefix("project:");
      useFetchStore.getState().invalidatePrefix("projects");
      setOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/projects");
        router.refresh();
      }
    } catch (err) {
      applyError(err, "Could not delete work order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete work order permanently?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p>
                This will <strong className="text-foreground">hard delete</strong>{" "}
                <strong className="text-foreground">{projectName}</strong>
                {workOrderNumber ? ` (WO #${workOrderNumber})` : ""} and all related data.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>All expenses and payments</li>
                <li>Vendor records linked to this work order</li>
                <li>Uploaded documents and work order files</li>
                <li>Partner access and invites</li>
              </ul>
              <p className="font-medium text-destructive">This action cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormFeedback warning={warning} error={error} />

          <div className="space-y-2">
            <Label htmlFor="confirm-delete-name">
              Type <span className="font-semibold">{projectName}</span> to confirm
            </Label>
            <Input
              id="confirm-delete-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={projectName}
              className="h-12 rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-xl"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-12 flex-1 rounded-xl"
              disabled={!nameMatches || loading}
              onClick={deleteWorkOrder}
            >
              {loading ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
