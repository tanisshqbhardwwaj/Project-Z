"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GitMerge, RotateCcw, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetchStore } from "@/stores/fetch-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerticalDotsIcon } from "@/components/ui/vertical-dots-icon";
import { MergeWorkOrderDialog } from "@/components/project/merge-work-order-dialog";
import { DeleteWorkOrderDialog } from "@/components/project/delete-work-order-dialog";
import { isActiveProjectStatus } from "@/lib/project/display-name";

type WorkOrderListActionsProps = {
  projectId: string;
  projectName: string;
  workOrderNumber?: string | null;
  status: string;
};

export function WorkOrderListActions({
  projectId,
  projectName,
  workOrderNumber,
  status,
}: WorkOrderListActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isActive = isActiveProjectStatus(status);

  function refreshList() {
    useFetchStore.getState().invalidatePrefix("projects");
    router.refresh();
  }

  async function setStatus(next: "ACTIVE" | "COMPLETED") {
    setUpdating(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setMenuOpen(false);
      refreshList();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
            aria-label="Work order actions"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <VerticalDotsIcon />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 rounded-xl p-1">
          {isActive ? (
            <button
              type="button"
              disabled={updating}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void setStatus("COMPLETED");
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark completed
            </button>
          ) : (
            <button
              type="button"
              disabled={updating}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void setStatus("ACTIVE");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Mark active
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              setMergeOpen(true);
            }}
          >
            <GitMerge className="h-4 w-4" />
            Merge work order
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete work order
          </button>
        </PopoverContent>
      </Popover>

      <MergeWorkOrderDialog
        projectId={projectId}
        projectName={projectName}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        hideTrigger
        onMerged={refreshList}
      />
      <DeleteWorkOrderDialog
        projectId={projectId}
        projectName={projectName}
        workOrderNumber={workOrderNumber}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        hideTrigger
        onDeleted={refreshList}
      />
    </>
  );
}
