import type { PaymentMethod, Prisma, RecurringOccurrenceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rupeesToPaise } from "@/lib/finance/money";
import { ensureShopExtendedSchema } from "@/lib/shop/ensure-shop-extended-schema";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";
import {
  daysUntil,
  formatDueIn,
  monthLabel,
  occurrencePeriodsFor,
  occurrenceUrgency,
  startOfUtcDay,
  type OccurrenceUrgency,
} from "@/lib/shop/recurring-schedule";
import {
  SHOP_ALERT,
  SHOP_RECURRING_EXPENSE_ALERT_HREF,
} from "@/lib/shop/shop-alerts";
import { createAuditLog } from "./audit.service";
import {
  resolveUnreadAlertNotifications,
  upsertUnreadAlertNotification,
} from "./notification.service";

const ruleInclude = {
  category: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ShopRecurringExpenseInclude;

async function ensureSchema() {
  await ensureShopExtendedSchema();
  await ensureCatalogSchema();
}

// ── Rules ───────────────────────────────────────────────────────────────────

export async function listRecurringExpenses(
  organizationId: string,
  options?: { includeInactive?: boolean }
) {
  await ensureSchema();
  return prisma.shopRecurringExpense.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
    include: ruleInclude,
    orderBy: [{ isActive: "desc" }, { dueDay: "asc" }, { name: "asc" }],
  });
}

export async function createRecurringExpense(input: {
  organizationId: string;
  userId: string;
  categoryId: string;
  name: string;
  monthlyAmountRupees: number;
  dueDay?: number;
  startDate: Date;
  endDate?: Date | null;
  reminderDaysBefore?: number;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}) {
  await ensureSchema();

  const name = input.name.trim();
  if (name.length < 2) throw new Error("Expense name is required");
  if (input.monthlyAmountRupees <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const category = await prisma.shopExpenseCategory.findFirst({
    where: { id: input.categoryId, organizationId: input.organizationId },
  });
  if (!category) throw new Error("Category not found");

  const recurring = await prisma.shopRecurringExpense.create({
    data: {
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      name,
      monthlyAmountPaise: rupeesToPaise(input.monthlyAmountRupees),
      dueDay: Math.min(31, Math.max(1, input.dueDay ?? 1)),
      startDate: startOfUtcDay(input.startDate),
      endDate: input.endDate ? startOfUtcDay(input.endDate) : null,
      reminderDaysBefore: Math.min(30, Math.max(0, input.reminderDaysBefore ?? 3)),
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    },
    include: ruleInclude,
  });

  await syncOccurrencesForRule(recurring.id);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.created",
    entityType: "ShopRecurringExpense",
    entityId: recurring.id,
    after: recurring,
  });

  return recurring;
}

export async function updateRecurringExpense(input: {
  organizationId: string;
  userId: string;
  recurringId: string;
  categoryId?: string;
  name?: string;
  monthlyAmountRupees?: number;
  dueDay?: number;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  reminderDaysBefore?: number;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}) {
  await ensureSchema();

  const existing = await prisma.shopRecurringExpense.findFirst({
    where: {
      id: input.recurringId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!existing) throw new Error("Recurring expense not found");

  const data: Prisma.ShopRecurringExpenseUpdateInput = {};
  if (input.categoryId !== undefined) {
    const category = await prisma.shopExpenseCategory.findFirst({
      where: { id: input.categoryId, organizationId: input.organizationId },
    });
    if (!category) throw new Error("Category not found");
    data.category = { connect: { id: input.categoryId } };
  }
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Expense name is required");
    data.name = name;
  }
  if (input.monthlyAmountRupees !== undefined) {
    if (input.monthlyAmountRupees <= 0) throw new Error("Amount must be greater than zero");
    data.monthlyAmountPaise = rupeesToPaise(input.monthlyAmountRupees);
  }
  if (input.dueDay !== undefined) {
    data.dueDay = Math.min(31, Math.max(1, input.dueDay));
  }
  if (input.startDate !== undefined) data.startDate = startOfUtcDay(input.startDate);
  if (input.endDate !== undefined) {
    data.endDate = input.endDate ? startOfUtcDay(input.endDate) : null;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.reminderDaysBefore !== undefined) {
    data.reminderDaysBefore = Math.min(30, Math.max(0, input.reminderDaysBefore));
  }
  if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  const updated = await prisma.shopRecurringExpense.update({
    where: { id: existing.id },
    data,
    include: ruleInclude,
  });

  // Amount and due-day edits apply to instalments that are still unpaid; months
  // already paid keep the amount that was actually paid.
  await syncOccurrencesForRule(updated.id, { repriceUnpaid: true });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.updated",
    entityType: "ShopRecurringExpense",
    entityId: updated.id,
    before: existing,
    after: updated,
  });

  return updated;
}

