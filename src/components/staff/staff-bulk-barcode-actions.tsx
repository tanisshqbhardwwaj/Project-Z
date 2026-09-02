"use client";

import { useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import { Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import {
  useBulkGenerateStaffBarcode,
  type StaffMember,
} from "@/hooks/queries/use-staff";
import { readStaffBarcodeLabelSettings } from "@/lib/staff/barcode-label-settings";
import {
  buildStaffBarcodeSheetHtml,
  downloadStaffBarcodePdf,
  downloadStaffBarcodeSheet,
  printStaffBarcodeSheet,
} from "@/lib/staff/staff-barcode-label";

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

export function StaffBulkBarcodeActions({ staffList }: { staffList: StaffMember[] }) {
  const { toast } = useToast();
  const bulkGenerate = useBulkGenerateStaffBarcode();
  const [busy, setBusy] = useState(false);
  const orgName = useAuthStore((s) => s.activeOrganizationName ?? undefined);
  const labelFields = readStaffBarcodeLabelSettings(
    useAuthStore((s) => s.activeOrgSettings)
  );

  const activeWithBarcode = useMemo(
    () =>
      staffList.filter(
        (s) => s.status === "ACTIVE" && Boolean(s.attendanceBarcode?.trim())
      ),
    [staffList]
  );
  const missingCount = useMemo(
    () =>
      staffList.filter(
        (s) => s.status === "ACTIVE" && !s.attendanceBarcode?.trim()
      ).length,
    [staffList]
  );

  function labelPayload(staff: StaffMember) {
    const barcode = staff.attendanceBarcode?.trim() ?? "";
    if (!barcode) return null;
    return {
      data: {
        staffName: staff.name,
        roleTitle: staff.roleTitle,
        phone: staff.phone,
        email: staff.email,
        barcode,
        orgName,
      },
      svg: barcodeSvgMarkup(barcode),
    };
  }

  async function onGenerateMissing() {
    try {
      const result = await bulkGenerate.mutateAsync({});
      toast({
        title: "Barcodes generated",
        description: `${result.count} staff barcode${result.count === 1 ? "" : "s"} ready`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Bulk generate failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  async function onRegenerateAll() {
    if (
      !window.confirm(
        "Regenerate barcodes for all active staff? Old printed labels will stop working."
      )
    ) {
      return;
    }
    try {
      const result = await bulkGenerate.mutateAsync({ regenerate: true });
      toast({
        title: "Barcodes regenerated",
        description: `${result.count} staff barcode${result.count === 1 ? "" : "s"} updated`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Bulk regenerate failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  async function runExport(kind: "print" | "html" | "pdf") {
    const labels = activeWithBarcode
      .map(labelPayload)
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (labels.length === 0) {
      toast({
        title: "No barcodes yet",
        description: "Generate barcodes first, then print or download.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const html = buildStaffBarcodeSheetHtml(labels, labelFields);
      if (kind === "print") printStaffBarcodeSheet(html);
      else if (kind === "html")
        downloadStaffBarcodeSheet(html, "staff-attendance-barcodes.html");
      else
        await downloadStaffBarcodePdf(
          labels,
          "staff-attendance-barcodes.pdf",
          labelFields
        );
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {missingCount > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl"
          disabled={bulkGenerate.isPending}
          onClick={() => void onGenerateMissing()}
        >
          <QrCode className="mr-2 h-4 w-4" />
          Generate {missingCount} barcode{missingCount === 1 ? "" : "s"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-xl"
        disabled={bulkGenerate.isPending || activeWithBarcode.length === 0 || busy}
        onClick={() => void runExport("print")}
      >
        <Printer className="mr-2 h-4 w-4" />
        Print all
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-xl"
        disabled={bulkGenerate.isPending || activeWithBarcode.length === 0 || busy}
        onClick={() => void runExport("pdf")}
      >
        <Download className="mr-2 h-4 w-4" />
        PDF all
      </Button>
      {activeWithBarcode.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl text-xs"
          disabled={bulkGenerate.isPending}
          onClick={() => void onRegenerateAll()}
        >
          Regenerate all
        </Button>
      ) : null}
    </div>
  );
}
