"use client";

import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoader } from "@/components/ui/page-loader";
import { MoneyDisplay } from "@/components/finance/money-display";
import { WorkOrderListActions } from "@/components/project/work-order-list-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

type ProjectItem = {
  id: string;
  name: string;
  status: string;
  contractAmountPaise: string;
  workOrder?: { clientName: string; workOrderNumber: string } | null;
};

export default function ProjectsPage() {
  const { data: projects, loading, error } = useFetch("projects", () =>
    apiFetch<ProjectItem[]>("/api/v1/projects")
  );

  if (loading) return <PageLoader label="Loading work orders..." />;
  if (error) return <p className="text-destructive">{error}</p>;

  const list = projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Work Orders</h1>
        <div className="flex gap-2">
          <Link href="/work-orders/new">
            <Button variant="outline" className="rounded-xl">
              New Work Order
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Manual Project
            </Button>
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">No work orders yet.</p>
            <Link href="/work-orders/new">
              <Button size="lg" className="rounded-xl">
                Upload Work Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {list.map((p) => (
            <Card
              key={p.id}
              className="relative rounded-2xl border-0 shadow-md transition-colors hover:bg-accent/50"
            >
              <div className="absolute right-3 top-3 z-10">
                <WorkOrderListActions
                  projectId={p.id}
                  projectName={p.name}
                  workOrderNumber={p.workOrder?.workOrderNumber}
                />
              </div>
              <CardContent className="p-5 pr-14">
                <Link href={`/projects/${p.id}`} className="block min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{p.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {p.workOrder?.clientName ?? "—"} · {p.status}
                      </p>
                    </div>
                    <MoneyDisplay
                      paise={p.contractAmountPaise}
                      className="shrink-0 text-lg"
                    />
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
