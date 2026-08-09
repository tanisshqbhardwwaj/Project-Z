"use client";

import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { useFetchStore } from "@/stores/fetch-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, parseAmountInput, requireField } from "@/lib/api/validation";

type EditExpenseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: {
    id: string;
    amountPaise: string;
    description: string | null;
    expenseDate: string;
  };
  projectId: string;
  onSaved: () => void;
};

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  projectId,
  onSaved,
}: EditExpenseSheetProps) {
  const [amount, setAmount] = useState(String(Number(expense.amountPaise) / 100));
  const [description, setDescription] = useState(expense.description ?? "");
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate.split("T")[0]);
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  async function save() {
    clear();
    const amountResult = parseAmountInput(amount);
    const validationMessage = firstValidationIssue([
      requireField(description.trim(), "description"),
      !amountResult.ok ? amountResult.message : null,
      !expenseDate ? "Please select a date" : null,
    ]);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }
    if (!amountResult.ok) return;

    setLoading(true);
    try {
      await apiFetch(`/api/v1/expenses/${expense.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: amountResult.amount,
          description: description.trim(),
          expenseDate,
        }),
      });
      useFetchStore.getState().invalidatePrefix(`project:${projectId}`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      applyError(err, "Could not update expense");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit your expense</DialogTitle>
          <DialogDescription>
            You can edit your latest expense within 24 hours. Changes are marked as edited in
            Activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={expenseDate} onChange={setExpenseDate} />
          </div>
          <Button className="h-12 w-full rounded-xl" onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
