"use client";

import { useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Download, FileText, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarcodeSvg } from "@/components/shop/barcode-svg";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import {
  useGenerateStaffBarcode,
  useRevokeStaffBarcode,
} from "@/hooks/queries/use-staff";
import { readStaffBarcodeLabelSettings } from "@/lib/staff/barcode-label-settings";
import {
  buildStaffBarcodeSheetHtml,
  downloadStaffBarcodePdf,
  downloadStaffBarcodeSheet,
  printStaffBarcodeSheet,
} from "@/lib/staff/staff-barcode-label";

type Props = {
  staffId: string;
  staffName: string;
  roleTitle: string;
  phone?: string | null;
  email?: string | null;
  attendanceBarcode?: string | null;
  orgName?: string;
};

function barcodeSvgMarkup(value: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: "CODE128",
    displayValue: true,
    height: 48,
    margin: 2,
    fontSize: 10,
    width: 1.4,
  });
  return svg.outerHTML;
}

export function StaffAttendanceBarcodePanel({
  staffId,
  staffName,
  roleTitle,
  phone,
  email,
  attendanceBarcode,
  orgName: orgNameProp,
}: Props) {
  const { toast } = useToast();
  const generate = useGenerateStaffBarcode();
  const revoke = useRevokeStaffBarcode();
  const [localBarcode, setLocalBarcode] = useState(attendanceBarcode ?? "");
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const storeOrgName = useAuthStore((s) => s.activeOrganizationName);
  const labelFields = readStaffBarcodeLabelSettings(
    useAuthStore((s) => s.activeOrgSettings)
  );
  const orgName = orgNameProp ?? storeOrgName ?? undefined;

  const barcode = localBarcode || attendanceBarcode || "";

  async function onGenerate(regenerate = false) {
    try {
      const result = await generate.mutateAsync({ staffId, regenerate });
      setLocalBarcode(result.attendanceBarcode ?? "");
      toast({
        title: regenerate ? "Barcode regenerated" : "Barcode generated",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Could not generate barcode",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  async function onRevoke() {
    try {
      await revoke.mutateAsync(staffId);
      setLocalBarcode("");
      toast({ title: "Barcode revoked", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not revoke barcode",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  function labelEntry() {
    if (!barcode) return null;
    return {
      data: {
        staffName,
        roleTitle,
        phone,
        email,
        barcode,
        orgName,
      },
      svg: barcodeSvgMarkup(barcode),
    };
  }

  function sheetHtml() {
    const entry = labelEntry();
    if (!entry) return "";
    return buildStaffBarcodeSheetHtml([entry], labelFields);
  }

  async function onDownloadPdf() {
    const entry = labelEntry();
    if (!entry) return;
    setExporting(true);
    try {
      await downloadStaffBarcodePdf(
        [entry],
        `${staffName.replace(/\s+/g, "-").toLowerCase()}-attendance-barcode.pdf`,
        labelFields
      );
    } catch (err) {
      toast({
        title: "PDF export failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={containerRef} className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Staff Attendance Barcode</p>
          <p className="text-xs text-muted-foreground">
            Scan at the counter for check-in/out. Label fields are configured in
            Organization settings.
          </p>
        </div>
      </div>

      {barcode ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/30 p-4">
          <BarcodeSvg value={barcode} height={48} />
          <p className="font-mono text-xs">{barcode}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => printStaffBarcodeSheet(sheetHtml())}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => void onDownloadPdf()}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                downloadStaffBarcodeSheet(
                  sheetHtml(),
                  `${staffName.replace(/\s+/g, "-").toLowerCase()}-attendance-barcode.html`
                )
              }
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              HTML
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generate.isPending}
              onClick={() => void onGenerate(true)}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Re-generate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={revoke.isPending}
              onClick={() => void onRevoke()}
            >
              Revoke
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={generate.isPending}
          onClick={() => void onGenerate(false)}
        >
          Generate Staff Attendance Barcode
        </Button>
      )}
    </div>
  );
}
