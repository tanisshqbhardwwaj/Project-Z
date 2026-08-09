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
import { getProjectDisplayName, getProjectSubtitle, PROJECT_LONG_NAME_CLASS } from "@/lib/project/display-name";

type ProjectItem = {
  id: string;
  name: string;
  nickname?: string | null;
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
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Work Orders</h1>
          <p className="text-sm text-muted-foreground">Tap a card to open · + for new work order</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/work-orders/new">
            <Button variant="outline" className="h-11 rounded-xl">
              New Work Order
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button className="h-11 rounded-xl">
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
              <Button size="lg" className="h-12 rounded-xl">
                Upload Work Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {list.map((p) => {
            const title = getProjectDisplayName(p);
            const subtitle = getProjectSubtitle(p);
            return (
              <Card
                key={p.id}
                className="relative rounded-2xl border-0 shadow-md transition-colors hover:bg-accent/50 active:scale-[0.99]"
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <h2
                          className={`text-lg font-semibold ${!subtitle ? PROJECT_LONG_NAME_CLASS : "break-words leading-snug"}`}
                        >
                          {title}
                        </h2>
                        {subtitle && (
                          <p
                            className={`mt-0.5 text-sm text-muted-foreground ${PROJECT_LONG_NAME_CLASS}`}
                          >
                            {subtitle}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {p.workOrder?.clientName ?? "—"} · {p.status}
                        </p>
                      </div>
                      <MoneyDisplay
                        paise={p.contractAmountPaise}
                        className="shrink-0 text-lg sm:text-right"
                      />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
