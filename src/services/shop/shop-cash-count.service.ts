import type { CashCountType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireModule } from "@/lib/org/require-module";
import { resolveShopDashboardBounds } from "@/lib/shop/reports/dashboard-period";
import {
  normalizeDenominationCounts,
  totalPaiseFromDenominations,
  type CashDenominationCounts,
} from "@/lib/shop/shared/cash-denominations";
import { createAuditLog } from "@/services/shared/audit.service";
import { branchWhere, type BranchScope } from "@/lib/shop/branch/branch-context";

function parseCountDate(dateStr: string): Date {
  const { start } = resolveShopDashboardBounds("date", dateStr);
  return start;
}

export async function getCashMovementForDay(
  organizationId: string,
  dateStr: string,
  branchScope?: BranchScope
) {
  const { start, end } = resolveShopDashboardBounds("date", dateStr);
  const branchFilter = branchWhere(branchScope ?? "all");

  const [cashSales, cashExpenses] = await Promise.all([
    prisma.shopSale.aggregate({
      where: {
        organizationId,
        ...branchFilter,
        paymentMethod: "CASH",
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalPaise: true },
    }),
    prisma.shopExpense.aggregate({
      where: {
        organizationId,
        paymentMethod: "CASH",
        expenseDate: { gte: start, lte: end },
        deletedAt: null,
      },
      _sum: { amountPaise: true },
    }),
  ]);

  const cashSalesPaise = cashSales._sum.totalPaise ?? BigInt(0);
  const cashExpensesPaise = cashExpenses._sum.amountPaise ?? BigInt(0);

  return {
    cashSalesPaise,
    cashExpensesPaise,
    netCashMovementPaise: cashSalesPaise - cashExpensesPaise,
  };
}

export async function getShopCashCount(
  organizationId: string,
  dateStr: string,
  countType: CashCountType = "CLOSING",
  branchScope?: BranchScope
) {
  await requireModule(organizationId, "shop_expenses");
  const countDate = parseCountDate(dateStr);

  const [record, movement, previousClosing] = await Promise.all([
    prisma.shopCashCount.findUnique({
      where: {
        organizationId_countDate_countType: {
          organizationId,
          countDate,
          countType,
        },
      },
      include: { createdBy: { select: { name: true } } },
    }),
    getCashMovementForDay(organizationId, dateStr, branchScope),
    countType === "CLOSING"
      ? prisma.shopCashCount.findFirst({
          where: {
            organizationId,
            countType: "CLOSING",
            countDate: { lt: countDate },
          },
          orderBy: { countDate: "desc" },
          select: { totalPaise: true },
        })
      : Promise.resolve(null),
  ]);

  const suggestedOpening =
    countType === "CLOSING"
      ? (previousClosing?.totalPaise ?? BigInt(0))
      : BigInt(0);

  return {
    date: dateStr,
    countType,
    record,
    movement: {
      cashSalesPaise: movement.cashSalesPaise.toString(),
      cashExpensesPaise: movement.cashExpensesPaise.toString(),
      netCashMovementPaise: movement.netCashMovementPaise.toString(),
    },
    suggestedOpeningFloatPaise: suggestedOpening.toString(),
  };
}

export async function listShopCashCounts(
  organizationId: string,
  limit = 30
) {
  await requireModule(organizationId, "shop_expenses");
  return prisma.shopCashCount.findMany({
    where: { organizationId },
    orderBy: [{ countDate: "desc" }, { countType: "desc" }],
    take: limit,
    include: { createdBy: { select: { name: true } } },
  });
}

export async function upsertShopCashCount(input: {
  organizationId: string;
  userId: string;
  dateStr: string;
  countType: CashCountType;
  denominations: CashDenominationCounts;
  openingFloatPaise?: bigint;
  notes?: string | null;
}) {
  await requireModule(input.organizationId, "shop_expenses");

  const countDate = parseCountDate(input.dateStr);
  const denominations = normalizeDenominationCounts(input.denominations);
  const totalPaise = totalPaiseFromDenominations(denominations);
  const movement = await getCashMovementForDay(input.organizationId, input.dateStr);
  const openingFloatPaise = input.openingFloatPaise ?? BigInt(0);
  const expectedPaise =
    openingFloatPaise +
    movement.cashSalesPaise -
    movement.cashExpensesPaise;
  const variancePaise = totalPaise - expectedPaise;

  const existing = await prisma.shopCashCount.findUnique({
    where: {
      organizationId_countDate_countType: {
        organizationId: input.organizationId,
        countDate,
        countType: input.countType,
      },
    },
  });

  const data = {
    denominations,
    totalPaise,
    openingFloatPaise,
    expectedPaise,
    variancePaise,
    cashSalesPaise: movement.cashSalesPaise,
    cashExpensesPaise: movement.cashExpensesPaise,
    notes: input.notes?.trim() || null,
  };

  const record = existing
    ? await prisma.shopCashCount.update({
        where: { id: existing.id },
        data,
        include: { createdBy: { select: { name: true } } },
      })
    : await prisma.shopCashCount.create({
        data: {
          organizationId: input.organizationId,
          countDate,
          countType: input.countType,
          createdById: input.userId,
          ...data,
        },
        include: { createdBy: { select: { name: true } } },
      });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: existing ? "shop.cash_count.updated" : "shop.cash_count.created",
    entityType: "ShopCashCount",
    entityId: record.id,
    after: {
      countDate: input.dateStr,
      countType: input.countType,
      totalPaise: totalPaise.toString(),
      variancePaise: variancePaise.toString(),
    },
  });

  return record;
}
