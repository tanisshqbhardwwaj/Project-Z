"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoader } from "@/components/ui/page-loader";
import { MoneyDisplay } from "@/components/finance/money-display";
import { WorkOrderListActions } from "@/components/project/work-order-list-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectDisplayName,
  getProjectSubtitle,
  isActiveProjectStatus,
  PROJECT_LONG_NAME_CLASS,
  projectStatusLabel,
} from "@/lib/project/display-name";
import { useBusinessType } from "@/hooks/use-business-type";

type ProjectItem = {
  id: string;
  name: string;
  nickname?: string | null;
  status: string;
  contractAmountPaise: string;
  workOrder?: { clientName: string; workOrderNumber: string } | null;
};

type StatusFilter = "active" | "completed";

export default function ProjectsPage() {
  const biz = useBusinessType();
  const [filter, setFilter] = useState<StatusFilter>("active");
  const { data: projects, loading, error } = useFetch("projects", () =>
    apiFetch<ProjectItem[]>("/api/v1/projects")
  );

  const filtered = useMemo(() => {
    const list = projects ?? [];
    return list.filter((p) =>
      filter === "active" ? isActiveProjectStatus(p.status) : p.status === "COMPLETED"
    );
  }, [projects, filter]);

  if (loading) return <PageLoader label={`Loading ${biz.workItemPlural.toLowerCase()}...`} />;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{biz.workItemPlural}</h1>
          <p className="text-sm text-muted-foreground">
            Tap a card to open · + for new {biz.workItemSingularLower}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {biz.showDocumentUpload && (
            <Link href="/work-orders/new">
              <Button variant="outline" className="h-11 rounded-xl">
                {biz.newWorkItemLabel}
              </Button>
            </Link>
          )}
          {biz.showManualCreate && (
            <Link href="/projects/new">
              <Button className="h-11 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                {biz.manualCreateLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={filter === "active" ? "default" : "outline"}
          className="h-10 flex-1 rounded-xl sm:flex-none sm:px-6"
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button
          type="button"
          variant={filter === "completed" ? "default" : "outline"}
          className="h-10 flex-1 rounded-xl sm:flex-none sm:px-6"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">
              {filter === "active" ? biz.emptyActiveMessage : biz.emptyCompletedMessage}
            </p>
            {filter === "active" && biz.showDocumentUpload && (
              <Link href="/work-orders/new">
                <Button size="lg" className="h-12 rounded-xl">
                  {biz.uploadWorkItemLabel}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filtered.map((p) => {
            const title = getProjectDisplayName(p);
            const subtitle = getProjectSubtitle(p);
            const statusLabel = projectStatusLabel(p.status);
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
                    status={p.status}
                  />
                </div>
                <CardContent className="p-5 pr-14">
                  <Link href={`/projects/${p.id}`} className="block min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={cn(
                              "text-lg font-semibold",
                              !subtitle ? PROJECT_LONG_NAME_CLASS : "break-words leading-snug"
                            )}
                          >
                            {title}
                          </h2>
                          <Badge
                            variant={statusLabel === "Completed" ? "secondary" : "default"}
                            className="shrink-0 rounded-lg"
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                        {subtitle && (
                          <p className={cn("mt-0.5 text-sm text-muted-foreground", PROJECT_LONG_NAME_CLASS)}>
                            {subtitle}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {p.workOrder?.clientName ?? "—"}
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
