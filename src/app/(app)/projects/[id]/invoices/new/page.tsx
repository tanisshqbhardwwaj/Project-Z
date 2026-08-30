"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { ProjectInvoiceForm } from "@/components/project/project-invoice-form";
import { getProjectDisplayName } from "@/lib/project/display-name";

type ProjectSummary = {
  project: {
    id: string;
    name: string;
    nickname?: string | null;
    workOrder?: { clientName: string } | null;
  };
};

function NewProjectInvoiceContent() {
  const params = useParams();
  const projectId = params.id as string;
  const { activeOrganizationName, user } = useAuthStore();

  const { data, loading, error } = useFetch(`project:${projectId}:summary`, () =>
    apiFetch<ProjectSummary>(`/api/v1/projects/${projectId}/summary`)
  );

  if (loading) return <PageLoader label="Loading project…" />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "Project not found"}</p>
        <Link href={`/projects/${projectId}?tab=invoices`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  const { project } = data;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/projects/${projectId}?tab=invoices`} className="hover:underline">
            {getProjectDisplayName(project)}
          </Link>
          {" · "}Client invoice
        </p>
        <h1 className="text-2xl font-bold">New client invoice</h1>
        <p className="text-sm text-muted-foreground">
          Bill numbers are numbered separately for this project (not shared with shop sales).
        </p>
      </div>

      <ProjectInvoiceForm
        projectId={projectId}
        orgName={activeOrganizationName ?? "Organization"}
        cashierName={user?.name}
        defaultClientName={project.workOrder?.clientName ?? null}
      />
    </div>
  );
}

export default function NewProjectInvoicePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <NewProjectInvoiceContent />
    </Suspense>
  );
}
