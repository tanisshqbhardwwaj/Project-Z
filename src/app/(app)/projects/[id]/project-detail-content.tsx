"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoader } from "@/components/ui/page-loader";
import { FinancialSummaryBar } from "@/components/finance/financial-summary-bar";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentPreviewDialog } from "@/components/project/document-preview-dialog";
import { ProjectPartnersDialog } from "@/components/project/project-partners-dialog";
import { ProjectTabs, isValidProjectTab } from "@/components/project/project-tabs";

type ProjectSummary = {
  project: {
    id: string;
    name: string;
    status: string;
    location: string | null;
    completionPercent: number;
    expectedCompletionDate: string | null;
    workOrder?: {
      workOrderNumber: string;
      clientName: string;
      headOfAccount: string | null;
      timeOfCompletion: string | null;
      workOrderDate: string;
      paymentTerms: string | null;
    } | null;
  };
  summary: {
    contractAmountPaise: string;
    totalExpensesPaise: string;
    remainingBudgetPaise: string;
    vendorOutstandingPaise: string;
    expectedProfitPaise: string;
    actualProfitPaise: string;
    budgetUtilizationPercent: number;
  };
  partnerSpending: Array<{
    userId: string;
    userName: string;
    totalPaidPaise: string;
  }>;
};

export default function ProjectDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const rawTab = searchParams.get("tab") ?? "overview";
  const tab = isValidProjectTab(rawTab) ? rawTab : "overview";

  const { data: result, loading, error } = useFetch(`project:${id}:summary`, () =>
    apiFetch<ProjectSummary>(`/api/v1/projects/${id}/summary`)
  );

  const { data: expenses } = useFetch(
    tab === "expenses" ? `project:${id}:expenses` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          expenseDate: string;
          amountPaise: string;
          description: string | null;
          vendor?: { name: string } | null;
          createdBy: { name: string };
          allocations?: Array<{
            payment: { paidBy: { name: string } };
          }>;
        }>
      >(`/api/v1/expenses?projectId=${id}`)
  );

  const { data: payments } = useFetch(
    tab === "payments" ? `project:${id}:payments` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          paymentDate: string;
          amountPaise: string;
          paidBy: { name: string };
          vendor?: { name: string } | null;
        }>
      >(`/api/v1/payments?projectId=${id}`)
  );

  const { data: vendors } = useFetch(
    tab === "vendors" ? `project:${id}:vendors` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          outstanding: string;
        }>
      >(`/api/v1/projects/${id}/vendors`)
  );

  const { data: documents } = useFetch(
    tab === "documents" ? `project:${id}:documents` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          fileName: string;
          documentType: string;
          createdAt: string;
          uploadedBy: { name: string };
        }>
      >(`/api/v1/projects/${id}/documents`)
  );

  const { data: activity } = useFetch(
    tab === "activity" ? `project:${id}:activity` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          action: string;
          entityType: string;
          createdAt: string;
          user: { name: string };
        }>
      >(`/api/v1/activity?projectId=${id}`)
  );

  const woLabel = useMemo(() => {
    if (!result?.project.workOrder?.workOrderNumber) return result?.project.name;
    return `WO #${result.project.workOrder.workOrderNumber}`;
  }, [result]);

  if (loading) return <PageLoader label="Loading project..." />;
  if (error || !result) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "Project not found"}</p>
        <Link href="/projects">
          <Button variant="outline">Back to projects</Button>
        </Link>
      </div>
    );
  }

  const { project, summary, partnerSpending } = result;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Work Order</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{project.name}</h1>
          {project.workOrder && (
            <p className="text-muted-foreground">
              {woLabel} · {project.workOrder.clientName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/expenses/new?projectId=${id}`}>
            <Button className="rounded-xl">Add Expense</Button>
          </Link>
          <ProjectPartnersDialog projectId={id} />
        </div>
      </div>

      <FinancialSummaryBar
        contractPaise={summary.contractAmountPaise}
        spentPaise={summary.totalExpensesPaise}
        remainingPaise={summary.remainingBudgetPaise}
        outstandingPaise={summary.vendorOutstandingPaise}
      />

      <ProjectTabs projectId={id} activeTab={tab} />

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle>Work Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-base">
              <p>
                <span className="text-muted-foreground">Status:</span> {project.status}
              </p>
              <p>
                <span className="text-muted-foreground">Client:</span>{" "}
                {project.workOrder?.clientName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span> {project.location ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Completion:</span>{" "}
                {project.completionPercent}%
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex justify-between">
                Tender Amount <MoneyDisplay paise={summary.contractAmountPaise} />
              </p>
              <p className="flex justify-between">
                Spent <MoneyDisplay paise={summary.totalExpensesPaise} />
              </p>
              <p className="flex justify-between">
                Expected Profit <MoneyDisplay paise={summary.expectedProfitPaise} />
              </p>
              <p className="flex justify-between">
                Actual Profit <MoneyDisplay paise={summary.actualProfitPaise} />
              </p>
              <p className="flex justify-between">Budget Used {summary.budgetUtilizationPercent}%</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md md:col-span-2">
            <CardHeader>
              <CardTitle>Spent by Partner</CardTitle>
              <p className="text-sm text-muted-foreground">
                How much each person has paid from their pocket on this work order.
              </p>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {!partnerSpending?.length ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No partner payments recorded yet. Add an expense and select who paid.
                </p>
              ) : (
                partnerSpending.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between px-6 py-4">
                    <p className="font-medium">{p.userName}</p>
                    <MoneyDisplay paise={p.totalPaidPaise} className="text-lg" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "work-order" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="space-y-2 p-6 text-base">
            {project.workOrder ? (
              <>
                <p>
                  <strong>WO #:</strong> {project.workOrder.workOrderNumber}
                </p>
                <p>
                  <strong>Client:</strong> {project.workOrder.clientName}
                </p>
                <p>
                  <strong>Head of Account:</strong> {project.workOrder.headOfAccount ?? "—"}
                </p>
                <p>
                  <strong>Time of Completion:</strong> {project.workOrder.timeOfCompletion ?? "—"}
                </p>
                <p>
                  <strong>Expected Completion:</strong>{" "}
                  {project.expectedCompletionDate
                    ? new Date(project.expectedCompletionDate).toLocaleDateString("en-IN")
                    : "—"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(project.workOrder.workOrderDate).toLocaleDateString("en-IN")}
                </p>
                <p>
                  <strong>Payment Terms:</strong> {project.workOrder.paymentTerms ?? "—"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No work order document linked yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "expenses" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-0">
            {!expenses?.length ? (
              <p className="p-6 text-muted-foreground">No expenses for this work order yet.</p>
            ) : (
              <div className="divide-y">
                {expenses.map((e) => {
                  const paidBy =
                    e.allocations?.[0]?.payment?.paidBy?.name ?? null;
                  return (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div>
                        <p className="font-medium">
                          {e.description?.trim() || "Expense"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(e.expenseDate).toLocaleDateString("en-IN")} ·{" "}
                          {e.vendor?.name ?? "No vendor"}
                          {paidBy ? ` · Paid by ${paidBy}` : " · Unpaid"}
                        </p>
                      </div>
                      <MoneyDisplay paise={e.amountPaise} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "payments" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-0">
            {!payments?.length ? (
              <p className="p-6 text-muted-foreground">No payments for this work order yet.</p>
            ) : (
              <div className="divide-y">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-medium">{p.paidBy.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN")} ·{" "}
                        {p.vendor?.name ?? "Settlement"}
                      </p>
                    </div>
                    <MoneyDisplay paise={p.amountPaise} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "vendors" && (
        <div className="space-y-4">
          {!vendors?.length ? (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 text-muted-foreground">
                No vendors linked yet. Add an expense with a vendor to see them here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {vendors.map((v) => (
                <Link key={v.id} href={`/projects/${id}/vendors/${v.id}`}>
                  <Card className="rounded-2xl border-0 shadow-md transition-colors hover:bg-accent/50">
                    <CardContent className="flex justify-between p-5">
                      <div>
                        <h2 className="text-lg font-semibold">{v.name}</h2>
                        <p className="text-sm text-muted-foreground">{v.phone ?? v.email ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <MoneyDisplay paise={v.outstanding} className="text-lg text-amber-600" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="divide-y p-0">
            {!documents?.length ? (
              <p className="p-6 text-muted-foreground">No documents for this work order yet.</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{d.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.documentType} · {d.uploadedBy.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    <DocumentPreviewDialog documentId={d.id} fileName={d.fileName} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "reports" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle>Expense Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/api/v1/reports/expenses?format=csv&projectId=${id}`}>
                <Button variant="outline" className="rounded-xl">
                  Export CSV
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "activity" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="divide-y p-0">
            {!activity?.length ? (
              <p className="p-6 text-muted-foreground">No activity for this work order yet.</p>
            ) : (
              activity.map((log) => (
                <div key={log.id} className="p-4">
                  <p className="font-medium">
                    {log.user.name} — {log.action}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {log.entityType} · {new Date(log.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
