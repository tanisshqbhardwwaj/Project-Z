import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import {
  computeInventoryAlerts,
  formatAlertListLines,
} from "@/lib/shop/inventory-alerts";
import { SHOP_ALERT, SHOP_INVENTORY_ALERT_HREF } from "@/lib/shop/shop-alerts";
import { getOrgModuleContext } from "@/lib/org/require-module";
import {
  resolveUnreadAlertNotifications,
  upsertUnreadAlertNotification,
} from "./notification.service";

const INVENTORY_HREF = SHOP_INVENTORY_ALERT_HREF;

async function getInventoryAlertRecipients(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { userId: true, role: true },
  });

  return members.filter((m) =>
    hasPermission(m.role as OrgRole, "shop.inventory.manage")
  );
}

async function syncAlertForRecipients(input: {
  organizationId: string;
  recipientIds: string[];
  type: string;
  alertKey: string;
  active: boolean;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  for (const userId of input.recipientIds) {
    if (input.active) {
      await upsertUnreadAlertNotification({
        organizationId: input.organizationId,
        userId,
        type: input.type,
        alertKey: input.alertKey,
        title: input.title,
        body: input.body,
        metadata: input.metadata,
        href: INVENTORY_HREF,
      });
    } else {
      await resolveUnreadAlertNotifications({
        organizationId: input.organizationId,
        userId,
        type: input.type,
        alertKey: input.alertKey,
      });
    }
  }
}

export async function syncShopInventoryAlertNotifications(organizationId: string) {
  const { enabledModules } = await getOrgModuleContext(organizationId);
  if (!enabledModules.shop_inventory) return;

  const [items, recipients] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        size: true,
        quantity: true,
        reorderLevel: true,
        barcode: true,
        expiryDate: true,
      },
    }),
    getInventoryAlertRecipients(organizationId),
  ]);

  if (recipients.length === 0) return;

  const recipientIds = recipients.map((r) => r.userId);
  const { lowStock, expiringSoon, noBarcode } = computeInventoryAlerts(items);

  if (lowStock.length > 0) {
    const lines = lowStock.map(
      (i) => `• ${i.label} — ${i.quantity} left (reorder at ${i.reorderLevel})`
    );
    const { text, extra } = formatAlertListLines(lines);
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.LOW_STOCK,
      alertKey: SHOP_ALERT.LOW_STOCK,
      active: true,
      title: `Low stock — ${lowStock.length} item${lowStock.length === 1 ? "" : "s"}`,
      body:
        text + (extra > 0 ? `\n• +${extra} more` : ""),
      metadata: {
        itemIds: lowStock.map((i) => i.id),
        count: lowStock.length,
      },
    });
  } else {
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.LOW_STOCK,
      alertKey: SHOP_ALERT.LOW_STOCK,
      active: false,
      title: "",
      body: "",
    });
  }

  if (expiringSoon.length > 0) {
    const lines = expiringSoon.map((i) => {
      const date = i.expiryDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return `• ${i.label} — expires ${date}`;
    });
    const { text, extra } = formatAlertListLines(lines);
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.EXPIRING,
      alertKey: SHOP_ALERT.EXPIRING,
      active: true,
      title: `Expiring soon — ${expiringSoon.length} item${expiringSoon.length === 1 ? "" : "s"}`,
      body:
        text + (extra > 0 ? `\n• +${extra} more` : ""),
      metadata: {
        itemIds: expiringSoon.map((i) => i.id),
        count: expiringSoon.length,
      },
    });
  } else {
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.EXPIRING,
      alertKey: SHOP_ALERT.EXPIRING,
      active: false,
      title: "",
      body: "",
    });
  }

  if (noBarcode.length > 0) {
    const lines = noBarcode.map((i) => `• ${i.label}`);
    const { text, extra } = formatAlertListLines(lines);
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.NO_BARCODE,
      alertKey: SHOP_ALERT.NO_BARCODE,
      active: true,
      title: `Missing barcodes — ${noBarcode.length} item${noBarcode.length === 1 ? "" : "s"}`,
      body:
        `${text}${extra > 0 ? `\n• +${extra} more` : ""}\nAdd barcodes so counter can scan them.`,
      metadata: {
        itemIds: noBarcode.map((i) => i.id),
        count: noBarcode.length,
      },
    });
  } else {
    await syncAlertForRecipients({
      organizationId,
      recipientIds,
      type: SHOP_ALERT.NO_BARCODE,
      alertKey: SHOP_ALERT.NO_BARCODE,
      active: false,
      title: "",
      body: "",
    });
  }
}

/**
 * Runs every shop alert sync the notification bell depends on. Kept here so
 * callers do not need to know which modules produce alerts, and so an expense
 * failure never hides inventory alerts.
 */
export async function syncShopAlertNotifications(organizationId: string) {
  const { enabledModules } = await getOrgModuleContext(organizationId);

  if (enabledModules.shop_inventory) {
    await syncShopInventoryAlertNotifications(organizationId).catch((err) => {
      console.error("[shop] inventory alert sync failed", err);
    });
  }

  if (enabledModules.shop_expenses) {
    const { syncRecurringExpenseReminders } = await import(
      "./shop-recurring-expense.service"
    );
    await syncRecurringExpenseReminders(organizationId).catch((err) => {
      console.error("[shop] recurring expense reminder sync failed", err);
    });
  }
}

export function scheduleShopInventoryAlertSync(organizationId: string) {
  debouncedSync(organizationId);
}

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedSync(organizationId: string) {
  const existing = syncTimers.get(organizationId);
  if (existing) clearTimeout(existing);
  syncTimers.set(
    organizationId,
    setTimeout(() => {
      syncTimers.delete(organizationId);
      void syncShopInventoryAlertNotifications(organizationId).catch((err) => {
        console.error("[shop] inventory alert sync failed", err);
      });
    }, 400)
  );
}
