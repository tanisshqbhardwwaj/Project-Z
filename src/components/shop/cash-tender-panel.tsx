"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MobileNumpad } from "@/components/shop/mobile-numpad";

const QUICK_DENOMINATIONS = [500, 1000, 2000, 5000] as const;

type CashTenderPanelProps = {
  totalRupees: number;
  receivedRupees: string;
  onReceivedChange: (value: string) => void;
};

export function CashTenderPanel({
  totalRupees,
  receivedRupees,
  onReceivedChange,
}: CashTenderPanelProps) {
  const received = Number(receivedRupees) || 0;
  const changeRupees = useMemo(
    () => Math.max(0, Math.round((received - totalRupees) * 100) / 100),
    [received, totalRupees]
  );
  const shortBy = received > 0 && received < totalRupees ? totalRupees - received : 0;

  return (
    <div className="space-y-3 rounded-xl border border-emerald-300/60 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Cash management</Label>
        <span className="text-xs text-muted-foreground">Bill total ₹{totalRupees.toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg"
          onClick={() => onReceivedChange(String(Math.ceil(totalRupees)))}
        >
          Exact
        </Button>
        {QUICK_DENOMINATIONS.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => onReceivedChange(String(amount))}
          >
            ₹{amount}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cash received (₹)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={receivedRupees}
            onChange={(e) => onReceivedChange(e.target.value)}
            placeholder={String(Math.ceil(totalRupees))}
            className="h-12 rounded-lg text-lg font-semibold tabular-nums sm:h-10 sm:text-base"
            autoComplete="off"
            inputMode="decimal"
          />
          <MobileNumpad value={receivedRupees} onChange={onReceivedChange} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Change to return</Label>
          <div
            className={cn(
              "flex h-10 items-center rounded-lg border bg-background px-3 text-lg font-bold tabular-nums",
              shortBy > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {shortBy > 0 ? `Short ₹${shortBy.toFixed(2)}` : `₹${changeRupees.toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildCashTender(totalRupees: number, receivedRupees: string) {
  const received = Number(receivedRupees) || 0;
  return {
    receivedRupees: received,
    changeRupees: Math.max(0, Math.round((received - totalRupees) * 100) / 100),
  };
}
