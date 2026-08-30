"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { formatINR } from "@/lib/finance/money";
import type { StaffAdvanceRow, StaffMember } from "@/hooks/queries/use-staff";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK", "OTHER"] as const;

type StaffAdvancePanelProps = {
  open: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  openAdvances: StaffAdvanceRow[];
  advanceStaffId: string;
  onAdvanceStaffIdChange: (id: string) => void;
  advanceAmount: string;
  onAdvanceAmountChange: (value: string) => void;
  advanceGivenDate: string;
  onAdvanceGivenDateChange: (value: string) => void;
  advanceNotes: string;
  onAdvanceNotesChange: (value: string) => void;
  advancePaymentMethod: (typeof PAYMENT_METHODS)[number];
  onAdvancePaymentMethodChange: (value: (typeof PAYMENT_METHODS)[number]) => void;
  onSubmit: () => void;
  submitting: boolean;
  warning?: string | null;
  error?: string | null;
};

export function StaffAdvancePanel({
  open,
  onClose,
  staffList,
  openAdvances,
  advanceStaffId,
  onAdvanceStaffIdChange,
  advanceAmount,
  onAdvanceAmountChange,
  advanceGivenDate,
  onAdvanceGivenDateChange,
  advanceNotes,
  onAdvanceNotesChange,
  advancePaymentMethod,
  onAdvancePaymentMethodChange,
  onSubmit,
  submitting,
  warning,
  error,
}: StaffAdvancePanelProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close advance panel"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Record advance & expense</h2>
            <p className="text-xs text-muted-foreground">
              Mid-month cash to staff — posts to shop expenses, deducted at salary
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <FormFeedback warning={warning ?? undefined} error={error ?? undefined} />

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label>Staff member</Label>
              <select
                value={advanceStaffId}
                onChange={(e) => onAdvanceStaffIdChange(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                required
              >
                <option value="">Select staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.roleTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={advanceAmount}
                onChange={(e) => onAdvanceAmountChange(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date given</Label>
              <DatePicker
                value={advanceGivenDate}
                onChange={onAdvanceGivenDateChange}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <select
                value={advancePaymentMethod}
                onChange={(e) =>
                  onAdvancePaymentMethodChange(
                    e.target.value as (typeof PAYMENT_METHODS)[number]
                  )
                }
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason / note</Label>
              <Input
                value={advanceNotes}
                onChange={(e) => onAdvanceNotesChange(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="e.g. Emergency — medical bill"
              />
              <p className="text-xs text-muted-foreground">
                Saved on the expense and shown in payroll when salary is paid.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save advance"}
              </Button>
            </div>
          </form>

          {openAdvances.length > 0 && (
            <div className="mt-6 space-y-2 rounded-xl bg-muted/40 p-3">
              <p className="text-sm font-medium">Open advances</p>
              {openAdvances.map((adv) => {
                const remaining = BigInt(adv.amountPaise) - BigInt(adv.repaidPaise);
                return (
                  <div
                    key={adv.id}
                    className="rounded-lg border bg-background p-2.5 text-sm"
                  >
                    <p className="font-medium">{adv.staff.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatINR(adv.amountPaise)} given · Due {formatINR(remaining)}
                    </p>
                    {adv.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{adv.notes}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(adv.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