export async function deleteRecurringExpense(input: {
  organizationId: string;
  userId: string;
  recurringId: string;
}) {
  await ensureSchema();

  const existing = await prisma.shopRecurringExpense.findFirst({
    where: {
      id: input.recurringId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!existing) throw new Error("Recurring expense not found");

  const updated = await prisma.$transaction(async (tx) => {
    // Paid instalments are real payment history and must survive; only unpaid
    // future instalments disappear with the rule.
    await tx.shopRecurringExpenseOccurrence.deleteMany({
      where: {
        recurringId: existing.id,
        status: { in: ["UPCOMING", "PENDING"] },
      },
    });
    return tx.shopRecurringExpense.update({
      where: { id: existing.id },
      data: { isActive: false, deletedAt: new Date() },
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.deleted",
    entityType: "ShopRecurringExpense",
    entityId: updated.id,
    before: existing,
  });

  return updated;
}

// ── Occurrences ─────────────────────────────────────────────────────────────

/**
 * Materialises the months a rule covers, from its start through three months
 * ahead. Idempotent: existing instalments keep their status, so re-running never
 * resets a payment.
 */
export async function syncOccurrencesForRule(
  recurringId: string,
  options?: { repriceUnpaid?: boolean; today?: Date }
) {
  await ensureSchema();

  const rule = await prisma.shopRecurringExpense.findUnique({
    where: { id: recurringId },
  });
  if (!rule || rule.deletedAt) return { created: 0, updated: 0 };

  const today = startOfUtcDay(options?.today ?? new Date());
  const periods = occurrencePeriodsFor({
    startDate: rule.startDate,
    endDate: rule.endDate,
    dueDay: rule.dueDay,
    today,
  });

  const existing = await prisma.shopRecurringExpenseOccurrence.findMany({
    where: { recurringId: rule.id },
  });
  const existingByPeriod = new Map(
    existing.map((o) => [`${o.periodYear}-${o.periodMonth}`, o])
  );

  let created = 0;
  let updated = 0;

  for (const period of periods) {
    const key = `${period.periodYear}-${period.periodMonth}`;
    const current = existingByPeriod.get(key);
    // An instalment whose due date has arrived becomes actionable ("Pending").
    const status: RecurringOccurrenceStatus =
      period.dueDate <= today ? "PENDING" : "UPCOMING";

    if (!current) {
      if (!rule.isActive && period.dueDate > today) continue;
      await prisma.shopRecurringExpenseOccurrence.create({
        data: {
          organizationId: rule.organizationId,
          recurringId: rule.id,
          periodYear: period.periodYear,
          periodMonth: period.periodMonth,
          dueDate: period.dueDate,
          amountPaise: rule.monthlyAmountPaise,
          status,
        },
      });
      created++;
      continue;
    }

    if (current.status === "PAID" || current.status === "SKIPPED") continue;

    const patch: Prisma.ShopRecurringExpenseOccurrenceUpdateInput = {};
    if (current.status !== status) patch.status = status;
    if (current.dueDate.getTime() !== period.dueDate.getTime()) {
      patch.dueDate = period.dueDate;
    }
    if (options?.repriceUnpaid && current.amountPaise !== rule.monthlyAmountPaise) {
      patch.amountPaise = rule.monthlyAmountPaise;
    }
    if (Object.keys(patch).length > 0) {
      await prisma.shopRecurringExpenseOccurrence.update({
        where: { id: current.id },
        data: patch,
      });
      updated++;
    }
  }

  return { created, updated };
}

/** Brings every active rule in an org up to date. Cheap and safe to call often. */
export async function syncRecurringOccurrences(
  organizationId: string,
  options?: { today?: Date }
) {
  await ensureSchema();
  const rules = await prisma.shopRecurringExpense.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true },
  });
  let created = 0;
  let updated = 0;
  for (const rule of rules) {
    const result = await syncOccurrencesForRule(rule.id, { today: options?.today });
    created += result.created;
    updated += result.updated;
  }
  return { rules: rules.length, created, updated };
}

export type RecurringOccurrenceView = {
  id: string;
  recurringId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  dueDate: string;
  daysUntilDue: number;
  dueLabel: string;
  amountPaise: string;
  status: RecurringOccurrenceStatus;
  urgency: OccurrenceUrgency;
  paidAt: string | null;
  paidAmountPaise: string | null;
  paymentMethod: PaymentMethod | null;
  shopExpenseId: string | null;
  notes: string | null;
  reminderDaysBefore: number;
};

function toView(row: {
  id: string;
  recurringId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: Date;
  amountPaise: bigint;
  status: RecurringOccurrenceStatus;
  paidAt: Date | null;
  paidAmountPaise: bigint | null;
  paymentMethod: PaymentMethod | null;
  shopExpenseId: string | null;
  notes: string | null;
  recurring: {
    name: string;
    reminderDaysBefore: number;
    categoryId: string;
    category: { name: string };
  };
}, today: Date): RecurringOccurrenceView {
  const days = daysUntil(row.dueDate, today);
  return {
    id: row.id,
    recurringId: row.recurringId,
    name: row.recurring.name,
    categoryId: row.recurring.categoryId,
    categoryName: row.recurring.category.name,
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    periodLabel: monthLabel(row.periodYear, row.periodMonth),
    dueDate: row.dueDate.toISOString(),
    daysUntilDue: days,
    dueLabel: formatDueIn(days),
    amountPaise: row.amountPaise.toString(),
    status: row.status,
    urgency: occurrenceUrgency({
      status: row.status,
      dueDate: row.dueDate,
      today,
      reminderDaysBefore: row.recurring.reminderDaysBefore,
    }),
    paidAt: row.paidAt?.toISOString() ?? null,
    paidAmountPaise: row.paidAmountPaise?.toString() ?? null,
    paymentMethod: row.paymentMethod,
    shopExpenseId: row.shopExpenseId,
    notes: row.notes,
    reminderDaysBefore: row.recurring.reminderDaysBefore,
  };
}

/**
 * The recurring-expense dashboard: what is coming, what is late, what has been
 * paid, and the rules behind them.
 */
export async function getRecurringExpenseOverview(
  organizationId: string,
  options?: { today?: Date; historyLimit?: number }
) {
  await ensureSchema();
  await syncRecurringOccurrences(organizationId, { today: options?.today });

  const today = startOfUtcDay(options?.today ?? new Date());
  const include = {
    recurring: {
      select: {
        name: true,
        reminderDaysBefore: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    },
  } satisfies Prisma.ShopRecurringExpenseOccurrenceInclude;

  const [upcomingRows, pendingRows, paidRows, rules] = await Promise.all([
    prisma.shopRecurringExpenseOccurrence.findMany({
      where: {
        organizationId,
        status: "UPCOMING",
        recurring: { deletedAt: null },
      },
      include,
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    prisma.shopRecurringExpenseOccurrence.findMany({
      where: {
        organizationId,
        status: "PENDING",
        recurring: { deletedAt: null },
      },
      include,
      orderBy: { dueDate: "asc" },
      take: 100,
    }),
    prisma.shopRecurringExpenseOccurrence.findMany({
      where: {
        organizationId,
        status: { in: ["PAID", "SKIPPED"] },
      },
      include,
      orderBy: { dueDate: "desc" },
      take: options?.historyLimit ?? 60,
    }),
    listRecurringExpenses(organizationId, { includeInactive: true }),
  ]);

  const upcoming = upcomingRows.map((r) => toView(r, today));
  const pending = pendingRows.map((r) => toView(r, today));
  const history = paidRows.map((r) => toView(r, today));

  const sum = (rows: RecurringOccurrenceView[]) =>
    rows
      .reduce((total, row) => total + BigInt(row.amountPaise), BigInt(0))
      .toString();

  return {
    upcoming,
    pending,
    history,
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      categoryId: rule.categoryId,
      categoryName: rule.category.name,
      monthlyAmountPaise: rule.monthlyAmountPaise.toString(),
      dueDay: rule.dueDay,
      startDate: rule.startDate.toISOString(),
      endDate: rule.endDate?.toISOString() ?? null,
      isActive: rule.isActive,
      reminderDaysBefore: rule.reminderDaysBefore,
      paymentMethod: rule.paymentMethod,
      notes: rule.notes,
      nextDue:
        upcoming.find((o) => o.recurringId === rule.id) ??
        pending.find((o) => o.recurringId === rule.id) ??
        null,
    })),
    totals: {
      upcomingPaise: sum(upcoming),
      pendingPaise: sum(pending.filter((p) => p.status === "PENDING")),
      overdueCount: pending.filter((p) => p.urgency === "overdue").length,
      dueTodayCount: pending.filter((p) => p.urgency === "due-today").length,
      dueSoonCount: upcoming.filter((p) => p.urgency === "due-soon").length,
      monthlyCommitmentPaise: rules
        .filter((r) => r.isActive)
        .reduce((total, r) => total + r.monthlyAmountPaise, BigInt(0))
        .toString(),
    },
  };
}

/**
 * Marks ONE month's instalment as paid and posts a matching expense entry. The
 * rule itself stays active and keeps generating future months — marking March
 * paid never touches April.
 */
export async function markOccurrencePaid(input: {
  organizationId: string;
  userId: string;
  occurrenceId: string;
  paidAmountRupees?: number;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  notes?: string | null;
}) {
  await ensureSchema();

  const occurrence = await prisma.shopRecurringExpenseOccurrence.findFirst({
    where: { id: input.occurrenceId, organizationId: input.organizationId },
    include: { recurring: { include: { category: true } } },
  });
  if (!occurrence) throw new Error("Payment not found");
  if (occurrence.status === "PAID") {
    throw new Error(
      `${occurrence.recurring.name} for ${monthLabel(occurrence.periodYear, occurrence.periodMonth)} is already marked paid`
    );
  }

  const paidPaise =
    input.paidAmountRupees != null && input.paidAmountRupees > 0
      ? rupeesToPaise(input.paidAmountRupees)
      : occurrence.amountPaise;
  const paidAt = input.paidAt ?? new Date();
  const paymentMethod =
    input.paymentMethod ?? occurrence.recurring.paymentMethod ?? "CASH";

  const updated = await prisma.$transaction(async (tx) => {
    const expense = await tx.shopExpense.create({
      data: {
        organizationId: input.organizationId,
        categoryId: occurrence.recurring.categoryId,
        expenseDate: paidAt,
        title: `${occurrence.recurring.name} — ${monthLabel(occurrence.periodYear, occurrence.periodMonth)}`,
        description: `Recurring payment for ${monthLabel(occurrence.periodYear, occurrence.periodMonth)}`,
        amountPaise: paidPaise,
        paymentMethod,
        expenseType: "MONTHLY",
        notes: input.notes?.trim() || occurrence.recurring.notes || null,
        createdById: input.userId,
      },
    });

    return tx.shopRecurringExpenseOccurrence.update({
      where: { id: occurrence.id },
      data: {
        status: "PAID",
        paidAt,
        paidAmountPaise: paidPaise,
        paymentMethod,
        shopExpenseId: expense.id,
        notes: input.notes?.trim() || occurrence.notes,
      },
      include: {
        recurring: {
          select: {
            name: true,
            reminderDaysBefore: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
    });
  });

  // Future months keep flowing.
  await syncOccurrencesForRule(occurrence.recurringId);
  await syncRecurringExpenseReminders(input.organizationId);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.paid",
    entityType: "ShopRecurringExpenseOccurrence",
    entityId: updated.id,
    after: {
      rule: occurrence.recurring.name,
      period: monthLabel(occurrence.periodYear, occurrence.periodMonth),
      paidPaise: paidPaise.toString(),
      paymentMethod,
    },
  });

  return toView(updated, startOfUtcDay(new Date()));
}

/** Records that a month was deliberately not paid, without cancelling the rule. */
export async function skipOccurrence(input: {
  organizationId: string;
  userId: string;
  occurrenceId: string;
  notes?: string | null;
}) {
  await ensureSchema();

  const occurrence = await prisma.shopRecurringExpenseOccurrence.findFirst({
    where: { id: input.occurrenceId, organizationId: input.organizationId },
    include: { recurring: { select: { name: true } } },
  });
  if (!occurrence) throw new Error("Payment not found");
  if (occurrence.status === "PAID") {
    throw new Error("This month is already paid — reopen it first");
  }

  const updated = await prisma.shopRecurringExpenseOccurrence.update({
    where: { id: occurrence.id },
    data: { status: "SKIPPED", notes: input.notes?.trim() || occurrence.notes },
    include: {
      recurring: {
        select: {
          name: true,
          reminderDaysBefore: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  await syncRecurringExpenseReminders(input.organizationId);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.skipped",
    entityType: "ShopRecurringExpenseOccurrence",
    entityId: updated.id,
    after: { rule: occurrence.recurring.name },
  });

  return toView(updated, startOfUtcDay(new Date()));
}

/** Undoes a payment, removing the posted expense so the books stay clean. */
export async function reopenOccurrence(input: {
  organizationId: string;
  userId: string;
  occurrenceId: string;
}) {
  await ensureSchema();

  const occurrence = await prisma.shopRecurringExpenseOccurrence.findFirst({
    where: { id: input.occurrenceId, organizationId: input.organizationId },
  });
  if (!occurrence) throw new Error("Payment not found");

  const updated = await prisma.$transaction(async (tx) => {
    if (occurrence.shopExpenseId) {
      await tx.shopExpense.updateMany({
        where: {
          id: occurrence.shopExpenseId,
          organizationId: input.organizationId,
        },
        data: { deletedAt: new Date() },
      });
    }
    return tx.shopRecurringExpenseOccurrence.update({
      where: { id: occurrence.id },
      data: {
        status: "PENDING",
        paidAt: null,
        paidAmountPaise: null,
        shopExpenseId: null,
      },
      include: {
        recurring: {
          select: {
            name: true,
            reminderDaysBefore: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
    });
  });

  await syncOccurrencesForRule(occurrence.recurringId);
  await syncRecurringExpenseReminders(input.organizationId);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.recurring_expense.reopened",
    entityType: "ShopRecurringExpenseOccurrence",
    entityId: updated.id,
  });

  return toView(updated, startOfUtcDay(new Date()));
}

// ── Reminders ───────────────────────────────────────────────────────────────

/**
 * Raises an in-app notification for every instalment inside its reminder window
 * (and for anything already overdue), and clears it once paid. Reminder timing
 * is per-rule, so "remind me 7 days before rent" and "2 days before internet"
 * both work.
 */
export async function syncRecurringExpenseReminders(
  organizationId: string,
  options?: { today?: Date }
) {
  await ensureSchema();

  const today = startOfUtcDay(options?.today ?? new Date());
  const recipients = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE", role: { in: ["OWNER", "ACCOUNTANT"] } },
    select: { userId: true },
  });
  if (recipients.length === 0) return { notified: 0 };

  const open = await prisma.shopRecurringExpenseOccurrence.findMany({
    where: {
      organizationId,
      status: { in: ["UPCOMING", "PENDING"] },
      recurring: { deletedAt: null, isActive: true },
    },
    include: { recurring: { select: { name: true, reminderDaysBefore: true } } },
    orderBy: { dueDate: "asc" },
  });

  const due = open.filter((row) => {
    const days = daysUntil(row.dueDate, today);
    return days <= row.recurring.reminderDaysBefore;
  });

  const alertKey = `${SHOP_ALERT.RECURRING_EXPENSE_DUE}:open`;

  if (due.length === 0) {
    for (const recipient of recipients) {
      await resolveUnreadAlertNotifications({
        organizationId,
        userId: recipient.userId,
        type: SHOP_ALERT.RECURRING_EXPENSE_DUE,
        alertKey,
      });
    }
    return { notified: 0 };
  }

  const overdue = due.filter((r) => daysUntil(r.dueDate, today) < 0);
  const headline = due[0]!;
  const headlineDays = daysUntil(headline.dueDate, today);
  const amount = `₹${(Number(headline.amountPaise) / 100).toLocaleString("en-IN")}`;

  const title =
    overdue.length > 0
      ? `${overdue.length} recurring payment${overdue.length === 1 ? "" : "s"} overdue`
      : `${headline.recurring.name} ${formatDueIn(headlineDays)}`;

  const extra = due.length - 1;
  const body =
    `${headline.recurring.name} of ${amount} is ${formatDueIn(headlineDays)}.` +
    (extra > 0 ? ` ${extra} more payment${extra === 1 ? "" : "s"} coming up.` : "");

  for (const recipient of recipients) {
    await upsertUnreadAlertNotification({
      organizationId,
      userId: recipient.userId,
      type: SHOP_ALERT.RECURRING_EXPENSE_DUE,
      title,
      body,
      alertKey,
      href: SHOP_RECURRING_EXPENSE_ALERT_HREF,
      metadata: {
        href: SHOP_RECURRING_EXPENSE_ALERT_HREF,
        count: due.length,
        overdueCount: overdue.length,
      },
    });
  }

  await prisma.shopRecurringExpenseOccurrence.updateMany({
    where: { id: { in: due.map((d) => d.id) } },
    data: { remindedAt: new Date() },
  });

  return { notified: due.length };
}

/** Aggregate used by the dashboard and profit report. */
export async function getRecurringCommitmentSummary(organizationId: string) {
  await ensureSchema();
  const today = startOfUtcDay(new Date());

  const [activeAgg, pending] = await Promise.all([
    prisma.shopRecurringExpense.aggregate({
      where: { organizationId, isActive: true, deletedAt: null },
      _sum: { monthlyAmountPaise: true },
      _count: { _all: true },
    }),
    prisma.shopRecurringExpenseOccurrence.findMany({
      where: {
        organizationId,
        status: { in: ["UPCOMING", "PENDING"] },
        recurring: { deletedAt: null, isActive: true },
      },
      include: { recurring: { select: { name: true, reminderDaysBefore: true } } },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
  ]);

  let overdueCount = 0;
  let dueSoonCount = 0;
  let overduePaise = BigInt(0);
  for (const row of pending) {
    const days = daysUntil(row.dueDate, today);
    if (days < 0) {
      overdueCount++;
      overduePaise += row.amountPaise;
    } else if (days <= row.recurring.reminderDaysBefore) {
      dueSoonCount++;
    }
  }

  const next = pending[0];
  return {
    activeRuleCount: activeAgg._count._all,
    monthlyCommitmentPaise: (
      activeAgg._sum.monthlyAmountPaise ?? BigInt(0)
    ).toString(),
    overdueCount,
    overduePaise: overduePaise.toString(),
    dueSoonCount,
    nextPayment: next
      ? {
          name: next.recurring.name,
          amountPaise: next.amountPaise.toString(),
          dueDate: next.dueDate.toISOString(),
          dueLabel: formatDueIn(daysUntil(next.dueDate, today)),
        }
      : null,
  };
}
