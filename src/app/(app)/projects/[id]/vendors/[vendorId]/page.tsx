"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoader } from "@/components/ui/page-loader";
import { VendorTotalCard } from "@/components/finance/vendor-total-card";
import { ProjectTabs } from "@/components/project/project-tabs";

type VendorSummaryData = {
  vendor: { name: string };
  totalPaid: string;
};

export default function ProjectVendorPage() {
  const params = useParams<{ id: string; vendorId: string }>();
  const { id, vendorId } = params;

  const { data: summary, loading: summaryLoading } = useFetch(`project:${id}:summary`, () =>
    apiFetch<{ project: { name: string } }>(`/api/v1/projects/${id}/summary`)
  );

  const { data: vendorData, loading: vendorLoading, error } = useFetch(
    `vendor:${vendorId}:ledger:${id}`,
    () => apiFetch<VendorSummaryData>(`/api/v1/vendors/${vendorId}/ledger?projectId=${id}`)
  );

  if (summaryLoading || vendorLoading) return <PageLoader label="Loading..." />;
  if (error || !vendorData || !summary) {
    return <p className="text-destructive">{error ?? "Could not load this vendor"}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}?tab=vendors`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to vendors
        </Link>
        <h1 className="text-2xl font-bold">{vendorData.vendor.name}</h1>
        <p className="text-muted-foreground">{summary.project.name}</p>
      </div>

      <ProjectTabs projectId={id} activeTab="vendors" />

      <VendorTotalCard
        vendorName={vendorData.vendor.name}
        totalPaidPaise={vendorData.totalPaid}
        projectId={id}
        vendorId={vendorId}
      />
    </div>
  );
}
