"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { FinancialSummaryBar } from "@/components/finance/financial-summary-bar";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentPreviewDialog } from "@/components/project/document-preview-dialog";
import { ProjectPartnersDialog } from "@/components/project/project-partners-dialog";
import { ProjectNicknameDialog } from "@/components/project/project-nickname-dialog";
import { ProjectTabs, isValidProjectTab } from "@/components/project/project-tabs";
import { EditExpenseDialog } from "@/components/finance/edit-expense-dialog";
import { getProjectDisplayName, getProjectSubtitle, PROJECT_LONG_NAME_CLASS } from "@/lib/project/display-name";
import { formatActivityDescription, isEditedActivity } from "@/lib/activity/format-activity";
import { useFetchStore } from "@/stores/fetch-store";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type ExpenseRow = {
  id: string;
  expenseDate: string;
  createdAt: string;
  amountPaise: string;
  description: string | null;
  isEdited?: boolean;
  vendor?: { name: string } | null;
  createdBy: { id: string; name: string };
  allocations?: Array<{ payment: { paidBy: { name: string } } }>;
};

type ProjectSummary = {
  project: {
    id: string;
    name: string;
    nickname?: string | null;
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
  const { user } = useAuthStore();
  const id = params.id;
  const rawTab = searchParams.get("tab") ?? "overview";
  const tab = isValidProjectTab(rawTab) ? rawTab : "overview";
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

  const { data: partnersMeta } = useFetch(`project:${id}:partners-meta`, () =>
    apiFetch<{ canInvite: boolean }>(`/api/v1/projects/${id}/partners`)
  );

  const { data: result, loading, error } = useFetch(`project:${id}:summary`, () =>
    apiFetch<ProjectSummary>(`/api/v1/projects/${id}/summary`)
  );

  const { data: expenses, refetch: refetchExpenses } = useFetch(
    tab === "expenses" ? `project:${id}:expenses` : null,
    () => apiFetch<ExpenseRow[]>(`/api/v1/expenses?projectId=${id}`)
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
          totalPaid: string;
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
          before?: unknown;
          after?: unknown;
          user: { name: string };
        }>
      >(`/api/v1/activity?projectId=${id}`)
  );

  const { data: invoicesData } = useFetch(
    tab === "invoices" ? `project:${id}:invoices` : null,
    () =>
      apiFetch<{
        items: Array<{
          id: string;
          billNumber: string;
          clientName: string | null;
          totalPaise: string;
          paymentMethod: string;
          createdAt: string;
          createdBy: { name: string };
        }>;
      }>(`/api/v1/projects/${id}/invoices`)
  );

  const latestOwnExpenseId = useMemo(() => {
    if (!expenses?.length || !user?.id) return null;
    const own = expenses.filter((e) => e.createdBy.id === user.id);
    if (!own.length) return null;
    return [...own].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0].id;
  }, [expenses, user?.id]);

  function isExpenseEditable(expense: ExpenseRow) {
    if (expense.id !== latestOwnExpenseId) return false;
    return Date.now() - new Date(expense.createdAt).getTime() <= EDIT_WINDOW_MS;
  }

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
  const displayName = getProjectDisplayName(project);
  const subtitle = getProjectSubtitle(project);
  const canEditProject = partnersMeta?.canInvite ?? false;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Work Order</p>
          <h1
            className={`text-2xl font-bold sm:text-3xl ${!subtitle ? PROJECT_LONG_NAME_CLASS : "leading-tight break-words"}`}
          >
            {displayName}
          </h1>
          {subtitle && (
            <p className={`text-sm text-muted-foreground ${PROJECT_LONG_NAME_CLASS}`}>{subtitle}</p>
          )}
          {project.workOrder && (
            <p className="text-muted-foreground">
              {woLabel} · {project.workOrder.clientName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${id}/invoices/new`}>
            <Button variant="outline" className="h-11 rounded-xl px-5">
              Client invoice
            </Button>
          </Link>
          <Link href={`/expenses/new?projectId=${id}`}>
            <Button className="h-11 rounded-xl px-5">Add Expense</Button>
          </Link>
          <ProjectNicknameDialog
            projectId={id}
            name={project.name}
            nickname={project.nickname ?? null}
            canEdit={canEditProject}
          />
          <ProjectPartnersDialog projectId={id} />
        </div>
      </div>

      <FinancialSummaryBar
        contractPaise={summary.contractAmountPaise}
        spentPaise={summary.totalExpensesPaise}
        remainingPaise={summary.remainingBudgetPaise}
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

      {tab === "invoices" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Client invoices</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tax invoices billed to the client — numbered per project.
              </p>
            </div>
            <Link href={`/projects/${id}/invoices/new`}>
              <Button className="h-10 rounded-xl">New invoice</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!invoicesData?.items?.length ? (
              <div className="space-y-4 p-6 text-center">
                <p className="text-muted-foreground">
                  No client invoices yet. Bill progress, milestones, or final amounts here.
                </p>
                <Link href={`/projects/${id}/invoices/new`}>
                  <Button className="h-11 rounded-xl">Create first invoice</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {invoicesData.items.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/projects/${id}/invoices/${inv.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40 sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{inv.billNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.clientName ?? "—"} ·{" "}
                        {new Date(inv.createdAt).toLocaleDateString("en-IN")} ·{" "}
                        {String(inv.paymentMethod).replace(/_/g, " ")} · {inv.createdBy.name}
                      </p>
                    </div>
                    <MoneyDisplay paise={inv.totalPaise} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "expenses" && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-0">
            {!expenses?.length ? (
              <div className="space-y-4 p-6 text-center">
                <p className="text-muted-foreground">No expenses for this work order yet.</p>
                <Link href={`/expenses/new?projectId=${id}`}>
                  <Button className="h-11 rounded-xl">Add your first expense</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {expenses.map((e) => {
                  const paidBy = e.allocations?.[0]?.payment?.paidBy?.name ?? null;
                  const canEdit = isExpenseEditable(e);
                  return (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{e.description?.trim() || "Expense"}</p>
                          {e.isEdited && (
                            <Badge variant="secondary" className="rounded-md text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(e.expenseDate).toLocaleDateString("en-IN")} ·{" "}
                          {e.vendor?.name ?? "No vendor"}
                          {paidBy ? ` · Paid by ${paidBy}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MoneyDisplay paise={e.amountPaise} />
                        {canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg"
                            onClick={() => setEditingExpense(e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <h2 className="text-lg font-semibold">{v.name}</h2>
                        <p className="text-sm text-muted-foreground">{v.phone ?? v.email ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Got from you</p>
                        <MoneyDisplay paise={v.totalPaid} className="text-lg text-primary" />
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
                <div key={log.id} className="flex flex-wrap items-start justify-between gap-2 p-4 sm:p-5">
                  <div>
                    <p className="font-medium">{formatActivityDescription(log)}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.entityType} · {new Date(log.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  {isEditedActivity(log) && (
                    <Badge variant="outline" className="shrink-0 rounded-md">
                      Edited
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {editingExpense && (
        <EditExpenseDialog
          open={Boolean(editingExpense)}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
          projectId={id}
          onSaved={() => {
            refetchExpenses(true);
            useFetchStore.getState().invalidatePrefix(`project:${id}:activity`);
          }}
        />
      )}
    </div>
  );
}
