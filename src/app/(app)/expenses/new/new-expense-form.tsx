"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useFetchStore } from "@/stores/fetch-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { VendorCombobox } from "@/components/finance/vendor-combobox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, parseAmountInput, requireField } from "@/lib/api/validation";

export default function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const prefillVendorId = searchParams.get("vendorId") ?? "";
  const [form, setForm] = useState({
    projectId: searchParams.get("projectId") ?? "",
    vendorId: prefillVendorId,
    vendorName: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    description: "",
    paymentMethod: "CASH",
  });
  const [duplicate, setDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const lockedProjectId = searchParams.get("projectId") ?? "";

  useEffect(() => {
    if (!lockedProjectId) router.replace("/projects");
  }, [lockedProjectId, router]);

  useEffect(() => {
    if (!prefillVendorId) return;
    apiFetch<Array<{ id: string; name: string }>>("/api/v1/vendors")
      .then((vendors) => {
        const vendor = vendors.find((v) => v.id === prefillVendorId);
        if (vendor) {
          setForm((current) => ({
            ...current,
            vendorId: vendor.id,
            vendorName: vendor.name,
          }));
        }
      })
      .catch(() => {});
  }, [prefillVendorId]);

  async function submit(skipDuplicate = false) {
    setLoading(true);
    clear();
    setDuplicate(false);

    const amountResult = parseAmountInput(form.amount);
    const validationMessage = firstValidationIssue([
      requireField(form.description, "reason for payment"),
      !amountResult.ok ? amountResult.message : null,
      !form.expenseDate ? "Please select a date" : null,
    ]);

    if (validationMessage) {
      showWarning(validationMessage);
      setLoading(false);
      return;
    }

    if (!amountResult.ok) {
      setLoading(false);
      return;
    }

    try {
      await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          projectId: form.projectId,
          vendorId: form.vendorId || undefined,
          amount: amountResult.amount,
          expenseDate: form.expenseDate,
          description: form.description.trim(),
          paymentMethod: form.paymentMethod,
          skipDuplicateCheck: skipDuplicate,
        }),
      });
      useFetchStore.getState().invalidatePrefix(`project:${form.projectId}`);
      router.push(`/projects/${form.projectId}?tab=expenses`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setDuplicate(true);
      } else {
        applyError(err, "Failed to save expense");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!lockedProjectId) return null;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-28 md:pb-8">
      <div>
        <p className="text-sm font-medium text-primary">Finance</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Add Expense</h1>
        <p className="text-sm text-muted-foreground">
          Record what you paid from your pocket
          {user?.name ? ` — logged as ${user.name}` : ""}.
        </p>
      </div>
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="space-y-4 pt-6">
          <FormFeedback warning={warning} error={error} />
          {duplicate && (
            <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="mb-2">Similar expense found. Save anyway?</p>
              <Button onClick={() => submit(true)} variant="outline" size="sm" className="rounded-lg">
                Save anyway
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Vendor</Label>
            <VendorCombobox
              value={form.vendorId}
              vendorName={form.vendorName}
              onChange={(vendorId, vendorName) => setForm({ ...form, vendorId, vendorName })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Reason for payment</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="h-12 rounded-xl text-base"
              placeholder="e.g. Paint supply, Labour week 2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={form.expenseDate}
              onChange={(d) => setForm({ ...form, expenseDate: d })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <select
              id="paymentMethod"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <Button
            className="h-12 w-full rounded-xl text-base"
            size="lg"
            disabled={loading}
            onClick={() => submit(false)}
          >
            {loading ? "Saving..." : "Save Expense"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
