"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Wallet } from "lucide-react";
import { RecurringExpensePanel } from "@/components/shop/recurring-expense-panel";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

type ExpenseCategory = { id: string; name: string };
type ExpenseRow = {
  id: string;
  expenseDate: string;
  title: string;
  amountPaise: string;
  expenseType: string;
  paymentMethod: string;
  category: { name: string };
  createdBy: { name: string };
};
type ExpenseList = { items: ExpenseRow[]; total: number };

type TabKey = "daily" | "recurring" | "history" | "add";

export default function ShopExpensesPage() {
  const { activeBusinessType, activeOrganizationId, enabledModules, role } = useAuthStore();
  const orgId = activeOrganizationId;
  const enabled = isModuleEnabled(enabledModules, "shop_expenses");
  const canManage = hasPermission(role as OrgRole, "shop.expense.manage");
  const title = moduleLabel("shop_expenses", activeBusinessType ?? "SHOPKEEPER");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(
    searchParams.get("tab") === "recurring" ? "recurring" : "daily"
  );
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseType, setExpenseType] = useState<"DAILY" | "MONTHLY" | "ONE_TIME">("DAILY");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("q", search.trim());
    if (categoryId) p.set("categoryId", categoryId);
    if (tab === "daily") {
      p.set("from", today);
      p.set("to", today);
    }
    return `?${p.toString()}`;
  }, [search, categoryId, tab, today]);

  const categoriesQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.expenseCategories(orgId) : ["disabled"],
    queryFn: () => apiFetch<ExpenseCategory[]>("/api/v1/shop/expenses/categories"),
    enabled: !!orgId && enabled,
  });

  const expensesQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.expenses(orgId), tab, search, categoryId] : ["disabled"],
    queryFn: () => apiFetch<ExpenseList>(`/api/v1/shop/expenses${queryString}`),
    enabled: !!orgId && enabled,
  });

  const profitQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.profit(orgId, "today") : ["disabled"],
    queryFn: () => apiFetch<{ expensePaise: string; grossProfitPaise: string; netProfitPaise: string }>("/api/v1/shop/profit?period=today"),
    enabled: !!orgId && enabled,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/expenses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.expenses(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.profit(orgId, "today") });
      }
      setTitleInput("");
      setAmount("");
      setTab("daily");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (body: { name: string }) =>
      apiFetch<ExpenseCategory>("/api/v1/shop/expenses/categories", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (cat) => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.expenseCategories(orgId) });
      setSelectedCategoryId(cat.id);
      setNewCategoryName("");
    },
  });

  if (!enabled) {
    return <p className="text-muted-foreground">Turn on {title} in Manage Organization → Features.</p>;
  }

  if (categoriesQuery.isLoading || expensesQuery.isLoading) {
    return <PageLoader label="Loading expenses..." />;
  }

  const expenses = expensesQuery.data?.items ?? [];
  const todayTotal = expenses.reduce((s, e) => s + Number(e.amountPaise), 0);

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (!selectedCategoryId) return showWarning("Select a category");
    if (!titleInput.trim()) return showWarning("Enter expense title");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return showWarning("Enter a valid amount");
    try {
      await createMutation.mutateAsync({
        categoryId: selectedCategoryId,
        expenseDate,
        title: titleInput.trim(),
        amountRupees: amt,
        expenseType,
      });
    } catch (err) {
      applyError(err, "Failed to save expense");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Daily and monthly store expenses</p>
        </div>
        <Link href="/shop/expenses/report">
          <Button variant="outline" className="rounded-xl">Profit & expense report</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today&apos;s expenses</p>
            <p className="text-2xl font-bold">{formatINR(todayTotal)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gross profit (today)</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatINR(profitQuery.data?.grossProfitPaise ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net profit (today)</p>
            <p className="text-2xl font-bold">{formatINR(profitQuery.data?.netProfitPaise ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["daily", "Today"],
            ["recurring", "Recurring"],
            ["history", "History"],
            ...(canManage ? ([["add", "Add expense"]] as const) : []),
          ] as ReadonlyArray<readonly [TabKey, string]>
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <FormFeedback warning={warning} error={error} />

      {tab === "recurring" && (
        <RecurringExpensePanel
          orgId={orgId}
          categories={categoriesQuery.data ?? []}
          canManage={canManage}
        />
      )}

      {tab === "add" && canManage && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">New expense</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitExpense} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    {(categoriesQuery.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>New category</Label>
                  <div className="flex gap-2">
                    <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-11 rounded-xl" />
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => newCategoryName.trim() && createCategoryMutation.mutate({ name: newCategoryName.trim() })}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label>Amount ₹</Label>
                  <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl" required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select value={expenseType} onChange={(e) => setExpenseType(e.target.value as typeof expenseType)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly / recurring</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save expense"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(tab === "daily" || tab === "history") && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              {tab === "daily" ? "Today's expenses" : "Expense history"}
            </CardTitle>
            {tab === "history" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-11 rounded-xl pl-9" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Expense</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(e.expenseDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-2">{e.title}</td>
                      <td className="py-2">{e.category.name}</td>
                      <td className="py-2">{e.expenseType}</td>
                      <td className="py-2">{formatINR(e.amountPaise)}</td>
                      <td className="py-2">{e.createdBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
