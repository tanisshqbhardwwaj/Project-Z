import { prisma } from "@/lib/db/prisma";
import { calculateBudgetSummary } from "@/lib/finance/budget";

export async function getOrgDashboard(organizationId: string) {
  const [projects, expenseAgg, paymentAgg, vendorCount] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, deletedAt: null, status: { in: ["ACTIVE", "IN_PROGRESS"] } },
      select: {
        id: true,
        name: true,
        contractAmountPaise: true,
        budgetAmountPaise: true,
        status: true,
      },
    }),
    prisma.expense.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { amountPaise: true, outstandingPaise: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, deletedAt: null, paymentType: "VENDOR" },
      _sum: { amountPaise: true },
    }),
    prisma.vendor.count({ where: { organizationId, deletedAt: null } }),
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
    where: { organizationId, deletedAt: null },
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
