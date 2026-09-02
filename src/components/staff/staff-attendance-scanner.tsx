"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CameraScanButton } from "@/components/shop/camera-scan-button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api/client";
import { formatTimeLabel } from "@/lib/staff/attendance-duration";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type ScanResponse =
  | {
      action: "CHECKED_IN";
      staffName: string;
      checkInAt: string;
    }
  | {
      action: "CHECKED_OUT";
      staffName: string;
      checkInAt: string;
      checkOutAt: string;
      durationLabel: string;
    }
  | {
      action: "NEEDS_CHECKOUT_CONFIRM";
      staffName: string;
      checkInAt: string;
      checkInLabel: string;
    };

type CheckoutPending = {
  staffName: string;
  checkInLabel: string;
  barcode: string;
  eventId: string;
};

function parseScanError(message: string): { title: string; description: string } {
  if (message.includes("STAFF_NOT_RECOGNIZED") || message.includes("INVALID_BARCODE")) {
    return {
      title: "Staff not recognized",
      description: "Please scan a valid staff attendance barcode.",
    };
  }
  if (message.includes("STAFF_INACTIVE")) {
    return {
      title: "Staff account inactive",
      description: "Attendance cannot be recorded.",
    };
  }
  if (message.includes("UNAUTHORIZED_BARCODE")) {
    return {
      title: "Unauthorized staff barcode",
      description: "This barcode belongs to another organization.",
    };
  }
  return { title: "Scan failed", description: message };
}

export function StaffAttendanceScanner({
  variant = "button",
  className,
  label = "Scan Staff",
}: {
  variant?: "button" | "tile";
  className?: string;
  label?: string;
}) {
  const { toast } = useToast();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState<CheckoutPending | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const invalidateAttendance = useCallback(() => {
    if (!orgId) return;
    qc.invalidateQueries({ queryKey: queryKeys.staff.all(orgId) });
  }, [orgId, qc]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
    setScanInput("");
    setCheckoutPending(null);
  }, [open]);

  async function postScan(body: {
    barcode: string;
    confirmCheckout?: boolean;
    eventId?: string;
  }) {
    return apiFetch<ScanResponse>("/api/v1/staff/attendance/scan", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        eventId: body.eventId ?? crypto.randomUUID(),
      }),
    });
  }

  async function handleScan(code: string, confirmCheckout = false, eventId?: string) {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const result = await postScan({
        barcode: trimmed,
        confirmCheckout,
        eventId,
      });

      if (result.action === "CHECKED_IN") {
        toast({
          title: `✓ ${result.staffName} checked in`,
          description: formatTimeLabel(result.checkInAt),
          variant: "success",
        });
        invalidateAttendance();
        setScanInput("");
        inputRef.current?.focus();
        return;
      }

      if (result.action === "NEEDS_CHECKOUT_CONFIRM") {
        setCheckoutPending({
          staffName: result.staffName,
          checkInLabel: result.checkInLabel,
          barcode: trimmed,
          eventId: eventId ?? crypto.randomUUID(),
        });
        return;
      }

      if (result.action === "CHECKED_OUT") {
        toast({
          title: `✓ ${result.staffName} checked out`,
          description: `Check-in: ${formatTimeLabel(result.checkInAt)} · Check-out: ${formatTimeLabel(result.checkOutAt)} · ${result.durationLabel}`,
          variant: "success",
        });
        setCheckoutPending(null);
        invalidateAttendance();
        setScanInput("");
        inputRef.current?.focus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const parsed = parseScanError(message);
      toast({
        title: parsed.title,
        description: parsed.description,
        variant: "destructive",
      });
      setScanInput("");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function confirmCheckout() {
    if (!checkoutPending) return;
    await handleScan(checkoutPending.barcode, true, checkoutPending.eventId);
  }

  const trigger =
    variant === "tile" ? (
      <Button
        type="button"
        variant="outline"
        className={cn("h-14 w-full justify-start rounded-xl", className)}
        onClick={() => setOpen(true)}
      >
        <ScanLine className="mr-3 h-5 w-5" />
        {label}
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        className={cn("rounded-xl", className)}
        onClick={() => setOpen(true)}
      >
        <ScanLine className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff attendance</DialogTitle>
            <DialogDescription>
              Scan a staff attendance barcode to check in or check out.
            </DialogDescription>
          </DialogHeader>

          {!checkoutPending ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type barcode…"
                className="h-11 rounded-xl font-mono"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleScan(scanInput);
                  }
                }}
              />
              <CameraScanButton onCode={(code) => void handleScan(code)} />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <p className="font-medium">{checkoutPending.staffName} is currently checked in.</p>
              <p className="text-sm text-muted-foreground">
                Check-in: {checkoutPending.checkInLabel}
              </p>
              <p className="text-sm">Do you want to check out?</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckoutPending(null);
                    setScanInput("");
                    inputRef.current?.focus();
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={busy} onClick={() => void confirmCheckout()}>
                  Check Out
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
