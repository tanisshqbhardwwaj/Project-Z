"use client";

import { Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OfferPickerOption = {
  offerId: string;
  name: string;
  discountRupees: number;
};

type OfferPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: OfferPickerOption[];
  pendingOfferId: string | null;
  onPendingChange: (offerId: string | null) => void;
  onConfirm: () => void;
  wipesBill?: boolean;
};

export function OfferPickerDialog({
  open,
  onOpenChange,
  offers,
  pendingOfferId,
  onPendingChange,
  onConfirm,
  wipesBill = false,
}: OfferPickerDialogProps) {
  const multiple = offers.length > 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {multiple ? "Choose one offer" : "Apply this offer?"}
          </DialogTitle>
          <DialogDescription>
            {wipesBill
              ? "This offer covers the full bill and would make the total ₹0. Confirm it, or continue without an offer."
              : multiple
                ? "Only one offer can be used per bill. Pick which one to apply — you can change it anytime before saving."
                : "Only one offer can be used per bill. Apply it now, or bill without a promotion."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto py-1">
          {offers.map((offer) => {
            const selected = pendingOfferId === offer.offerId;
            return (
              <button
                key={offer.offerId}
                type="button"
                onClick={() => onPendingChange(offer.offerId)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-muted/60"
                )}
              >
                <span className="font-medium">{offer.name}</span>
                <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  − ₹{offer.discountRupees.toFixed(2)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPendingChange(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-dashed px-4 py-3 text-left text-sm transition-colors",
              pendingOfferId === null
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            No offer — bill without promotion
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button className="flex-1 rounded-xl" onClick={onConfirm}>
            Apply selection
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
