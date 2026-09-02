import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
} from "@/lib/api/context";
import { listAttendanceRange } from "@/services/staff/attendance-payroll.service";
import {
  buildAttendanceReportCsv,
  type AttendanceReportRow,
} from "@/lib/staff/report-export";
import { dayKeySchema } from "@/lib/validation/staff";
import {
  deriveAttendanceSessionStatus,
  formatTimeLabel,
  formatWorkingDuration,
} from "@/lib/staff/attendance-duration";
import { utcDateToDayKey } from "@/lib/date/org-day";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "staff.view");
    const { searchParams } = new URL(request.url);
    const from = dayKeySchema.parse(searchParams.get("from"));
    const to = dayKeySchema.parse(searchParams.get("to"));
    const staffId = searchParams.get("staffId") ?? undefined;
    const format = searchParams.get("format") ?? "csv";

    const rows = await listAttendanceRange(ctx.organizationId, from, to, staffId);
    const reportRows: AttendanceReportRow[] = rows.map((row) => ({
      date: row.date,
      staffName: row.staff.name,
      roleTitle: row.staff.roleTitle,
      checkInAt: row.checkInAt,
      checkOutAt: row.checkOutAt,
      overtimeHours: row.overtimeHours,
      status: row.status,
    }));

    const filename = `attendance-${from}-to-${to}.csv`;

    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 12;
      let y = margin;
      pdf.setFontSize(14);
      pdf.text("Staff Attendance Report", margin, y);
      y += 6;
      pdf.setFontSize(10);
      pdf.text(`${from} to ${to}`, margin, y);
      y += 8;
      pdf.setFontSize(8);
      const headers = ["Date", "Staff", "Role", "Check-in", "Check-out", "Duration", "Status"];
      const colWidth = (297 - margin * 2) / headers.length;
      headers.forEach((header, index) => {
        pdf.text(header, margin + index * colWidth, y);
      });
      y += 5;
      for (const row of reportRows) {
        if (y > 190) {
          pdf.addPage();
          y = margin;
        }
        const session = deriveAttendanceSessionStatus(row);
        const statusLabel =
          session === "OPEN" ? "Open" : session === "COMPLETED" ? "Completed" : row.status ?? "";
        const cells = [
          utcDateToDayKey(new Date(row.date)),
          row.staffName,
          row.roleTitle,
          formatTimeLabel(row.checkInAt),
          formatTimeLabel(row.checkOutAt),
          formatWorkingDuration(row.checkInAt, row.checkOutAt),
          statusLabel,
        ];
        cells.forEach((cell, index) => {
          pdf.text(String(cell).slice(0, 28), margin + index * colWidth, y);
        });
        y += 5;
      }
      const buffer = Buffer.from(pdf.output("arraybuffer"));
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="attendance-${from}-to-${to}.pdf"`,
        },
      });
    }

    const csv = buildAttendanceReportCsv(reportRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
