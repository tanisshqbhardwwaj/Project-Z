import type { BillingPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { planMeetsMinimum } from "@/lib/billing/report-entitlements";
import {
  parseShopInvoiceSettings,
  parseShopOrgSettings,
  resolvedPaymentReminderSettings,
} from "@/lib/org/shop-settings";
import { getOrgModuleContext } from "@/lib/org/require-module";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import {
  SHOP_ALERT,
  SHOP_UDHAAR_REMINDER_HREF,
} from "@/lib/shop/reports/shop-alerts";
import {
  resolveUnreadAlertNotifications,
  upsertUnreadAlertNotification,
} from "../shared/notification.service";
import { createAuditLog } from "../shared/audit.service";
import { buildUdhaarReminderMessage } from "@/lib/shop/customers/payment-reminder-message";

const REMINDER_PLAN: BillingPlan = "BUSINESS_PRO";

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export type ReminderCandidate = {
  id: string;
  customerName: string;
  phone: string | null;
  balancePaise: bigint;
  lastActivityAt: Date;
};

export async function orgEligibleForPaymentReminders(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, subscriptionStatus: true, settings: true },
  });
  if (!org) return false;
  if (!planMeetsMinimum(org.plan, REMINDER_PLAN)) return false;
  if (!["ACTIVE", "TRIAL", "PAST_DUE"].includes(org.subscriptionStatus)) {
    return false;
  }
  const { enabledModules } = await getOrgModuleContext(organizationId);
  if (!enabledModules.shop_udhaar) return false;
  const cfg = resolvedPaymentReminderSettings(org.settings);
  return cfg.enabled;
}

export async function listOrgsForPaymentReminderScan(): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    where: {
      plan: "BUSINESS_PRO",
      subscriptionStatus: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      businessType: { in: ["SHOPKEEPER", "SERVICE"] },
    },
    select: { id: true, settings: true },
  });

  const eligible: string[] = [];
  for (const org of orgs) {
    const cfg = resolvedPaymentReminderSettings(org.settings);
    if (!cfg.enabled) continue;
    const { enabledModules } = await getOrgModuleContext(org.id);
    if (enabledModules.shop_udhaar) eligible.push(org.id);
  }
  return eligible;
}

async function getReminderRecipients(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { userId: true, role: true },
  });
  return members.filter((m) =>
    hasPermission(m.role as OrgRole, "financial.view")
  );
}

export async function findUdhaarReminderCandidates(
  organizationId: string,
  now = new Date()
): Promise<ReminderCandidate[]> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) return [];

  const cfg = resolvedPaymentReminderSettings(org.settings);
  const minBalancePaise = BigInt(Math.round(cfg.minBalanceRupees * 100));

  const credits = await prisma.customerCredit.findMany({
    where: {
      organizationId,
      balancePaise: { gte: minBalancePaise },
    },
    select: {
      id: true,
      customerName: true,
      phone: true,
      balancePaise: true,
      lastReminderAt: true,
      updatedAt: true,
      entries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return credits
    .map((c) => {
      const lastActivityAt = c.entries[0]?.createdAt ?? c.updatedAt;
      return {
        id: c.id,
        customerName: c.customerName,
        phone: c.phone,
        balancePaise: c.balancePaise,
        lastActivityAt,
        lastReminderAt: c.lastReminderAt,
      };
    })
    .filter((c) => {
      if (daysBetween(now, c.lastActivityAt) < cfg.idleDaysBeforeReminder) {
        return false;
      }
      if (c.lastReminderAt) {
        if (daysBetween(now, c.lastReminderAt) < cfg.daysBetweenReminders) {
          return false;
        }
      }
      return true;
    })
    .map(({ lastReminderAt: _lr, ...rest }) => rest);
}

/**
 * Raises an in-app alert for owners/accountants listing customers due for
 * payment reminders. Does not auto-message customers — staff send via WhatsApp.
 */
export async function syncUdhaarPaymentReminders(
  organizationId: string,
  options?: { today?: Date }
) {
  const eligible = await orgEligibleForPaymentReminders(organizationId);
  if (!eligible) return { notified: 0, candidates: 0 };

  const today = options?.today ?? new Date();
  const recipients = await getReminderRecipients(organizationId);
  if (recipients.length === 0) return { notified: 0, candidates: 0 };

  const candidates = await findUdhaarReminderCandidates(organizationId, today);
  const alertKey = `${SHOP_ALERT.UDHAAR_PAYMENT_DUE}:open`;

  if (candidates.length === 0) {
    for (const recipient of recipients) {
      await resolveUnreadAlertNotifications({
        organizationId,
        userId: recipient.userId,
        type: SHOP_ALERT.UDHAAR_PAYMENT_DUE,
        alertKey,
      });
    }
    return { notified: 0, candidates: 0 };
  }

  const totalPaise = candidates.reduce((sum, c) => sum + c.balancePaise, BigInt(0));
  const top = candidates[0]!;
  const rupees = (Number(totalPaise) / 100).toLocaleString("en-IN");
  const topAmt = (Number(top.balancePaise) / 100).toLocaleString("en-IN");

  const title =
    candidates.length === 1
      ? `${top.customerName} owes ₹${topAmt}`
      : `${candidates.length} customers owe ₹${rupees}`;

  const body =
    candidates.length === 1
      ? `Send a payment reminder for ${top.customerName} (₹${topAmt} outstanding).`
      : `${top.customerName} (₹${topAmt}) and ${candidates.length - 1} more — open Udhaar to send WhatsApp reminders.`;

  for (const recipient of recipients) {
    await upsertUnreadAlertNotification({
      organizationId,
      userId: recipient.userId,
      type: SHOP_ALERT.UDHAAR_PAYMENT_DUE,
      alertKey,
      title,
      body,
      href: SHOP_UDHAAR_REMINDER_HREF,
      metadata: {
        count: candidates.length,
        totalPaise: totalPaise.toString(),
        creditIds: candidates.map((c) => c.id),
      },
    });
  }

  return { notified: candidates.length, candidates: candidates.length };
}

function resolveShopDisplayName(org: {
  name: string;
  settings: unknown;
}): string {
  const shop = parseShopOrgSettings(org.settings);
  const invoice = parseShopInvoiceSettings(org.settings);
  return (
    invoice.displayName?.trim() ||
    shop.brandName?.trim() ||
    org.name ||
    "Our store"
  );
}

export async function recordUdhaarReminderSent(input: {
  organizationId: string;
  userId: string;
  creditId: string;
}) {
  const credit = await prisma.customerCredit.findFirst({
    where: { id: input.creditId, organizationId: input.organizationId },
  });
  if (!credit) throw new Error("Customer credit account not found");
  if (credit.balancePaise <= BigInt(0)) {
    throw new Error("No outstanding balance to remind");
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true, settings: true },
  });
  if (!org) throw new Error("Organization not found");

  const invoice = parseShopInvoiceSettings(org.settings);
  const shopName = resolveShopDisplayName(org);

  const message = buildUdhaarReminderMessage({
    shopName,
    customerName: credit.customerName,
    balancePaise: credit.balancePaise,
    shopPhone: invoice.phone ?? null,
  });

  const updated = await prisma.customerCredit.update({
    where: { id: credit.id },
    data: { lastReminderAt: new Date() },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "shop.udhaar.reminder_sent",
    entityType: "CustomerCredit",
    entityId: credit.id,
    after: {
      balancePaise: credit.balancePaise.toString(),
      customerName: credit.customerName,
    },
  });

  return {
    credit: updated,
    message,
    phone: credit.phone,
    settings: resolvedPaymentReminderSettings(org.settings),
  };
}
