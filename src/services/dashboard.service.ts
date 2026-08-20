import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateBudgetSummary } from "@/lib/finance/budget";
import {
  getAccessibleProjectIds,
  projectIdScope,
} from "@/lib/permissions/project-scope";

export async function getOrgDashboard(
  organizationId: string,
  userId: string,
  role: OrgRole
) {
  const accessibleProjectIds = await getAccessibleProjectIds(
    organizationId,
    userId,
    role
  );

  // Partner/viewer with no assignments: show zeros, not org totals.
  if (accessibleProjectIds !== null && accessibleProjectIds.length === 0) {
    const emptySummary = calculateBudgetSummary({
      contractAmountPaise: BigInt(0),
      budgetAmountPaise: BigInt(0),
      totalExpensesPaise: BigInt(0),
      vendorOutstandingPaise: BigInt(0),
      totalPaidPaise: BigInt(0),
    });
    return {
      activeProjects: 0,
      totalContract: BigInt(0),
      totalExpenses: BigInt(0),
      outstanding: BigInt(0),
      totalPaid: BigInt(0),
      vendorCount: 0,
      summary: emptySummary,
      categoryBreakdown: [],
      projects: [],
    };
  }

  const projectScope = projectIdScope(accessibleProjectIds);
  const projectWhere = {
    organizationId,
    deletedAt: null as null,
    status: { in: ["ACTIVE", "IN_PROGRESS"] as Array<"ACTIVE" | "IN_PROGRESS"> },
    ...(accessibleProjectIds !== null && { id: { in: accessibleProjectIds } }),
  };

  const [projects, expenseAgg, paymentAgg, vendorCount] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        contractAmountPaise: true,
        budgetAmountPaise: true,
        status: true,
      },
    }),
    prisma.expense.aggregate({
      where: { organizationId, deletedAt: null, ...projectScope },
      _sum: { amountPaise: true, outstandingPaise: true },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        paymentType: "VENDOR",
        ...projectScope,
      },
      _sum: { amountPaise: true },
    }),
    accessibleProjectIds === null
      ? prisma.vendor.count({ where: { organizationId, deletedAt: null } })
      : prisma.vendor.count({
          where: {
            organizationId,
            deletedAt: null,
            expenses: { some: { deletedAt: null, ...projectScope } },
          },
        }),
  ]);

  const totalContract = projects.reduce((s, p) => s + p.contractAmountPaise, BigInt(0));
  const totalExpenses = expenseAgg._sum.amountPaise ?? BigInt(0);
  const outstanding = expenseAgg._sum.outstandingPaise ?? BigInt(0);
  const totalPaid = paymentAgg._sum.amountPaise ?? BigInt(0);

  const summary = calculateBudgetSummary({
    contractAmountPaise: totalContract,
    budgetAmountPaise: totalContract,
    totalExpensesPaise: totalExpenses,
    vendorOutstandingPaise: outstanding,
    totalPaidPaise: totalPaid,
  });

  const expensesByCategory = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { organizationId, deletedAt: null, ...projectScope },
    _sum: { amountPaise: true },
  });

  const categories = await prisma.expenseCategory.findMany({
    where: { organizationId, id: { in: expensesByCategory.map((e) => e.categoryId) } },
  });

  const categoryBreakdown = expensesByCategory.map((e) => ({
    category: categories.find((c) => c.id === e.categoryId),
    amountPaise: e._sum.amountPaise ?? BigInt(0),
  }));

  return {
    activeProjects: projects.length,
    totalContract,
    totalExpenses,
    outstanding,
    totalPaid,
    vendorCount,
    summary,
    categoryBreakdown,
    projects,
  };
}
