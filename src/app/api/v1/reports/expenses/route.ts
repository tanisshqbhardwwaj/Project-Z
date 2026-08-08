import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  requireProjectAccess,
} from "@/lib/api/context";
import { listExpenses } from "@/services/expense.service";
import { paiseToRupees } from "@/lib/finance/money";
import { prisma } from "@/lib/db/prisma";

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function paidByName(
  expense: Awaited<ReturnType<typeof listExpenses>>[number]
): string {
  return expense.allocations?.[0]?.payment?.paidBy?.name ?? "Unpaid";
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const projectId = searchParams.get("projectId") ?? undefined;

    if (projectId) {
      await requireProjectAccess(ctx, projectId);
    }

    const expenses = await listExpenses(ctx.organizationId, {
      projectId,
      limit: 1000,
    });

    if (format === "csv") {
      let projectHeading = "";
      let filename = "expenses.csv";

      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null },
          include: { workOrder: { select: { workOrderNumber: true } } },
        });
        const projectLabel = project?.workOrder?.workOrderNumber
          ? `${project.name} (WO #${project.workOrder.workOrderNumber})`
          : project?.name ?? "Work Order";
        projectHeading = `Project Name,${csvCell(projectLabel)}\n\n`;
        filename = `expenses-${project?.name?.replace(/[^a-zA-Z0-9-_]+/g, "-") ?? projectId}.csv`;

        const header = "Date,Paid By,Vendor,Amount (INR),Reason for Payment\n";
        const rows = expenses
          .map((e) =>
            [
              e.expenseDate.toISOString().split("T")[0],
              paidByName(e),
              e.vendor?.name ?? "",
              paiseToRupees(e.amountPaise),
              e.description ?? "",
            ]
              .map(csvCell)
              .join(",")
          )
          .join("\n");

        return new NextResponse(projectHeading + header + rows, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      const header = "Date,Project,Paid By,Vendor,Amount (INR),Reason for Payment\n";
      const rows = expenses
        .map((e) =>
          [
            e.expenseDate.toISOString().split("T")[0],
            e.project.name,
            paidByName(e),
            e.vendor?.name ?? "",
            paiseToRupees(e.amountPaise),
            e.description ?? "",
          ]
            .map(csvCell)
            .join(",")
        )
        .join("\n");

      return new NextResponse(header + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ data: expenses });
  });
}
