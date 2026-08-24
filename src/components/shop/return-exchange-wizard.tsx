"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR, rupeesToPaise } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import {
  VariantSearchPicker,
  type VariantOption,
} from "@/components/shop/variant-picker";
import { variantSubtitle } from "@/lib/shop/variant-display";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Repeat,
} from "lucide-react";

type ReturnableLine = {
  lineKey: string;
  inventoryItemId: string | null;
  productName: string;
  displayName: string;
  variantSubtitle: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPriceRupees: number;
};

type ReplacementLine = {
  rowId: string;
  inventoryItemId?: string;
  name: string;
  displayName: string;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  barcode: string | null;
  qty: number;
  priceRupees: number;
};

type StaffOption = { id: string; name: string; roleTitle: string };

const REASONS = [
  { id: "CUSTOMER_CHANGED_MIND", label: "Customer changed mind" },
  { id: "WRONG_PRODUCT", label: "Wrong product / size" },
  { id: "DAMAGED", label: "Damaged" },
  { id: "DEFECTIVE", label: "Defective" },
  { id: "OTHER", label: "Other" },
] as const;

const SETTLEMENT_METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "UPI", label: "UPI" },
  { id: "CARD", label: "Card" },
  { id: "BANK", label: "Bank transfer" },
  { id: "CREDIT", label: "Store credit / udhaar" },
  { id: "OTHER", label: "Other" },
] as const;

type Mode = "RETURN" | "EXCHANGE";
type Step = 1 | 2 | 3;

