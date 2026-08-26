import { getLocalDb } from "@/lib/local-db";
import { enqueueMutation, allocateLocalBillNumber, saveLocalSale } from "@/lib/sync/client";
import { runSync } from "@/lib/sync/client";
import type { SyncKind } from "@/lib/sync/kinds";

type SalePayload = Record<string, unknown> & {
  items: { name: string; qty: number; priceRupees: number; inventoryItemId?: string }[];
  staffId?: string | null;
  salesBoyName?: string | null;
};

export async function writeOffline(
  orgId: string,
  kind: SyncKind,
  payload: Record<string, unknown>,
  localRow?: { store: "sales" | "returns" | "expenses" | "purchases" | "credits" | "customers"; id: string; data: unknown }
) {
  const id = typeof payload.clientId === "string" ? payload.clientId : crypto.randomUUID();
  payload.clientId = id;
  if (localRow) {
    await getLocalDb().putOne(localRow.store, {
      id: localRow.id,
      orgId,
      data: localRow.data,
    });
  }
  await enqueueMutation(orgId, kind, payload, id);
  if (typeof navigator === "undefined" || navigator.onLine) {
    void runSync(orgId);
  }
  return id;
}

async function applyLocalStockDelta(
  orgId: string,
  inventoryItemId: string,
  delta: number
) {
  const db = getLocalDb();
  const existing = await db.getById<Record<string, unknown>>("inventory", inventoryItemId);
  if (!existing) return;
  const qty = Number(existing.quantity ?? 0) + delta;
  await db.putOne("inventory", {
    id: inventoryItemId,
    orgId,
    data: { ...existing, quantity: qty },
  });
}

export async function createSaleOffline(orgId: string, payload: SalePayload) {
  const id = crypto.randomUUID();
  let cashierCode: string | null = null;
  if (payload.staffId) {
    const staff = await getLocalDb().getById<{ cashierCode?: string | null }>(
      "staff",
      String(payload.staffId)
    );
    cashierCode = staff?.cashierCode ?? null;
  }
  const billNumber =
    (payload.billNumber as string | undefined)?.trim() ||
    (await allocateLocalBillNumber(orgId, cashierCode));

  const sale = {
    id,
    organizationId: orgId,
    billNumber,
    ...payload,
    createdAt: new Date().toISOString(),
    status: "COMPLETED",
    _pendingSync: true,
  };
  await saveLocalSale(orgId, sale);
  for (const item of payload.items ?? []) {
    if (item.inventoryItemId) {
      await applyLocalStockDelta(orgId, item.inventoryItemId, -Number(item.qty || 0));
    }
  }
  await writeOffline(orgId, "sale.create", { ...payload, billNumber, clientId: id }, {
    store: "sales",
    id,
    data: sale,
  });
  return {
    ...sale,
    itemsJson: payload.items ?? [],
    paymentMethod: (payload.paymentMethod as string | undefined) ?? "CASH",
  };
}

export async function createReturnOffline(
  orgId: string,
  payload: Record<string, unknown>
) {
  const id = crypto.randomUUID();
  const lines = (payload.lines as { inventoryItemId?: string; returnQty?: number; isExchangeIn?: boolean }[]) ?? [];
  for (const line of lines) {
    if (!line.inventoryItemId) continue;
    const qty = Number(line.returnQty || 0);
    await applyLocalStockDelta(
      orgId,
      line.inventoryItemId,
      line.isExchangeIn ? -qty : qty
    );
  }
  // Replacement goods in an exchange leave stock too — the wizard sends them
  // as a separate exchangeItems array, not merged into lines.
  const exchangeItems = (payload.exchangeItems as { inventoryItemId?: string; qty?: number }[]) ?? [];
  for (const item of exchangeItems) {
    if (!item.inventoryItemId) continue;
    const qty = Number(item.qty || 0);
    if (qty > 0) {
      await applyLocalStockDelta(orgId, item.inventoryItemId, -qty);
    }
  }
  return writeOffline(orgId, "return.create", { ...payload, clientId: id }, {
    store: "returns",
    id,
    data: { id, ...payload, createdAt: new Date().toISOString(), _pendingSync: true },
  });
}

export async function adjustStockOffline(
  orgId: string,
  inventoryItemId: string,
  quantity: number
) {
  const db = getLocalDb();
  const existing = await db.getById<Record<string, unknown>>("inventory", inventoryItemId);
  if (existing) {
    await db.putOne("inventory", {
      id: inventoryItemId,
      orgId,
      data: { ...existing, quantity },
    });
  }
  return writeOffline(orgId, "stock.adjust", { inventoryItemId, quantity });
}

export async function recordUdhaarPaymentOffline(
  orgId: string,
  payload: Record<string, unknown>
) {
  return writeOffline(orgId, "udhaar.payment", payload);
}

export async function createPurchaseOffline(
  orgId: string,
  payload: Record<string, unknown>
) {
  const id = crypto.randomUUID();
  return writeOffline(orgId, "purchase.create", { ...payload, clientId: id }, {
    store: "purchases",
    id,
    data: { id, ...payload, createdAt: new Date().toISOString(), _pendingSync: true },
  });
}

export async function createExpenseOffline(
  orgId: string,
  payload: Record<string, unknown>
) {
  const id = crypto.randomUUID();
  return writeOffline(orgId, "expense.create", { ...payload, clientId: id }, {
    store: "expenses",
    id,
    data: { id, ...payload, createdAt: new Date().toISOString(), _pendingSync: true },
  });
}

export async function upsertCustomerOffline(
  orgId: string,
  payload: Record<string, unknown>
) {
  const id = crypto.randomUUID();
  return writeOffline(orgId, "customer.upsert", { ...payload, clientId: id }, {
    store: "customers",
    id,
    data: { id, ...payload, createdAt: new Date().toISOString(), _pendingSync: true },
  });
}
