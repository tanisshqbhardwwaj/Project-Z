"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  History,
  Pencil,
  Plus,
  Repeat,
  SkipForward,
  Undo2,
} from "lucide-react";

type Occurrence = {
  id: string;
  recurringId: string;
  name: string;
  categoryName: string;
  periodLabel: string;
  dueDate: string;
  daysUntilDue: number;
  dueLabel: string;
  amountPaise: string;
  status: "UPCOMING" | "PENDING" | "PAID" | "SKIPPED";
  urgency: "paid" | "skipped" | "overdue" | "due-today" | "due-soon" | "upcoming";
  paidAt: string | null;
  paidAmountPaise: string | null;
  paymentMethod: string | null;
  notes: string | null;
  reminderDaysBefore: number;
};

type Rule = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  monthlyAmountPaise: string;
  dueDay: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  reminderDaysBefore: number;
  paymentMethod: string | null;
  notes: string | null;
  nextDue: Occurrence | null;
};

type Overview = {
  upcoming: Occurrence[];
  pending: Occurrence[];
  history: Occurrence[];
  rules: Rule[];
  totals: {
    upcomingPaise: string;
    pendingPaise: string;
    overdueCount: number;
    dueTodayCount: number;
    dueSoonCount: number;
    monthlyCommitmentPaise: string;
  };
};

type ExpenseCategory = { id: string; name: string };

const PAYMENT_METHODS = ["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"] as const;

const URGENCY_STYLES: Record<Occurrence["urgency"], string> = {
  overdue:
    "border-destructive/40 bg-destructive/5 text-destructive dark:bg-destructive/10",
  "due-today":
    "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  "due-soon":
    "border-amber-300 bg-amber-50/60 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200",
  upcoming: "border-border bg-background",
  paid: "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
  skipped: "border-border bg-muted/40",
};

type SubTab = "upcoming" | "pending" | "paid" | "rules";

