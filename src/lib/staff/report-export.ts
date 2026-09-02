import { paiseToRupees } from "@/lib/finance/money";
import {
  deriveAttendanceSessionStatus,
  formatTimeLabel,
  formatWorkingDuration,
} from "@/lib/staff/attendance-duration";
import { utcDateToDayKey } from "@/lib/date/org-day";

export function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export type AttendanceReportRow = {
  date: Date | string;
  staffName: string;
  roleTitle: string;
  checkInAt?: Date | string | null;
  checkOutAt?: Date | string | null;
  overtimeHours?: number | null;
  status?: string;
};

export function buildAttendanceReportCsv(rows: AttendanceReportRow[]): string {
  const header = [
    "Date",
    "Staff",
    "Role",
    "Check-in",
    "Check-out",
    "Duration",
    "Overtime (hrs)",
    "Status",
  ].join(",");

  const body = rows
    .map((row) => {
      const session = deriveAttendanceSessionStatus(row);
      const statusLabel =
        session === "OPEN"
          ? "Open"
          : session === "COMPLETED"
            ? "Completed"
            : row.status ?? "Absent";
      return [
        utcDateToDayKey(new Date(row.date)),
        csvCell(row.staffName),
        csvCell(row.roleTitle),
        csvCell(formatTimeLabel(row.checkInAt)),
        csvCell(formatTimeLabel(row.checkOutAt)),
        csvCell(formatWorkingDuration(row.checkInAt, row.checkOutAt)),
        csvCell(row.overtimeHours ?? 0),
        csvCell(statusLabel),
      ].join(",");
    })
    .join("\n");

  return `${header}\n${body}`;
}

export type PayrollReportRow = {
  staffName: string;
  roleTitle: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  workingDays: number;
  overtimeHours: number;
  basePaise: bigint | string | number;
  commissionPaise: bigint | string | number;
  advanceDeductionPaise?: bigint | string | number;
  earningsPaise?: bigint | string | number;
  deductionsPaise?: bigint | string | number;
  netPaise: bigint | string | number;
  status?: string;
};

function money(value: bigint | string | number): number {
  return paiseToRupees(typeof value === "bigint" ? value : BigInt(value));
}

export function buildPayrollReportCsv(rows: PayrollReportRow[]): string {
  const header = [
    "Staff",
    "Role",
    "Present",
    "Half",
    "Absent",
    "Paid leave",
    "Working days",
    "Overtime (hrs)",
    "Base (INR)",
    "Commission (INR)",
    "Advance deduction (INR)",
    "Earnings (INR)",
    "Deductions (INR)",
    "Net (INR)",
    "Status",
  ].join(",");

  const totals = rows.reduce(
    (acc, row) => ({
      net: acc.net + money(row.netPaise),
      base: acc.base + money(row.basePaise),
      commission: acc.commission + money(row.commissionPaise),
    }),
    { net: 0, base: 0, commission: 0 }
  );

  const body = rows
    .map((row) =>
      [
        csvCell(row.staffName),
        csvCell(row.roleTitle),
        row.presentDays,
        row.halfDays,
        row.absentDays,
        row.paidLeaveDays,
        row.workingDays,
        row.overtimeHours,
        money(row.basePaise),
        money(row.commissionPaise),
        money(row.advanceDeductionPaise ?? 0),
        money(row.earningsPaise ?? 0),
        money(row.deductionsPaise ?? 0),
        money(row.netPaise),
        csvCell(row.status ?? ""),
      ].join(",")
    )
    .join("\n");

  const totalsRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totals.base,
    totals.commission,
    "",
    "",
    "",
    totals.net,
    "",
  ].join(",");

  return `${header}\n${body}\n${totalsRow}`;
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadStaffReportPdf(options: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
  filename: string;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  let y = margin;

  pdf.setFontSize(14);
  pdf.text(options.title, margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.text(options.subtitle, margin, y);
  y += 8;

  pdf.setFontSize(8);
  const colWidth = (297 - margin * 2) / options.headers.length;
  options.headers.forEach((header, index) => {
    pdf.text(header, margin + index * colWidth, y);
  });
  y += 5;

  for (const row of options.rows) {
    if (y > 190) {
      pdf.addPage();
      y = margin;
    }
    row.forEach((cell, index) => {
      pdf.text(String(cell).slice(0, 24), margin + index * colWidth, y);
    });
    y += 5;
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
