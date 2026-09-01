import { NextResponse } from "next/server";
import {
  getAuthContext,
  handleApi,
  apiSuccess,
  requirePermission,
} from "@/lib/api/context";
import {
  loadInvoiceDraftFromDb,
  saveInvoiceDraftToDb,
  clearInvoiceDraftFromDb,
} from "@/lib/shop/invoices/invoice-draft-db";
import type { InvoiceDraft } from "@/lib/shop/invoices/invoice-draft-storage";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const draft = await loadInvoiceDraftFromDb(ctx.organizationId);
    return apiSuccess({ draft });
  });
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    const draft = (await request.json()) as InvoiceDraft;
    await saveInvoiceDraftToDb(ctx.organizationId, draft);
    return apiSuccess({ saved: true });
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.sales");
    await clearInvoiceDraftFromDb(ctx.organizationId);
    return apiSuccess({ cleared: true });
  });
}