export function RecurringExpensePanel({
  orgId,
  categories,
  canManage,
  variant = "full",
}: {
  orgId: string | null;
  categories: ExpenseCategory[];
  canManage: boolean;
  /** full = legacy dashboard; summary = due badges on Today/History; inline-form = create inside Add expense */
  variant?: "full" | "summary" | "inline-form";
}) {
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [subTab, setSubTab] = useState<SubTab>("upcoming");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [payTarget, setPayTarget] = useState<Occurrence | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  // Rule form
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [reminderDays, setReminderDays] = useState("3");
  const [ruleMethod, setRuleMethod] = useState<string>("CASH");
  const [ruleNotes, setRuleNotes] = useState("");

  const overviewKey = orgId
    ? [...queryKeys.modules.shop.expenses(orgId), "recurring"]
    : ["disabled"];

  const overviewQuery = useQuery({
    queryKey: overviewKey,
    queryFn: () => apiFetch<Overview>("/api/v1/shop/expenses/recurring"),
    enabled: !!orgId,
  });

  function invalidate() {
    if (!orgId) return;
    qc.invalidateQueries({ queryKey: overviewKey });
    qc.invalidateQueries({ queryKey: queryKeys.modules.shop.expenses(orgId) });
    qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
  }

  const saveRuleMutation = useMutation({
    mutationFn: ({
      ruleId,
      body,
    }: {
      ruleId?: string;
      body: Record<string, unknown>;
    }) =>
      apiFetch(
        ruleId
          ? `/api/v1/shop/expenses/recurring/${ruleId}`
          : "/api/v1/shop/expenses/recurring",
        { method: ruleId ? "PATCH" : "POST", body: JSON.stringify(body) }
      ),
    onSuccess: invalidate,
  });

  const occurrenceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/expenses/recurring/occurrences", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      apiFetch(`/api/v1/shop/expenses/recurring/${ruleId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function resetRuleForm() {
    setName("");
    setCategoryId(categories[0]?.id ?? "");
    setAmount("");
    setDueDay("5");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setReminderDays("3");
    setRuleMethod("CASH");
    setRuleNotes("");
    setEditingRule(null);
    clear();
  }

  function openRuleDialog(rule?: Rule) {
    clear();
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setCategoryId(rule.categoryId);
      setAmount(String(Number(rule.monthlyAmountPaise) / 100));
      setDueDay(String(rule.dueDay));
      setStartDate(rule.startDate.slice(0, 10));
      setEndDate(rule.endDate?.slice(0, 10) ?? "");
      setReminderDays(String(rule.reminderDaysBefore));
      setRuleMethod(rule.paymentMethod ?? "CASH");
      setRuleNotes(rule.notes ?? "");
    } else {
      resetRuleForm();
      setCategoryId(categories[0]?.id ?? "");
    }
    setRuleDialogOpen(true);
  }

  async function saveRule() {
    clear();
    if (!name.trim()) return showWarning("Give this expense a name, e.g. Shop Rent");
    if (!categoryId) return showWarning("Pick a category");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return showWarning("Enter a valid amount");

    try {
      await saveRuleMutation.mutateAsync({
        ruleId: editingRule?.id,
        body: {
          name: name.trim(),
          categoryId,
          monthlyAmountRupees: amt,
          dueDay: Number(dueDay) || 1,
          startDate,
          endDate: endDate || null,
          reminderDaysBefore: Number(reminderDays) || 0,
          paymentMethod: ruleMethod,
          notes: ruleNotes.trim() || null,
        },
      });
      setRuleDialogOpen(false);
      resetRuleForm();
    } catch (err) {
      applyError(err, "Could not save this recurring expense");
    }
  }

  async function markPaid() {
    if (!payTarget) return;
    clear();
    try {
      await occurrenceMutation.mutateAsync({
        occurrenceId: payTarget.id,
        action: "pay",
        paidAmountRupees: payAmount ? Number(payAmount) : undefined,
        paymentMethod: payMethod,
        paidAt: payDate,
        notes: payNotes.trim() || null,
      });
      setPayTarget(null);
      setPayAmount("");
      setPayNotes("");
    } catch (err) {
      applyError(err, "Could not record this payment");
    }
  }

  async function runAction(occurrenceId: string, action: "skip" | "reopen") {
    clear();
    try {
      await occurrenceMutation.mutateAsync({ occurrenceId, action });
    } catch (err) {
      applyError(err, "Could not update this payment");
    }
  }

  if (overviewQuery.isLoading) {
    return <PageLoader label="Loading recurring expenses..." />;
  }
  if (overviewQuery.error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {overviewQuery.error instanceof Error
          ? overviewQuery.error.message
          : "Failed to load recurring expenses"}
      </p>
    );
  }

  const data = overviewQuery.data;
  if (!data) return null;

  const openItems = [...data.pending, ...data.upcoming];

  function OccurrenceCard({ occurrence }: { occurrence: Occurrence }) {
    const isOpen = occurrence.status === "UPCOMING" || occurrence.status === "PENDING";
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
          URGENCY_STYLES[occurrence.urgency]
        )}
      >
        <div className="min-w-0">
          <p className="font-medium">{occurrence.name}</p>
          <p className="text-xs opacity-80">
            {occurrence.periodLabel} · {occurrence.categoryName} · due{" "}
            {new Date(occurrence.dueDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {occurrence.status === "PAID" ? (
              <Badge className="rounded-full bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                Paid
                {occurrence.paidAt
                  ? ` ${new Date(occurrence.paidAt).toLocaleDateString("en-IN")}`
                  : ""}
              </Badge>
            ) : occurrence.status === "SKIPPED" ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Skipped
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full text-[10px] capitalize",
                  occurrence.urgency === "overdue" &&
                    "bg-destructive/15 text-destructive hover:bg-destructive/15"
                )}
              >
                {occurrence.dueLabel}
              </Badge>
            )}
            {occurrence.paymentMethod ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                {occurrence.paymentMethod}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tabular-nums">
            {formatINR(occurrence.paidAmountPaise ?? occurrence.amountPaise)}
          </span>
          {canManage ? (
            isOpen ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  onClick={() => {
                    setPayTarget(occurrence);
                    setPayAmount(String(Number(occurrence.amountPaise) / 100));
                    setPayMethod(occurrence.paymentMethod ?? "CASH");
                    setPayDate(new Date().toISOString().slice(0, 10));
                  }}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Mark paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-lg px-0"
                  title="Not paid this month"
                  onClick={() => void runAction(occurrence.id, "skip")}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5 text-xs"
                onClick={() => void runAction(occurrence.id, "reopen")}
              >
                <Undo2 className="mr-1 h-3.5 w-3.5" />
                Reopen
              </Button>
            )
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === "summary") {
    if (openItems.length === 0 && data.totals.overdueCount === 0) return null;
    return (
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Repeat className="h-4 w-4" />
              Recurring expenses
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {data.totals.overdueCount > 0 ? (
                <Badge variant="destructive" className="rounded-full">
                  {data.totals.overdueCount} overdue
                </Badge>
              ) : null}
              {data.totals.dueTodayCount > 0 ? (
                <Badge className="rounded-full bg-amber-500 hover:bg-amber-500">
                  {data.totals.dueTodayCount} due today
                </Badge>
              ) : null}
            </div>
          </div>
          <FormFeedback warning={warning} error={error} />
          <div className="space-y-2">
            {openItems.slice(0, 5).map((occurrence) => (
              <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "inline-form") {
    return (
      <div className="space-y-4">
        <FormFeedback warning={warning} error={error} />
        <div className="space-y-3 rounded-2xl border p-4">
          <p className="text-sm text-muted-foreground">
            Set a monthly rule once — each month you mark it paid from Today or History.
          </p>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Shop rent"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount ₹ per month</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Due day of month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remind days before</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <Button
            className="h-11 w-full rounded-xl"
            onClick={saveRule}
            disabled={saveRuleMutation.isPending}
          >
            {saveRuleMutation.isPending ? "Saving…" : "Create recurring expense"}
          </Button>
        </div>
        {data.rules.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Active rules</p>
            {data.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
              >
                <span>{rule.name}</span>
                <span className="font-medium tabular-nums">
                  {formatINR(rule.monthlyAmountPaise)}/mo
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const lists: Record<Exclude<SubTab, "rules">, Occurrence[]> = {
    upcoming: data.upcoming,
    pending: data.pending,
    paid: data.history,
  };

  return (
    <div className="space-y-4">
      <FormFeedback warning={warning} error={error} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly commitment</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatINR(data.totals.monthlyCommitmentPaise)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "rounded-2xl border-0 shadow-sm",
            data.totals.overdueCount > 0 && "bg-destructive/5"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {data.totals.overdueCount}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "rounded-2xl border-0 shadow-sm",
            data.totals.dueTodayCount > 0 && "bg-amber-50 dark:bg-amber-950/20"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Due today</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {data.totals.dueTodayCount}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reminder window</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {data.totals.dueSoonCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.totals.overdueCount > 0 || data.totals.dueTodayCount > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            {data.totals.dueTodayCount > 0
              ? `${data.totals.dueTodayCount} payment${data.totals.dueTodayCount === 1 ? " is" : "s are"} due today. `
              : ""}
            {data.totals.overdueCount > 0
              ? `${data.totals.overdueCount} payment${data.totals.overdueCount === 1 ? " is" : "s are"} past due. `
              : ""}
            Mark each month paid as it happens — future months stay pending on
            their own.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["upcoming", "Upcoming", CalendarClock, data.upcoming.length],
              ["pending", "Pending", AlarmClock, data.pending.length],
              ["paid", "Paid", History, data.history.length],
              ["rules", "Recurring rules", Repeat, data.rules.length],
            ] as const
          ).map(([key, label, Icon, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                subTab === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label} ({count})
            </button>
          ))}
        </div>
        {canManage ? (
          <Button className="rounded-xl" onClick={() => openRuleDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Recurring expense
          </Button>
        ) : null}
      </div>

      {subTab === "rules" ? (
        data.rules.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <Repeat className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No recurring expenses yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add rent, electricity or internet once and the app will remind you
              every month and track which months are paid.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
                  !rule.isActive && "opacity-60"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatINR(rule.monthlyAmountPaise)} · monthly · due every{" "}
                    {rule.dueDay}
                    {rule.dueDay === 1
                      ? "st"
                      : rule.dueDay === 2
                        ? "nd"
                        : rule.dueDay === 3
                          ? "rd"
                          : "th"}{" "}
                    · {rule.categoryName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {rule.isActive ? (
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        Paused
                      </Badge>
                    )}
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      Remind {rule.reminderDaysBefore}d before
                    </Badge>
                    {rule.nextDue ? (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        Next: {rule.nextDue.periodLabel} · {rule.nextDue.dueLabel}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() =>
                        void saveRuleMutation.mutateAsync({
                          ruleId: rule.id,
                          body: { isActive: !rule.isActive },
                        })
                      }
                    >
                      {rule.isActive ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 rounded-lg px-0"
                      onClick={() => openRuleDialog(rule)}
                      title={`Edit ${rule.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteIconButton
                      onClick={() => setDeleteTarget(rule)}
                      title={`Remove ${rule.name}`}
                      aria-label={`Remove ${rule.name}`}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : lists[subTab].length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">
            {subTab === "upcoming"
              ? "Nothing coming up"
              : subTab === "pending"
                ? "Nothing pending — you are all paid up"
                : "No payment history yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subTab === "pending"
              ? "Payments appear here on their due date."
              : "Add a recurring expense to start tracking."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lists[subTab].map((occurrence) => (
            <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
          ))}
        </div>
      )}

      {/* Rule dialog */}
      <Dialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open);
          if (!open) resetRuleForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit recurring expense" : "New recurring expense"}
            </DialogTitle>
            <DialogDescription>
              Set it once. Each month gets its own payment to mark paid, and the
              rule keeps going.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="Shop Rent"
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Amount ₹ per month</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="25000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Due day of month</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Shorter months fall back to the last day.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Remind me days before</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ends (optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Usual payment method</Label>
                <select
                  value={ruleMethod}
                  onChange={(e) => setRuleMethod(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  value={ruleNotes}
                  onChange={(e) => setRuleNotes(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <FormFeedback warning={warning} error={error} />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setRuleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={saveRule}
              disabled={saveRuleMutation.isPending}
            >
              {saveRuleMutation.isPending
                ? "Saving…"
                : editingRule
                  ? "Save changes"
                  : "Create recurring expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {payTarget?.name} — {payTarget?.periodLabel}
            </DialogTitle>
            <DialogDescription>
              {payTarget
                ? `${formatINR(payTarget.amountPaise)} was ${payTarget.dueLabel}. Has this payment been made?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Amount paid ₹</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Paid on</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This records the payment for {payTarget?.periodLabel} only and posts
              a matching expense entry. Later months stay pending.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setPayTarget(null)}
            >
              Not yet
            </Button>
            <Button
              className="rounded-xl"
              onClick={markPaid}
              disabled={occurrenceMutation.isPending}
            >
              {occurrenceMutation.isPending ? "Saving…" : "Mark as paid"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete rule */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Future months stop being generated. Payments already marked paid stay
              in your expense history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteRuleMutation.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                clear();
                try {
                  await deleteRuleMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                } catch (err) {
                  applyError(err, "Could not remove this recurring expense");
                  setDeleteTarget(null);
                }
              }}
            >
              {deleteRuleMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
