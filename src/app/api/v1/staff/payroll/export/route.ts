import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requirePermission,
} from "@/lib/api/context";
import { listPayroll } from "@/services/staff/attendance-payroll.service";
import {
  buildPayrollReportCsv,
  type PayrollReportRow,
} from "@/lib/staff/report-export";
import { yearMonthQuerySchema } from "@/lib/validation/staff";
import { paiseToRupees } from "@/lib/finance/money";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "payroll.manage");
    const { searchParams } = new URL(request.url);
    const { year, month } = yearMonthQuerySchema.parse({
      year: searchParams.get("year"),
      month: searchParams.get("month"),
    });
    const format = searchParams.get("format") ?? "csv";

    const rows = await listPayroll(ctx.organizationId, year, month);
    const reportRows: PayrollReportRow[] = rows.map((row) => ({
      staffName: row.staff.name,
      roleTitle: row.staff.roleTitle,
      presentDays: row.presentDays,
      halfDays: row.halfDays,
      absentDays: row.absentDays,
      paidLeaveDays: row.paidLeaveDays,
      workingDays: row.workingDays,
      overtimeHours: row.overtimeHours,
      basePaise: row.basePaise,
      commissionPaise: row.commissionPaise,
      advanceDeductionPaise: row.breakdown.advanceDeductionPaise,
      earningsPaise: row.breakdown.earningsPaise,
      deductionsPaise: row.breakdown.deductionsPaise,
      netPaise: row.finalAmountPaise,
      status: row.status,
    }));

    const label = `${year}-${String(month).padStart(2, "0")}`;

    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const margin = 10;
      let y = margin;
      pdf.setFontSize(14);
      pdf.text("Staff Payroll Report", margin, y);
      y += 6;
      pdf.setFontSize(10);
      pdf.text(label, margin, y);
      y += 8;
      pdf.setFontSize(7);
      const headers = [
        "Staff",
        "Role",
        "Present",
        "Absent",
        "OT",
        "Base",
        "Commission",
        "Net",
        "Status",
      ];
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
        const cells = [
          row.staffName,
          row.roleTitle,
          String(row.presentDays),
          String(row.absentDays),
          String(row.overtimeHours),
          String(paiseToRupees(BigInt(row.basePaise))),
          String(paiseToRupees(BigInt(row.commissionPaise))),
          String(paiseToRupees(BigInt(row.netPaise))),
          row.status ?? "",
        ];
        cells.forEach((cell, index) => {
          pdf.text(String(cell).slice(0, 22), margin + index * colWidth, y);
        });
        y += 5;
      }
      const buffer = Buffer.from(pdf.output("arraybuffer"));
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="payroll-${label}.pdf"`,
        },
      });
    }

    const csv = buildPayrollReportCsv(reportRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${label}.csv"`,
      },
    });
  });
}
