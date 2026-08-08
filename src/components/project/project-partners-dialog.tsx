"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectPartnersPanel } from "@/components/project/project-partners-panel";

type PartnersOverview = {
  pendingRequests: Array<{ id: string }>;
  canApprove: boolean;
};

export function ProjectPartnersDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpen =
    searchParams.get("partners") === "open" || searchParams.get("tab") === "partners";
  const [open, setOpen] = useState(shouldOpen);

  const { data: overview, refetch } = useFetch(`project:${projectId}:partners`, () =>
    apiFetch<PartnersOverview>(`/api/v1/projects/${projectId}/partners`)
  );

  useEffect(() => {
    if (shouldOpen) setOpen(true);
  }, [shouldOpen]);

  useEffect(() => {
    if (open) refetch(true);
  }, [open, refetch]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && shouldOpen) {
      router.replace(`/projects/${projectId}`, { scroll: false });
    }
  }

  const pendingCount = overview?.canApprove ? overview.pendingRequests.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative rounded-xl">
          <Users className="mr-2 h-4 w-4" />
          Partners
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
              {pendingCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Work Order Partners</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p>Partners can access only this work order — not your whole organization.</p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Secure invite flow
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-xs sm:text-sm">
                  <li>You share a link (WhatsApp/email) or send an email invite.</li>
                  <li>Partner opens the link, signs in, and clicks <strong>Request to Join</strong>.</li>
                  <li>They are <strong>not</strong> added automatically — you must approve them below.</li>
                  <li>Only after you approve can they see expenses and data for this work order.</li>
                </ol>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        {open && <ProjectPartnersPanel projectId={projectId} compact />}
      </DialogContent>
    </Dialog>
  );
}