function StepPill({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "border-2 border-primary text-primary"
              : "border border-border text-muted-foreground"
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : index}
      </span>
      <span
        className={cn(
          "truncate text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Return and partial-exchange flow, split into three steps so the counter never
 * has to reason about the whole transaction at once:
 *   1. which sold variants are coming back and how many
 *   2. (exchange) which replacement variants go out
 *   3. how the money difference is settled
 *
 * The original invoice is never modified; submitting produces a separate return
 * or exchange receipt.
 */
export function ReturnExchangeWizard({
  saleId,
  billNumber,
  customerName,
  open,
  onOpenChange,
  onCompleted,
}: {
  saleId: string;
  billNumber: string | null;
  customerName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (receipt: { id: string; returnNumber: string; type: string }) => void;
}) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const staffEnabled = isModuleEnabled(enabledModules, "staff");
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("RETURN");
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [replacements, setReplacements] = useState<ReplacementLine[]>([]);
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>(
    "CUSTOMER_CHANGED_MIND"
  );
  const [settlementMethod, setSettlementMethod] =
    useState<(typeof SETTLEMENT_METHODS)[number]["id"]>("CASH");
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState("");

  const linesQuery = useQuery({
    queryKey: orgId
      ? [...queryKeys.modules.shop.returns(orgId), "returnable", saleId]
      : ["disabled"],
    queryFn: () =>
      apiFetch<ReturnableLine[]>(`/api/v1/shop/returns/returnable/${saleId}`),
    enabled: !!orgId && open,
  });

  const inventoryQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<VariantOption[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && open && mode === "EXCHANGE" && inventoryEnabled,
  });

  const staffQuery = useQuery({
    queryKey: orgId ? [...queryKeys.org(orgId), "staff", "active"] : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && open && staffEnabled,
  });

  const submitMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ id: string; returnNumber: string; type: string }>(
        "/api/v1/shop/returns",
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: (receipt) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.returns(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.invoices(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({ queryKey: ["shop", orgId, "products"] });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
      }
      reset();
      onOpenChange(false);
      onCompleted?.(receipt);
    },
    onError: (err) => applyError(err, "Could not process this transaction"),
  });

  function reset() {
    setStep(1);
    setMode("RETURN");
    setQtyByLine({});
    setReplacements([]);
    setReason("CUSTOMER_CHANGED_MIND");
    setSettlementMethod("CASH");
    setNotes("");
    setStaffId("");
    clear();
  }

  const selectedLines = useMemo(() => {
    return (linesQuery.data ?? [])
      .map((line) => ({
        line,
        qty: Number(qtyByLine[line.lineKey] ?? 0),
      }))
      .filter((entry) => entry.qty > 0);
  }, [linesQuery.data, qtyByLine]);

  const returnValueRupees = selectedLines.reduce(
    (sum, entry) => sum + entry.qty * entry.line.unitPriceRupees,
    0
  );
  const replacementValueRupees = replacements.reduce(
    (sum, line) => sum + line.qty * line.priceRupees,
    0
  );
  const differenceRupees = replacementValueRupees - returnValueRupees;
  const refundRupees = differenceRupees < 0 ? -differenceRupees : 0;
  const collectRupees = differenceRupees > 0 ? differenceRupees : 0;

  const canLeaveStep1 = selectedLines.length > 0;
  const canLeaveStep2 = mode === "RETURN" || replacements.length > 0;

  function addReplacement(option: VariantOption) {
    const priceRupees = option.sellPaise ? Number(option.sellPaise) / 100 : 0;
    setReplacements((prev) => {
      const existing = prev.find((r) => r.inventoryItemId === option.id);
      if (existing) {
        return prev.map((r) =>
          r.inventoryItemId === option.id ? { ...r, qty: r.qty + 1 } : r
        );
      }
      return [
        ...prev,
        {
          rowId: `${option.id}-${Date.now()}`,
          inventoryItemId: option.id,
          name: option.product?.name ?? option.name,
          displayName: [
            option.product?.name ?? option.name,
            variantSubtitle(option),
          ]
            .filter(Boolean)
            .join(" — "),
          size: option.size ?? null,
          color: option.color ?? null,
          variantLabel: option.variantLabel ?? null,
          barcode: option.barcode ?? null,
          qty: 1,
          priceRupees,
        },
      ];
    });
  }

  async function submit() {
    clear();
    if (selectedLines.length === 0) {
      return showWarning("Choose at least one item to return");
    }
    if (mode === "EXCHANGE" && replacements.length === 0) {
      return showWarning("Pick the replacement product for the exchange");
    }
    const staffName =
      (staffQuery.data ?? []).find((s) => s.id === staffId)?.name ?? null;

    await submitMutation.mutateAsync({
      shopSaleId: saleId,
      type: mode,
      reason,
      notes: notes.trim() || undefined,
      refundMethod: settlementMethod,
      lines: selectedLines.map((entry) => ({
        lineKey: entry.line.lineKey,
        returnQty: entry.qty,
      })),
      ...(mode === "EXCHANGE"
        ? {
            exchangeItems: replacements.map((line) => ({
              ...(line.inventoryItemId
                ? { inventoryItemId: line.inventoryItemId }
                : {}),
              name: line.name,
              qty: line.qty,
              priceRupees: line.priceRupees,
            })),
          }
        : {}),
      ...(staffId ? { staffId } : {}),
      ...(staffName ? { staffName } : {}),
    });
  }

  const nothingReturnable =
    (linesQuery.data ?? []).length > 0 &&
    (linesQuery.data ?? []).every((l) => l.remainingQty <= 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "EXCHANGE" ? "Exchange" : "Return"} against{" "}
            {billNumber ?? saleId.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            The original bill stays exactly as it is. This creates a separate{" "}
            {mode === "EXCHANGE" ? "exchange" : "return"} receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
          <StepPill index={1} label="Returned items" active={step === 1} done={step > 1} />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <StepPill
            index={2}
            label={mode === "EXCHANGE" ? "Replacement" : "Type"}
            active={step === 2}
            done={step > 2}
          />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <StepPill index={3} label="Settle & confirm" active={step === 3} done={false} />
        </div>

        <FormFeedback warning={warning} error={error} />

        {/* Step 1 — what is coming back */}
        {step === 1 ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Original bill {billNumber ?? "—"}
              {customerName ? ` · ${customerName}` : " · Walk-in"}
            </div>

            {linesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sold items…</p>
            ) : nothingReturnable ? (
              <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                Everything on this bill has already been returned.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {(linesQuery.data ?? []).map((line) => {
                  const exhausted = line.remainingQty <= 0;
                  return (
                    <li
                      key={line.lineKey}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 p-3",
                        exhausted && "opacity-55"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{line.productName}</p>
                        {line.variantSubtitle ? (
                          <p className="text-sm font-medium text-primary">
                            {line.variantSubtitle}
                          </p>
                        ) : null}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Sold {line.originalQty} @{" "}
                            {formatINR(rupeesToPaise(line.unitPriceRupees))}
                          </span>
                          {line.returnedQty > 0 ? (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px]"
                            >
                              {line.returnedQty} already returned
                            </Badge>
                          ) : null}
                          <Badge
                            variant="secondary"
                            className="rounded-full text-[10px]"
                          >
                            {line.remainingQty} returnable
                          </Badge>
                          {line.barcode ? (
                            <code className="font-mono text-[10px]">
                              {line.barcode}
                            </code>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Return
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={line.remainingQty}
                          step="any"
                          disabled={exhausted}
                          value={qtyByLine[line.lineKey] ?? ""}
                          onChange={(e) =>
                            setQtyByLine((prev) => ({
                              ...prev,
                              [line.lineKey]: e.target.value,
                            }))
                          }
                          className="h-9 w-20 rounded-lg"
                          placeholder="0"
                        />
                        {!exhausted ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg px-2 text-xs"
                            onClick={() =>
                              setQtyByLine((prev) => ({
                                ...prev,
                                [line.lineKey]: String(line.remainingQty),
                              }))
                            }
                          >
                            All
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedLines.length > 0 ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                Returning {selectedLines.length} line
                {selectedLines.length === 1 ? "" : "s"} worth{" "}
                <strong>{formatINR(rupeesToPaise(returnValueRupees))}</strong>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Step 2 — return or exchange */}
        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    id: "RETURN" as Mode,
                    icon: RotateCcw,
                    title: "Return only",
                    body: "Goods come back, customer gets money or store credit.",
                  },
                  {
                    id: "EXCHANGE" as Mode,
                    icon: Repeat,
                    title: "Exchange",
                    body: "Goods come back, customer takes different items instead.",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    mode === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <option.icon className="h-4 w-4" />
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {option.body}
                  </span>
                </button>
              ))}
            </div>

            {mode === "EXCHANGE" ? (
              <div className="space-y-3 rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">Replacement products</p>
                  <p className="text-xs text-muted-foreground">
                    Pick the exact size the customer is taking — stock comes off
                    that variant.
                  </p>
                </div>

                {inventoryEnabled ? (
                  <VariantSearchPicker
                    options={inventoryQuery.data ?? []}
                    onSelect={addReplacement}
                    placeholder="Search replacement by name, size, SKU or barcode…"
                    emptyLabel="No product matches that search"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Turn on Inventory to pick replacement products from stock.
                  </p>
                )}

                {replacements.length > 0 ? (
                  <ul className="divide-y rounded-xl border">
                    {replacements.map((line) => (
                      <li
                        key={line.rowId}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {line.displayName}
                          </p>
                          {line.barcode ? (
                            <code className="font-mono text-[10px] text-muted-foreground">
                              {line.barcode}
                            </code>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) =>
                              setReplacements((prev) =>
                                prev.map((r) =>
                                  r.rowId === line.rowId
                                    ? { ...r, qty: Number(e.target.value) || 1 }
                                    : r
                                )
                              )
                            }
                            className="h-9 w-16 rounded-lg"
                          />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.priceRupees}
                            onChange={(e) =>
                              setReplacements((prev) =>
                                prev.map((r) =>
                                  r.rowId === line.rowId
                                    ? {
                                        ...r,
                                        priceRupees: Number(e.target.value) || 0,
                                      }
                                    : r
                                )
                              )
                            }
                            className="h-9 w-24 rounded-lg"
                          />
                          <DeleteIconButton
                            variant="ghost"
                            onClick={() =>
                              setReplacements((prev) =>
                                prev.filter((r) => r.rowId !== line.rowId)
                              )
                            }
                            aria-label={`Remove ${line.displayName}`}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Step 3 — settle */}
        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Original bill</span>
                <span className="font-medium">{billNumber ?? "—"}</span>
              </div>
              <div className="border-t pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Returned
                </p>
                {selectedLines.map((entry) => (
                  <div
                    key={entry.line.lineKey}
                    className="mt-1 flex items-start justify-between gap-2"
                  >
                    <span className="min-w-0">
                      {entry.line.displayName} × {entry.qty}
                    </span>
                    <span className="tabular-nums">
                      {formatINR(
                        rupeesToPaise(entry.qty * entry.line.unitPriceRupees)
                      )}
                    </span>
                  </div>
                ))}
                <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 font-medium">
                  <span>Return value</span>
                  <span className="tabular-nums">
                    {formatINR(rupeesToPaise(returnValueRupees))}
                  </span>
                </div>
              </div>

              {mode === "EXCHANGE" ? (
                <div className="border-t pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Replacement
                  </p>
                  {replacements.map((line) => (
                    <div
                      key={line.rowId}
                      className="mt-1 flex items-start justify-between gap-2"
                    >
                      <span className="min-w-0">
                        {line.displayName} × {line.qty}
                      </span>
                      <span className="tabular-nums">
                        {formatINR(rupeesToPaise(line.qty * line.priceRupees))}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 font-medium">
                    <span>Replacement value</span>
                    <span className="tabular-nums">
                      {formatINR(rupeesToPaise(replacementValueRupees))}
                    </span>
                  </div>
                </div>
              ) : null}

              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border-t px-2 py-2 text-base font-semibold",
                  collectRupees > 0
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                    : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                )}
              >
                <span>
                  {collectRupees > 0
                    ? "Customer pays"
                    : refundRupees > 0
                      ? "Refund to customer"
                      : "Nothing to settle"}
                </span>
                <span className="tabular-nums">
                  {formatINR(
                    rupeesToPaise(collectRupees > 0 ? collectRupees : refundRupees)
                  )}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as (typeof REASONS)[number]["id"])
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {collectRupees > 0 ? "Payment method" : "Refund method"}
                </Label>
                <select
                  value={settlementMethod}
                  onChange={(e) =>
                    setSettlementMethod(
                      e.target.value as (typeof SETTLEMENT_METHODS)[number]["id"]
                    )
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {SETTLEMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              {staffEnabled && (staffQuery.data ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Processed by</Label>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Not recorded</option>
                    {(staffQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.roleTitle}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="Anything the owner should know"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={step === 1}
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              className="rounded-xl"
              disabled={step === 1 ? !canLeaveStep1 : !canLeaveStep2}
              onClick={() => {
                clear();
                if (step === 1 && !canLeaveStep1) {
                  return showWarning("Enter a return quantity for at least one item");
                }
                if (step === 2 && !canLeaveStep2) {
                  return showWarning("Add the replacement product to continue");
                }
                setStep((s) => (s === 1 ? 2 : 3));
              }}
            >
              Continue
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-xl"
              disabled={submitMutation.isPending}
              onClick={submit}
            >
              {submitMutation.isPending
                ? "Processing…"
                : mode === "EXCHANGE"
                  ? "Create exchange receipt"
                  : "Create return receipt"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
