"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Percent, Receipt, ShoppingBag, Ban } from "lucide-react";

/** Suggested roles; `roleTitle` is still free text for anything else. */
export const STAFF_ROLES = [
  { key: "OWNER", label: "Owner" },
  { key: "MANAGER", label: "Manager" },
  { key: "SALES_STAFF", label: "Sales Staff" },
  { key: "CASHIER", label: "Cashier" },
  { key: "ACCOUNTANT", label: "Accountant" },
  { key: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { key: "DELIVERY_STAFF", label: "Delivery Staff" },
  { key: "CUSTOM", label: "Custom role" },
] as const;

const COMMISSION_TYPES = [
  {
    key: "NONE",
    label: "No commission",
    hint: "Salary only",
    icon: Ban,
  },
  {
    key: "PERCENT",
    label: "Percentage",
    hint: "Share of eligible sales",
    icon: Percent,
  },
  {
    key: "FIXED_PER_SALE",
    label: "Fixed per sale",
    hint: "Flat amount per invoice",
    icon: Receipt,
  },
  {
    key: "FIXED_PER_ITEM",
    label: "Fixed per item",
    hint: "Flat amount per item sold",
    icon: ShoppingBag,
  },
  {
    key: "FIXED_MONTHLY",
    label: "Fixed monthly",
    hint: "Flat amount every payroll month",
    icon: Receipt,
  },
] as const;

export type CommissionType = (typeof COMMISSION_TYPES)[number]["key"];

export type StaffProfileValues = {
  name: string;
  phone: string;
  email: string;
  roleKey: string;
  roleTitle: string;
  cashierCode: string;
  wageRupees: string;
  wagePeriod: "DAILY" | "MONTHLY";
  paymentFrequency: "DAILY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  overtimeRateRupees: string;
  commissionType: CommissionType;
  commissionPercent: string;
  commissionAmountRupees: string;
  joinedAt: string;
  status: "ACTIVE" | "LEFT";
  notes: string;
  canBill: boolean;
  canProcessReturns: boolean;
  canViewOwnAttendance: boolean;
  canViewOwnSales: boolean;
};

export function emptyStaffProfile(): StaffProfileValues {
  return {
    name: "",
    phone: "",
    email: "",
    roleKey: "SALES_STAFF",
    roleTitle: "Sales Staff",
    cashierCode: "",
    wageRupees: "",
    wagePeriod: "MONTHLY",
    paymentFrequency: "MONTHLY",
    overtimeRateRupees: "",
    commissionType: "NONE",
    commissionPercent: "",
    commissionAmountRupees: "",
    joinedAt: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
    notes: "",
    canBill: false,
    canProcessReturns: false,
    canViewOwnAttendance: false,
    canViewOwnSales: false,
  };
}

/**
 * One form for the whole staff profile: identity, role, pay, commission and
 * status. Commission fields switch to match the chosen type so an unused
 * percentage can never be paid out by accident.
 */
export function StaffProfileDialog({
  open,
  onOpenChange,
  title,
  initial,
  submitting,
  errorMessage,
  onSubmit,
  showAccessToggles = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: StaffProfileValues;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: StaffProfileValues) => Promise<void> | void;
  /** Owner-only: login permissions when an email is set. */
  showAccessToggles?: boolean;
}) {
  // The parent remounts this dialog per person via a `key`, so seeding state
  // once from `initial` is enough — no effect needed to re-sync.
  const [values, setValues] = useState<StaffProfileValues>(initial);
  const [warning, setWarning] = useState<string | null>(null);

  function set<K extends keyof StaffProfileValues>(
    key: K,
    value: StaffProfileValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRoleKey(roleKey: string) {
    const preset = STAFF_ROLES.find((r) => r.key === roleKey);
    setValues((prev) => ({
      ...prev,
      roleKey,
      roleTitle:
        roleKey === "CUSTOM" || !preset
          ? prev.roleKey === "CUSTOM"
            ? prev.roleTitle
            : ""
          : preset.label,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setWarning(null);
    if (values.name.trim().length < 2) {
      return setWarning("Enter the staff member's name");
    }
    if (!values.roleTitle.trim()) {
      return setWarning("Enter a role");
    }
    if (values.commissionType === "PERCENT") {
      const percent = Number(values.commissionPercent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return setWarning("Enter a commission percentage between 0 and 100");
      }
    }
    if (
      values.commissionType === "FIXED_PER_SALE" ||
      values.commissionType === "FIXED_PER_ITEM" ||
      values.commissionType === "FIXED_MONTHLY"
    ) {
      const amount = Number(values.commissionAmountRupees);
      if (!Number.isFinite(amount) || amount <= 0) {
        return setWarning("Enter a commission amount above zero");
      }
    }
    await onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Contact details, role, how they are paid, and whether they earn
            commission on sales.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Person
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="h-11 rounded-xl"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Joining date</Label>
                <Input
                  type="date"
                  value={values.joinedAt}
                  onChange={(e) => set("joinedAt", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <select
                  value={values.roleKey}
                  onChange={(e) => handleRoleKey(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Role title</Label>
                <Input
                  value={values.roleTitle}
                  onChange={(e) => set("roleTitle", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="e.g. Floor Supervisor"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cashier code</Label>
                <Input
                  value={values.cashierCode}
                  onChange={(e) =>
                    set("cashierCode", e.target.value.toUpperCase())
                  }
                  className="h-11 rounded-xl font-mono uppercase"
                  placeholder="e.g. 4"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Used in bill numbers: BF/26-27/{values.cashierCode || "R1"}/0042. Leave
                  blank to auto-assign the next free code.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Salary
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Salary type</Label>
                <select
                  value={values.wagePeriod}
                  onChange={(e) =>
                    set("wagePeriod", e.target.value as "DAILY" | "MONTHLY")
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="MONTHLY">Monthly salary</option>
                  <option value="DAILY">Daily wage</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount ₹</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.wageRupees}
                  onChange={(e) => set("wageRupees", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder={values.wagePeriod === "DAILY" ? "600" : "20000"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment frequency</Label>
                <select
                  value={values.paymentFrequency}
                  onChange={(e) =>
                    set(
                      "paymentFrequency",
                      e.target.value as StaffProfileValues["paymentFrequency"]
                    )
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="DAILY">Daily</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Overtime ₹/hour</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.overtimeRateRupees}
                  onChange={(e) => set("overtimeRateRupees", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sales commission
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {COMMISSION_TYPES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => set("commissionType", option.key)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    values.commissionType === option.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>

            {values.commissionType === "PERCENT" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Commission %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={values.commissionPercent}
                    onChange={(e) => set("commissionPercent", e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="2"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    2% on ₹50,000 of eligible sales pays ₹1,000.
                  </p>
                </div>
              </div>
            ) : null}

            {values.commissionType === "FIXED_PER_SALE" ||
            values.commissionType === "FIXED_PER_ITEM" ||
            values.commissionType === "FIXED_MONTHLY" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Amount ₹{" "}
                    {values.commissionType === "FIXED_PER_SALE"
                      ? "per sale"
                      : values.commissionType === "FIXED_PER_ITEM"
                        ? "per item"
                        : "per month"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={values.commissionAmountRupees}
                    onChange={(e) => set("commissionAmountRupees", e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder={values.commissionType === "FIXED_MONTHLY" ? "500" : "25"}
                  />
                </div>
              </div>
            ) : null}

            {values.commissionType !== "NONE" ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Commission is calculated from the invoices this person billed, and
                reduced when goods are returned or exchanged. A fully returned sale
                earns nothing.
              </p>
            ) : null}
          </section>

          {showAccessToggles && values.email.trim() ? (
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Login access
              </p>
              <p className="text-xs text-muted-foreground">
                Saving sends a login invite to this email. All permissions start off — turn on only what this person needs.
              </p>
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={values.canBill}
                    onChange={(e) => set("canBill", e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Can bill</span>
                    <span className="block text-xs text-muted-foreground">
                      Create invoices and use POS
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={values.canProcessReturns}
                    onChange={(e) => set("canProcessReturns", e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Can process returns and exchanges</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={values.canViewOwnAttendance}
                    onChange={(e) => set("canViewOwnAttendance", e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Can see own daily attendance</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={values.canViewOwnSales}
                    onChange={(e) => set("canViewOwnSales", e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Can see own personal sales</span>
                  </span>
                </label>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status & notes
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={values.status}
                  onChange={(e) =>
                    set("status", e.target.value as "ACTIVE" | "LEFT")
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="LEFT">Left</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          <FormFeedback
            warning={warning ?? undefined}
            error={errorMessage ?? undefined}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function describeCommissionType(
  commissionType: string | null | undefined,
  commissionPercent: number | null | undefined,
  commissionAmountPaise: string | null | undefined
): string {
  const amount = commissionAmountPaise
    ? `₹${(Number(commissionAmountPaise) / 100).toLocaleString("en-IN")}`
    : null;
  switch (commissionType) {
    case "PERCENT":
      return commissionPercent ? `${commissionPercent}% of sales` : "Percentage";
    case "FIXED_PER_SALE":
      return amount ? `${amount} per sale` : "Fixed per sale";
    case "FIXED_PER_ITEM":
      return amount ? `${amount} per item` : "Fixed per item";
    case "FIXED_MONTHLY":
      return amount ? `${amount} per month` : "Fixed monthly";
    default:
      return "No commission";
  }
}
