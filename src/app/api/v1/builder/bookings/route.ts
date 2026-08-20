import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import { serializeBigInt } from "@/lib/db/prisma";
import {
  createUnitBooking,
  listUnitBookings,
  updateUnitBooking,
} from "@/services/builder.service";

const createBookingSchema = z.object({
  projectId: z.string().uuid(),
  unitId: z.string().uuid(),
  buyerName: z.string().min(2),
  buyerPhone: z.string().optional().nullable(),
  bookingRupees: z.number().positive(),
  notes: z.string().optional().nullable(),
});

const updateBookingSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(["BOOKED", "CANCELLED", "HANDED_OVER"]),
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) throw new Error("projectId is required");

    const bookings = await listUnitBookings(ctx.organizationId, projectId);
    return apiSuccess(serializeBigInt(bookings));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = createBookingSchema.parse(body);

    const booking = await createUnitBooking({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      ...data,
    });

    return NextResponse.json({ data: serializeBigInt(booking) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "project.view_all");

    const body = await request.json();
    const data = updateBookingSchema.parse(body);

    const booking = await updateUnitBooking({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ...data,
    });

    return apiSuccess(serializeBigInt(booking));
  });
}
