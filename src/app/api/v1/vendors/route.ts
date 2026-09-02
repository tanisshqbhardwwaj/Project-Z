import { NextResponse } from "next/server";
import { getAuthContext, handleApi, requirePermission, apiSuccess } from "@/lib/api/context";
import { createVendor, listVendors, getVendorLedger } from "@/services/org/vendor.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    const vendors = await listVendors(ctx.organizationId);
    return apiSuccess(serializeBigInt(vendors));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "vendor.manage");

    const body = await request.json();
    const data = schema.parse(body);

    const vendor = await createVendor({
      organizationId: ctx.organizationId,
      ...data,
      email: data.email || undefined,
    });

    return NextResponse.json({ data: serializeBigInt(vendor) }, { status: 201 });
  });
}
